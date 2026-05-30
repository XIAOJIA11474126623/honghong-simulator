'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, Home, Trophy, RotateCcw, Loader2, Gamepad2, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface GameRecord {
  id: number;
  scenario: string;
  final_score: number;
  result: string;
  played_at: string;
}

export default function ProfilePage() {
  const { user, mounted, logout } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  const handleLogout = async () => {
    await logout();
    router.push('/');
    router.refresh();
  };

  useEffect(() => {
    if (!mounted) return;
    if (!user) {
      setLoadingRecords(false);
      return;
    }

    fetch(`/api/game-records?userId=${user.id}`)
      .then(res => res.json())
      .then(data => {
        setRecords(data.records || []);
      })
      .catch(() => {
        setRecords([]);
      })
      .finally(() => {
        setLoadingRecords(false);
      });
  }, [mounted, user]);

  // Not logged in
  if (mounted && !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
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
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <Gamepad2 className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">请先登录</h2>
            <p className="text-sm text-muted-foreground">登录后可查看你的游戏记录</p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-colors"
              style={{ backgroundColor: '#C96F3D' }}
            >
              <LogIn className="w-4 h-4" />
              去登录
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Stats
  const totalGames = records.length;
  const passCount = records.filter(r => r.result === 'pass').length;
  const avgScore = totalGames > 0 ? Math.round(records.reduce((s, r) => s + r.final_score, 0) / totalGames) : 0;
  const bestScore = totalGames > 0 ? Math.max(...records.map(r => r.final_score)) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
        {/* User Info */}
        <div className="bg-card rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">
                  {user?.username?.charAt(0).toUpperCase() ?? '?'}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{user?.username}</h2>
                <p className="text-xs text-muted-foreground">
                  加入于 {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '--'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5"
            >
              退出登录
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-card rounded-xl p-4 shadow-card text-center">
            <div className="text-2xl font-bold text-foreground">{totalGames}</div>
            <div className="text-xs text-muted-foreground mt-1">总场次</div>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card text-center">
            <div className="text-2xl font-bold text-primary">{passCount}</div>
            <div className="text-xs text-muted-foreground mt-1">通关次数</div>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card text-center">
            <div className="text-2xl font-bold text-foreground">{avgScore}</div>
            <div className="text-xs text-muted-foreground mt-1">平均分</div>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card text-center">
            <div className="text-2xl font-bold text-success">{bestScore}</div>
            <div className="text-xs text-muted-foreground mt-1">最高分</div>
          </div>
        </div>

        {/* Game History */}
        <div className="bg-card rounded-2xl p-6 shadow-card">
          <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            游戏记录
          </h3>

          {loadingRecords ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">加载中...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-8">
              <Gamepad2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">还没有游戏记录</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-colors"
                style={{ backgroundColor: '#C96F3D' }}
              >
                <RotateCcw className="w-4 h-4" />
                开始第一局
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-surface-container/50 hover:bg-surface-container transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl">
                      {record.result === 'pass' ? '🎉' : '💔'}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-foreground truncate">{record.scenario}</h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(record.played_at).toLocaleString('zh-CN', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${record.final_score >= 80 ? 'text-success' : record.final_score >= 60 ? 'text-primary' : 'text-warning'}`}>
                        {record.final_score}
                      </div>
                      <div className={`text-xs ${record.result === 'pass' ? 'text-success' : 'text-warning'}`}>
                        {record.result === 'pass' ? '通关' : '失败'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
