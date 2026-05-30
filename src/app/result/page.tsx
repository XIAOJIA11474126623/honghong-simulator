'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Heart, Home, RotateCcw, ArrowRight,
  AlertTriangle, Lightbulb, Loader2, TrendingUp,
  CheckCircle, LogIn,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { boyfriendScenarios, girlfriendScenarios } from '@/lib/scenarios';

/* ────── Types ────── */
interface DimensionScores {
  emotionRecognition: number;
  responseMethod: number;
  toneControl: number;
  timingJudgment: number;
}

interface SummaryData {
  dimensions: DimensionScores;
  weaknessAnalysis: string;
  improvementAdvice: string;
  overallComment: string;
}

/* ────── Helpers ────── */
function getResultEmoji(score: number, max: number): string {
  const ratio = max === 0 ? 0 : score / max;
  if (ratio >= 0.9) return '🥰';
  if (ratio >= 0.7) return '😄';
  if (ratio >= 0.5) return '😊';
  if (ratio >= 0.3) return '😐';
  return '😠';
}

function getResultLabel(score: number, max: number): { text: string; color: string } {
  const ratio = max === 0 ? 0 : score / max;
  if (ratio >= 0.8) return { text: '通关! TA被你哄好了', color: 'text-success' };
  if (ratio >= 0.6) return { text: '还不错，继续加油!', color: 'text-primary' };
  if (ratio >= 0.4) return { text: '有点危险，需要练习', color: 'text-warning' };
  if (ratio > 0) return { text: 'TA很失望...', color: 'text-destructive' };
  return { text: '分手! TA已经离开了', color: 'text-destructive' };
}

function getAiComment(score: number, max: number, partner: string): string {
  const ratio = max === 0 ? 0 : score / max;
  if (ratio >= 0.9) return `你真的太懂我了～有你在真好 🥰`;
  if (ratio >= 0.7) return `虽然还有进步空间，但我知道你在努力 💪`;
  if (ratio >= 0.5) return `嗯...你还需要多了解我一点 😔`;
  if (ratio >= 0.3) return `我觉得我们之间有堵墙... 😢`;
  if (ratio > 0) return `你真的懂我吗... 😤`;
  return `我们还是做回朋友吧... 💔`;
}

const DIMENSION_LABELS: Record<string, string> = {
  emotionRecognition: '情绪信号识别',
  responseMethod: '回应方式选择',
  toneControl: '语气把握',
  timingJudgment: '时机判断',
};

