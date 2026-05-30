'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Home, Trophy, Loader2, Medal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  score: number;
  playedAt: string;
}

const RANK_STYLES: Record<number, { bg: string; text: string; icon: string }> = {
  1: { bg: 'bg-amber-400/15', text: 'text-amber-600', icon: '🥇' },
  2: { bg: 'bg-slate-300/15', text: 'text-slate-500', icon: '🥈' },
  3: { bg: 'bg-orange-400/10', text: 'text-orange-600', icon: '🥉' },
};

export default function LeaderboardPage() {
  const { user, mounted } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => {
        setLeaderboard(data.leaderboard || []);
      })
      .catch(() => {
        setLeaderboard([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card sticky top-0 z-40 h-14 flex items-center justify-between px-6 shadow-card">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Heart className="text-primary w-5 h-5 fill-primary" />
            <span className="font-bold text-lg text-foreground">哄哄模拟器</span>
          </Link>
          <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Home className="w-4 h-4" />
            首页
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto flex-1 p-6 flex flex-col gap-6">
        {/* Title */}
        <div className="text-center space-y-2 pt-4">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">哄哄排行榜</h1>
          </div>
          <p className="text-sm text-muted-foreground">谁是最懂TA的人？</p>
        </div>

        {/* Leaderboard */}
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">加载中...</span>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-16">
            <Medal className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">暂无排行数据</p>
            <p className="text-sm text-muted-foreground">登录后完成游戏，成为第一个上榜的人！</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry) => {
              const isCurrentUser = mounted && user && user.id === entry.userId;
              const rankStyle = RANK_STYLES[entry.rank];

              return (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                    isCurrentUser
                      ? 'bg-primary/10 border-2 border-primary/30 shadow-float'
                      : rankStyle
                        ? `${rankStyle.bg} border border-outline-variant/10`
                        : 'bg-card border border-outline-variant/10'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-10 text-center shrink-0">
                    {rankStyle ? (
                      <span className="text-xl">{rankStyle.icon}</span>
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">{entry.rank}</span>
                    )}
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-sm truncate ${isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                        {entry.username}
                      </span>
                      {isCurrentUser && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium shrink-0">
                          我
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(entry.playedAt).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <div className={`text-xl font-bold ${
                      entry.score >= 90 ? 'text-success' :
                      entry.score >= 80 ? 'text-primary' :
                      entry.score >= 60 ? 'text-warning' :
                      'text-muted-foreground'
                    }`}>
                      {entry.score}
                    </div>
                    <div className="text-xs text-muted-foreground">好感度</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom hint */}
        {mounted && !user && leaderboard.length > 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              登录后你的成绩才能上榜哦～{' '}
              <Link href="/login" className="text-primary hover:underline">去登录</Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
