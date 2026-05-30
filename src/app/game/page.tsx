'use client';

import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Heart, ArrowLeft, ChevronRight, Loader2,
  AlertCircle, Sparkles, Volume2, ArrowRight
} from 'lucide-react';
import {
  getScenariosByRole, getRoleLabel, getPartnerLabel,
  type Scenario,
} from '@/lib/scenarios';
import { getVoiceById, type Voice } from '@/lib/voices';

/* ────── Types ────── */
interface Option {
  label: string;
  text: string;
  score: number;
}

interface AiReaction {
  high: string;
  medium: string;
  low: string;
}

interface Question {
  id: number;
  situation: string;
  question: string;
  options: Option[];
  aiReaction: AiReaction;
}

type GamePhase = 'select-scenario' | 'loading' | 'playing' | 'finished';

/* Chat message type for the conversation flow */
interface ChatMessage {
  id: string;
  type: 'partner-msg' | 'my-msg' | 'system' | 'options';
  content: string;
  score?: number;
  questionIndex?: number;
  options?: Option[];
  questionId?: number;
}

/* ────── Emoji & mood helpers ────── */
function getEmoji(score: number, total: number): string {
  const ratio = total === 0 ? 0 : score / total;
  if (ratio >= 0.9) return '🥰';
  if (ratio >= 0.7) return '😄';
  if (ratio >= 0.5) return '😊';
  if (ratio >= 0.3) return '😐';
  return '😠';
}

function getBgGradient(score: number, total: number): string {
  const ratio = total === 0 ? 0 : score / total;
  if (ratio >= 0.7) return 'from-[#FFF5E6] to-[#FFE8CC]';
  if (ratio >= 0.5) return 'from-[#FFF9F1] to-[#F3E8D8]';
  if (ratio >= 0.3) return 'from-[#F5F0EB] to-[#E8E0D8]';
  return 'from-[#E8E4E0] to-[#D8D2CC]';
}

function getAiReactionText(reaction: AiReaction, optionScore: number): string {
  if (optionScore >= 8) return reaction.high;
  if (optionScore >= 4) return reaction.medium;
  return reaction.low;
}