/* ────── Component ────── */
export default function ResultPage() {
  const searchParams = useSearchParams();
  const role = searchParams.get('role') ?? 'boyfriend';
  const voiceId = searchParams.get('voice') ?? '';
  const score = parseInt(searchParams.get('score') ?? '0', 10);
  const maxScore = 100;
  const scenarioId = searchParams.get('scenario') ?? '';
  const partner = role === 'boyfriend' ? '女朋友' : '男朋友';

  const { user, mounted } = useAuth();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveToast, setSaveToast] = useState<{ show: boolean; message: string; type: 'success' | 'info' }>({ show: false, message: '', type: 'success' });
  const saveAttempted = useRef(false);

  const questionResultsStr = searchParams.get('results');
  let questionResults: Array<{ id: number; selectedScore: number; selectedLabel: string }> = [];
  try {
    questionResults = questionResultsStr ? JSON.parse(questionResultsStr) : [];
  } catch {
    questionResults = [];
  }

  // Get scenario title
  const allScenarios = role === 'boyfriend' ? boyfriendScenarios : girlfriendScenarios;
  const scenarioObj = allScenarios.find(s => s.id === scenarioId);
  const scenarioTitle = scenarioObj?.title ?? scenarioId.replace(/-/g, ' ');

  // Fetch summary
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const res = await fetch('/api/generate-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, scenario: scenarioTitle, totalScore: score, questionResults }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error('获取小结失败');
        }
        const data = await res.json();
        setSummary(data);
      } catch (err) {
        const message = err instanceof DOMException && err.name === 'AbortError'
          ? 'AI生成小结超时，请重试'
          : err instanceof Error ? err.message : '获取小结失败';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save game record when auth state is resolved
  useEffect(() => {
    if (!mounted || saveAttempted.current) return;
    saveAttempted.current = true;

    if (user) {
      // Logged in: auto-save
      fetch('/api/game-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          scenario: scenarioTitle,
          finalScore: score,
          result: score >= 80 ? 'pass' : 'fail',
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.record) {
            setSaveToast({ show: true, message: '您的游戏记录已保存', type: 'success' });
          } else {
            setSaveToast({ show: true, message: '保存失败，请稍后重试', type: 'info' });
          }
        })
        .catch(() => {
          setSaveToast({ show: true, message: '保存失败，请稍后重试', type: 'info' });
        });
    } else {
      // Not logged in: show login prompt
      setSaveToast({ show: true, message: '登录后可保存你的游戏记录', type: 'info' });
    }
  }, [mounted, user, scenarioTitle, score]);

  // Auto-hide toast
  useEffect(() => {
    if (!saveToast.show) return;
    const timer = setTimeout(() => setSaveToast(prev => ({ ...prev, show: false })), 4000);
    return () => clearTimeout(timer);
  }, [saveToast.show]);

  const emoji = getResultEmoji(score, maxScore);
  const resultLabel = getResultLabel(score, maxScore);
  const aiComment = getAiComment(score, maxScore, partner);

  const defaultDimensions: DimensionScores = {
    emotionRecognition: Math.min(100, Math.round((score / maxScore) * 100 + 5)),
    responseMethod: Math.min(100, Math.round((score / maxScore) * 95)),
    toneControl: Math.min(100, Math.round((score / maxScore) * 90)),
    timingJudgment: Math.min(100, Math.round((score / maxScore) * 85)),
  };

  const dimensions = summary?.dimensions ?? defaultDimensions;
  const weakness = summary?.weaknessAnalysis ?? '正在分析中...';
  const advice = summary?.improvementAdvice ?? '正在生成建议...';
  const comment = summary?.overallComment ?? aiComment;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Toast notification */}
      {saveToast.show && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${
            saveToast.type === 'success'
              ? 'bg-success/90 text-white'
              : 'bg-card text-foreground border border-outline-variant/20'
          }`}>
            {saveToast.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <LogIn className="w-4 h-4 text-primary" />
            )}
            <span>{saveToast.message}</span>
            {saveToast.type === 'info' && (
              <Link href="/login" className="ml-2 underline text-primary hover:opacity-80">
                去登录
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Simple header */}
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
            <Home className="w-4 h-4" />
            首页
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto flex-1 p-6 flex flex-col gap-6">
        {/* Result Hero */}
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="text-7xl">{emoji}</div>
          <div className="text-center">
            <div className="text-4xl font-bold text-foreground mb-2">
              {score}<span className="text-xl text-muted-foreground"> / {maxScore}</span>
            </div>
            <span className={`text-lg font-semibold ${resultLabel.color}`}>
              {resultLabel.text}
            </span>
          </div>
          <p className="text-sm text-muted-foreground italic text-center max-w-xs">
            &ldquo;{comment}&rdquo;
          </p>
        </div>

        {/* Dimensions Chart */}
        <div className="bg-card rounded-2xl p-6 shadow-card">
          <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            你的情绪识别小结
          </h3>
          <div className="space-y-4">
            {Object.entries(dimensions).map(([key, value]) => {
              const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
              const isWeak = safeValue < 60;
              return (
                <div key={key}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-foreground">{DIMENSION_LABELS[key] ?? key}</span>
                    <span className={`text-sm font-semibold ${isWeak ? 'text-warning' : 'text-primary'}`}>
                      {safeValue}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${isWeak ? 'bg-warning' : 'bg-primary'}`}
                      style={{ width: `${safeValue}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weakness Analysis */}
        <div className="bg-warning/10 rounded-2xl p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1">薄弱环节分析</h4>
            <p className="text-sm text-muted-foreground">
              {loading ? '正在分析...' : weakness}
            </p>
          </div>
        </div>

        {/* Improvement Advice */}
        <div className="bg-success/10 rounded-2xl p-5 flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-success shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1">改善建议</h4>
            <p className="text-sm text-muted-foreground">
              {loading ? '正在生成...' : advice}
            </p>
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-2">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">AI正在生成详细分析...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">
            {error}，但基础分数和评级仍然有效。
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            href="/"
            className="flex-1 bg-primary text-primary-foreground px-6 py-3 rounded-xl
              font-semibold text-center shadow-float hover:opacity-90
              transition-all duration-300 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            再玩一次
          </Link>
          <Link
            href={`/game?role=${role}${voiceId ? `&voice=${voiceId}` : ''}`}
            className="flex-1 bg-card text-foreground px-6 py-3 rounded-xl
              font-semibold text-center shadow-card hover:shadow-float
              border-2 border-outline-variant/20 transition-all duration-300
              flex items-center justify-center gap-2"
          >
            换个场景
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Share hint */}
        <p className="text-xs text-muted-foreground text-center pb-4">
          分享给朋友，看看TA能得几分
        </p>
      </main>
    </div>
  );
}