/* ────── Component ────── */
function GamePageContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get('role') ?? 'boyfriend';
  const voiceId = searchParams.get('voice') ?? '';

  const [phase, setPhase] = useState<GamePhase>('select-scenario');
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [isAnswering, setIsAnswering] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [lowScoreStreak, setLowScoreStreak] = useState(0);
  const [showLowScoreHint, setShowLowScoreHint] = useState(false);
  const [questionResults, setQuestionResults] = useState<
    Array<{ id: number; selectedScore: number; selectedLabel: string }>
  >([]);
  const [loadError, setLoadError] = useState('');
  const [nextBatchLoading, setNextBatchLoading] = useState(false);
  const waitingForQuestionIdx = useRef<number | null>(null);

  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [playingReaction, setPlayingReaction] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsCache = useRef<Map<string, string>>(new Map()); // text -> audioUri cache
  const audioObjects = useRef<Map<string, HTMLAudioElement>>(new Map()); // text -> pre-buffered Audio
  const voiceData = voiceId ? getVoiceById(voiceId) : null;
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scenarios = getScenariosByRole(role);
  const roleLabel = getRoleLabel(role);
  const partnerLabel = getPartnerLabel(role);
  const partnerEmoji = role === 'boyfriend' ? '👧' : '👦';

  /* ── Auto-scroll to bottom ── */
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  /* ── TTS: preload audio for reaction text, returns a promise ── */
  const preloadTTS = useCallback(async (text: string): Promise<void> => {
    if (!voiceData) return;
    // Already cached
    if (audioObjects.current.has(text)) return;

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speaker: voiceData.speaker }),
      });
      const data = res.ok ? await res.json() : null;
      if (data?.audioUri) {
        // Create and buffer the Audio object so it's ready to play instantly
        const audio = new Audio(data.audioUri);
        audio.preload = 'auto';
        // Wait until enough data is buffered to play without stuttering
        await new Promise<void>((resolve, reject) => {
          const onCanPlay = () => { cleanup(); resolve(); };
          const onError = () => { cleanup(); resolve(); }; // don't reject, just skip
          const cleanup = () => {
            audio.removeEventListener('canplaythrough', onCanPlay);
            audio.removeEventListener('error', onError);
          };
          audio.addEventListener('canplaythrough', onCanPlay);
          audio.addEventListener('error', onError);
          audio.load();
          // 3s max wait for buffering
          setTimeout(() => { cleanup(); resolve(); }, 3000);
        });
        audioObjects.current.set(text, audio);
        ttsCache.current.set(text, data.audioUri);
      }
    } catch {
      /* preload failure is silent */
    }
  }, [voiceData]);

  /* ── TTS: play audio for reaction text (instant if cached) ── */
  const playTTS = useCallback(async (text: string) => {
    if (!voiceData) return;

    // Toggle off if currently playing this text
    if (isSpeaking && playingReaction === text) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsSpeaking(false);
      setPlayingReaction(null);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      setIsSpeaking(true);
      setPlayingReaction(text);

      // Use pre-buffered Audio object for instant playback
      const prebufferedAudio = audioObjects.current.get(text);
      const cachedUri = ttsCache.current.get(text);

      if (prebufferedAudio) {
        // Instant play from pre-buffered audio — no network delay
        prebufferedAudio.currentTime = 0;
        audioRef.current = prebufferedAudio;
        prebufferedAudio.onended = () => {
          setIsSpeaking(false);
          setPlayingReaction(null);
          audioRef.current = null;
        };
        prebufferedAudio.onerror = () => {
          setIsSpeaking(false);
          setPlayingReaction(null);
          audioRef.current = null;
        };
        await prebufferedAudio.play();
      } else if (cachedUri) {
        // Fallback: play from URI (pre-buffer missed but URI cached)
        const audio = new Audio(cachedUri);
        audioRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          setPlayingReaction(null);
          audioRef.current = null;
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          setPlayingReaction(null);
          audioRef.current = null;
        };
        await audio.play();
      } else {
        // Fallback: fetch on demand (rare case)
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, speaker: voiceData.speaker }),
        });

        if (!res.ok) {
          setIsSpeaking(false);
          setPlayingReaction(null);
          return;
        }

        const data = await res.json();
        if (!data.audioUri) {
          setIsSpeaking(false);
          setPlayingReaction(null);
          return;
        }

        // Cache for next time
        const audio = new Audio(data.audioUri);
        ttsCache.current.set(text, data.audioUri);
        audioObjects.current.set(text, audio);

        audioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          setPlayingReaction(null);
          audioRef.current = null;
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          setPlayingReaction(null);
          audioRef.current = null;
        };

        await audio.play();
      }
    } catch {
      setIsSpeaking(false);
      setPlayingReaction(null);
    }
  }, [voiceData, isSpeaking, playingReaction]);

  /* ── Stop TTS ── */
  const stopTTS = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setPlayingReaction(null);
  }, []);

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  /* ── Add question to chat ── */
  const addQuestionToChat = useCallback((q: Question, qIndex: number) => {
    const newMsgs: ChatMessage[] = [
      {
        id: `q${qIndex}-situation`,
        type: 'partner-msg',
        content: q.situation,
        questionIndex: qIndex,
      },
      {
        id: `q${qIndex}-options`,
        type: 'options',
        content: q.question,
        options: q.options,
        questionIndex: qIndex,
        questionId: q.id,
      },
    ];
    setChatMessages(prev => [...prev, ...newMsgs]);
    scrollToBottom();
  }, [scrollToBottom]);

  /* ── Load questions from AI (4-batch progressive loading) ── */
  const loadQuestions = useCallback(async (scenario: Scenario) => {
    stopTTS();
    setPhase('loading');
    setLoadError('');
    setQuestions([]);
    setChatMessages([]);
    setNextBatchLoading(false);
    waitingForQuestionIdx.current = null;
    ttsCache.current.clear(); // Clear TTS cache for new scenario
    audioObjects.current.clear(); // Clear pre-buffered audio objects
    const scenarioText = scenario.title + ' - ' + scenario.description;
    const maxRetries = 2;

    // === Batch 1: Only 1 question (fastest entry) ===
    let firstBatchQuestions: Question[] | null = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const res = await fetch('/api/generate-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, scenario: scenarioText, batch: 'first' }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          if (attempt < maxRetries - 1) continue;
          const data = await res.json().catch(() => ({ error: '请求失败' }));
          throw new Error(data.error || '请求失败');
        }
        const data = await res.json();
        if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
          if (attempt < maxRetries - 1) continue;
          throw new Error('AI生成题目格式异常，请重试');
        }
        firstBatchQuestions = data.questions;
        break;
      } catch (err) {
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        setPhase('select-scenario');
        setLoadError(err instanceof Error ? err.message : 'AI生成题目失败，请稍后重试');
        return;
      }
    }

    if (!firstBatchQuestions) {
      setPhase('select-scenario');
      setLoadError('AI生成题目失败，请稍后重试');
      return;
    }

    setQuestions(firstBatchQuestions);
    setCurrentQuestionIndex(0);
    setTotalScore(0);
    setIsAnswering(false);
    setLowScoreStreak(0);
    setShowLowScoreHint(false);
    setQuestionResults([]);
    setPhase('playing');

    // Add first question to chat
    if (firstBatchQuestions[0]) {
      addQuestionToChat(firstBatchQuestions[0], 0);
    }

    // === Load batch 2, 3, 4 in parallel (background) ===
    setNextBatchLoading(true);

    const fetchBatch = async (batchName: string, retries = 2): Promise<Question[]> => {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000);
          const res = await fetch('/api/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, scenario: scenarioText, batch: batchName }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (!res.ok) {
            if (attempt < retries - 1) continue;
            return [];
          }
          const data = await res.json().catch(() => null);
          if (data?.questions && Array.isArray(data.questions) && data.questions.length > 0) {
            return data.questions;
          }
          if (attempt < retries - 1) continue;
          return [];
        } catch {
          if (attempt < retries - 1) {
            await new Promise(r => setTimeout(r, 500));
            continue;
          }
          return [];
        }
      }
      return [];
    };

    // Load remaining batches sequentially — each batch is added immediately
    // so the user can keep playing without waiting for all batches to finish
    const loadBatchSequentially = async () => {
      const batches = ['second', 'third', 'fourth'] as const;
      for (const batchName of batches) {
        try {
          const batchQuestions = await fetchBatch(batchName);
          if (batchQuestions.length > 0) {
            setQuestions(prev => [...prev, ...batchQuestions]);
          }
        } catch {
          // Continue loading next batch even if one fails
        }
      }
      setNextBatchLoading(false);
    };
    loadBatchSequentially();
  }, [role, addQuestionToChat, stopTTS]);

  /* ── Handle scenario selection ── */
  const handleScenarioSelect = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    loadQuestions(scenario);
  };

  /* ── Retry loading ── */
  const handleRetry = () => {
    if (selectedScenario) {
      loadQuestions(selectedScenario);
    }
  };

  /* ── Handle option selection ── */
  const handleOptionSelect = useCallback((option: Option, questionIndex: number) => {
    if (isAnswering) return;
    setIsAnswering(true);

    const newScore = totalScore + option.score;
    setTotalScore(newScore);

    const currentQ = questions[questionIndex];
    if (!currentQ) return;

    const reactionText = getAiReactionText(currentQ.aiReaction, option.score);

    // Track low score streak
    if (option.score <= 2) {
      const newStreak = lowScoreStreak + 1;
      setLowScoreStreak(newStreak);
      if (newStreak >= 2) {
        setShowLowScoreHint(true);
      }
    } else {
      setLowScoreStreak(0);
      setShowLowScoreHint(false);
    }

    setQuestionResults((prev) => [
      ...prev,
      { id: currentQ.id, selectedScore: option.score, selectedLabel: option.label },
    ]);

    // Immediately replace options with my answer bubble
    setChatMessages(prev => {
      const updated = prev.map(msg => {
        if (msg.id === `q${questionIndex}-options`) {
          return { ...msg, type: 'system' as const, content: '', options: undefined };
        }
        return msg;
      });

      const myMsg: ChatMessage = {
        id: `q${questionIndex}-my-answer`,
        type: 'my-msg',
        content: option.text,
        score: typeof option.score === 'number' && !isNaN(option.score) ? option.score : 0,
        questionIndex,
      };

      return [...updated, myMsg];
    });

    scrollToBottom();

    // Show partner reaction after a short natural delay (don't wait for TTS)
    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        {
          id: `q${questionIndex}-reaction`,
          type: 'partner-msg' as const,
          content: reactionText,
          questionIndex,
        },
      ]);
      scrollToBottom();

      // Preload TTS in background (don't block UI)
      if (voiceData) {
        preloadTTS(reactionText);
      }

      // After a delay, show next question or finish
      setTimeout(() => {
        const totalQuestions = 10;
        if (questionIndex < totalQuestions - 1) {
          const nextIdx = questionIndex + 1;
          setCurrentQuestionIndex(nextIdx);

          if (nextIdx < questions.length) {
            setIsAnswering(false);

            // Low score hint
            if (option.score <= 2 && lowScoreStreak + 1 >= 2) {
              setChatMessages(prev => [...prev, {
                id: `q${nextIdx}-hint`,
                type: 'system',
                content: 'hint',
                questionIndex: nextIdx,
              }]);
            }

            // Add next question
            addQuestionToChat(questions[nextIdx], nextIdx);
          } else {
            // Next question not loaded yet, show waiting indicator (keep isAnswering=true)
            waitingForQuestionIdx.current = nextIdx;
            setChatMessages(prev => [...prev, {
              id: `q${nextIdx}-waiting`,
              type: 'system',
              content: 'waiting',
              questionIndex: nextIdx,
            }]);
            scrollToBottom();
          }
        } else {
          setPhase('finished');
        }
      }, 2500);
    }, 1500); // Short natural delay before showing partner reaction

  }, [isAnswering, totalScore, questions, lowScoreStreak, addQuestionToChat, scrollToBottom, preloadTTS, voiceData]);

  /* ── When more questions load, show the next question if we were waiting ── */
  useEffect(() => {
    if (phase !== 'playing') return;
    const qIdx = waitingForQuestionIdx.current;
    if (qIdx === null) return;
    if (qIdx < questions.length) {
      const q = questions[qIdx];
      waitingForQuestionIdx.current = null; // Clear waiting state
      // Remove waiting message and add real question
      setChatMessages(prev => {
        const filtered = prev.filter(m => m.id !== `q${qIdx}-waiting`);
        const newMsgs: ChatMessage[] = [
          {
            id: `q${qIdx}-situation`,
            type: 'partner-msg',
            content: q.situation,
            questionIndex: qIdx,
          },
          {
            id: `q${qIdx}-options`,
            type: 'options',
            content: q.question,
            options: q.options,
            questionIndex: qIdx,
            questionId: q.id,
          },
        ];
        return [...filtered, ...newMsgs];
      });
      setIsAnswering(false);
      scrollToBottom();
    }
  }, [questions.length, phase, questions, scrollToBottom]);

  /* ── Navigate to results ── */
  const goToResults = () => {
    const params = new URLSearchParams({
      role,
      scenario: selectedScenario?.title ?? '',
      score: totalScore.toString(),
      results: JSON.stringify(questionResults),
    });
    if (voiceId) params.set('voice', voiceId);
    window.location.href = `/result?${params.toString()}`;
  };

  /* ── Get feedback color ── */
  const getFeedbackColor = (score: number): string => {
    if (score >= 8) return 'text-green-600';
    if (score >= 4) return 'text-amber-600';
    return 'text-red-500';
  };

  const getScoreBadgeStyle = (score: number): string => {
    if (score >= 8) return 'bg-green-100 text-green-700';
    if (score >= 4) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-600';
  };

  /* ────── Render: Scenario Selection ────── */
  if (phase === 'select-scenario') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-card sticky top-0 z-40 h-14 flex items-center justify-between px-6 shadow-card">
          <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Heart className="text-primary w-5 h-5 fill-primary" />
              <span className="font-bold text-lg text-foreground">哄哄模拟器</span>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              重新选择角色
            </Link>
          </div>
        </header>

        <main className="max-w-4xl mx-auto flex-1 p-6">
          <div className="bg-primary-container/50 rounded-xl p-4 mb-6 flex items-center justify-between">
            <span className="text-sm text-foreground">
              你选择了：<strong className="text-primary">{roleLabel}</strong> — 哄{partnerLabel}开心
            </span>
            {voiceData && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5" />
                {voiceData.icon} {voiceData.name}
              </span>
            )}
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">选择一个场景</h1>
            <p className="text-sm text-muted-foreground">以下哪些场景让你感到头疼？</p>
          </div>

          {loadError && (
            <div className="bg-destructive/10 text-destructive rounded-xl p-4 mb-6 flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="text-sm flex-1">{loadError}</span>
              <button
                onClick={handleRetry}
                className="text-sm font-medium underline hover:no-underline shrink-0"
              >
                重试
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map((scenario, idx) => (
              <button
                key={scenario.id}
                onClick={() => handleScenarioSelect(scenario)}
                className="group bg-card rounded-xl p-5 shadow-card hover:shadow-float
                  transition-all duration-300 hover:-translate-y-0.5 cursor-pointer text-left
                  border-2 border-transparent hover:border-primary/30"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl font-bold text-primary/30">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm mb-1.5 group-hover:text-primary transition-colors">
                      {scenario.title}
                    </h3>
                    <p className="text-sm text-foreground/70 line-clamp-3 leading-relaxed">
                      {scenario.description}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  /* ────── Render: Loading ────── */
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 shadow-md">
          <button onClick={() => { stopTTS(); setPhase('select-scenario'); }} className="p-1 -ml-1 hover:opacity-80">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center text-sm">
            {partnerEmoji}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-sm">{partnerLabel}</span>
            <span className="text-[10px] text-primary-foreground/60">正在输入...</span>
          </div>
        </div>
        {/* Chat area with typing animation */}
        <div className="flex-1 px-4 py-6 flex flex-col gap-3 overflow-hidden">
          {/* Partner typing bubble */}
          <div className="flex gap-2 items-end max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">
              {partnerEmoji}
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/60 text-center mt-4">
            {partnerLabel}正在酝酿情绪，马上就来...
          </p>
        </div>
      </div>
    );
  }

  /* ────── Render: Finished ────── */
  if (phase === 'finished') {
    if (questions.length < 10 && nextBatchLoading) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
          <div className="text-7xl">{getEmoji(totalScore, questions.length * 10)}</div>
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm">正在生成最后几道题...</p>
        </div>
      );
    }
    const maxScore = questions.length > 0 ? questions.length * 10 : 100;
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-7xl">{getEmoji(totalScore, maxScore)}</div>
        <h2 className="text-2xl font-bold text-foreground">答题完成!</h2>
        <p className="text-lg text-muted-foreground">
          你的得分：<span className="text-primary font-bold">{totalScore}</span> / {maxScore}
        </p>
        <button
          onClick={goToResults}
          className="bg-primary text-primary-foreground px-8 py-3 rounded-xl
            font-semibold shadow-float hover:opacity-90 transition-all duration-300"
        >
          查看局后小结
        </button>
      </div>
    );
  }

  /* ────── Render: Playing (WeChat-style continuous chat) ────── */
  const maxScore = 100;

  return (
    <div className={`min-h-screen bg-gradient-to-b ${getBgGradient(totalScore, maxScore)} transition-all duration-800 flex flex-col`}>
      {/* Top bar */}
      <div className="bg-card/80 backdrop-blur-sm sticky top-0 z-40 px-4 py-3 shadow-card">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-base">
              {getEmoji(totalScore, maxScore)}
            </div>
            <span className="font-semibold text-foreground">{selectedScenario?.title ?? partnerLabel}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">第{Math.max(1, currentQuestionIndex + 1)}/10题</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">分数</span>
              <span className="text-base font-bold text-primary">{totalScore}</span>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mt-2">
          <div className="h-1 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(Math.max(1, currentQuestionIndex + 1) / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Chat area - scrollable */}
      <main
        ref={chatContainerRef}
        className="max-w-2xl mx-auto flex-1 p-4 pb-6 overflow-y-auto"
      >
        <div className="flex flex-col gap-3">
          {chatMessages.map((msg) => {
            /* ── Partner message (left side) ── */
            if (msg.type === 'partner-msg') {
              return (
                <div key={msg.id} className="flex gap-2.5 items-start animate-in fade-in slide-in-from-left-1 duration-300">
                  <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-base">
                    {getEmoji(totalScore, maxScore)}
                  </div>
                  <div className="flex flex-col gap-0.5 max-w-[78%]">
                    <span className="text-[11px] text-muted-foreground">{partnerLabel}</span>
                    <div className="bg-card rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-card flex items-center gap-2">
                      <p className="text-[15px] text-foreground leading-relaxed">{msg.content}</p>
                      {voiceData && (
                        <button
                          onClick={() => playTTS(msg.content)}
                          className={`shrink-0 p-1.5 rounded-full transition-all ${
                            isSpeaking && playingReaction === msg.content
                              ? 'bg-primary text-primary-foreground shadow-md scale-110'
                              : 'bg-primary/10 text-primary hover:bg-primary/20'
                          }`}
                        >
                          {isSpeaking && playingReaction === msg.content ? (
                            <div className="flex gap-0.5 items-center w-3.5 h-3.5 justify-center">
                              <span className="w-[2px] h-2.5 bg-primary-foreground rounded-full animate-pulse" />
                              <span className="w-[2px] h-3.5 bg-primary-foreground rounded-full animate-pulse [animation-delay:0.15s]" />
                              <span className="w-[2px] h-2.5 bg-primary-foreground rounded-full animate-pulse [animation-delay:0.3s]" />
                            </div>
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            /* ── My message (right side) ── */
            if (msg.type === 'my-msg') {
              return (
                <div key={msg.id} className="flex gap-2.5 items-start justify-end animate-in fade-in slide-in-from-right-1 duration-300">
                  <div className="flex flex-col gap-0.5 items-end max-w-[78%]">
                    <div className="flex items-center gap-1.5">
                      {msg.score !== undefined && !isNaN(msg.score) && (
                        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${getScoreBadgeStyle(msg.score)}`}>
                          +{msg.score}
                        </span>
                      )}
                    </div>
                    <div className="bg-primary/15 rounded-2xl rounded-tr-sm px-4 py-2.5">
                      <p className="text-[15px] text-foreground leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-primary/80 flex items-center justify-center shrink-0">
                    <Heart className="w-4 h-4 text-primary-foreground fill-primary-foreground" />
                  </div>
                </div>
              );
            }

            /* ── Options (selectable choices) ── */
            if (msg.type === 'options' && msg.options && msg.questionIndex === currentQuestionIndex) {
              return (
                <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="text-center mb-2">
                    <span className="text-[13px] font-semibold text-foreground/80">{msg.content}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {msg.options.map((option) => (
                      <button
                        key={option.label}
                        onClick={() => handleOptionSelect(option, msg.questionIndex!)}
                        disabled={isAnswering}
                        className="bg-card/90 rounded-xl px-4 py-3 shadow-card transition-all duration-200
                          cursor-pointer text-left hover:shadow-float hover:-translate-y-0.5
                          hover:border-primary/30 border-2 border-transparent
                          disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg flex items-center justify-center
                            text-xs font-bold shrink-0 bg-primary/10 text-primary">
                            {option.label}
                          </span>
                          <span className="text-[14px] text-foreground leading-relaxed">{option.text}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            }

            /* ── System messages (hints, waiting) ── */
            if (msg.type === 'system') {
              if (msg.content === 'hint') {
                return (
                  <div key={msg.id} className="flex justify-center animate-in fade-in duration-300">
                    <div className="bg-warning/10 text-warning rounded-xl px-4 py-2.5 flex items-center gap-2 max-w-[85%]">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs">试试换个方式回应，TA可能需要的不是道理而是关心</span>
                    </div>
                  </div>
                );
              }
              if (msg.content === 'waiting') {
                return (
                  <div key={msg.id} className="flex justify-center gap-2 py-4 animate-in fade-in duration-300">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground">对方正在输入...</span>
                  </div>
                );
              }
              // Empty placeholder (replaced options)
              return null;
            }

            return null;
          })}
        </div>
        <div ref={chatEndRef} />
      </main>

      {/* Mood bar at bottom */}
      <div className="max-w-2xl mx-auto w-full px-4 pb-4">
        <div className="h-1.5 rounded-full overflow-hidden"
          style={{ background: 'linear-gradient(to right, #D94F4F, #E8A84C, #7E9F7A)' }}>
          <div className="h-full bg-transparent relative">
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-foreground rounded-full
                shadow-float transition-all duration-500"
              style={{ left: `calc(${maxScore > 0 ? (totalScore / maxScore) * 100 : 0}% - 5px)` }}
            />
          </div>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">😠 冷淡</span>
          <span className="text-[10px] text-muted-foreground">🥰 甜蜜</span>
        </div>
      </div>
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-6xl animate-bounce">💬</div>
        <h2 className="text-xl font-semibold text-foreground">加载中...</h2>
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    }>
      <GamePageContent />
    </Suspense>
  );
}
