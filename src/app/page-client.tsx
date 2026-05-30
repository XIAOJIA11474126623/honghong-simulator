'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, User, UserRound, Volume2, BookOpen, LogIn, LogOut, Trophy, UserCircle } from 'lucide-react';
import { getVoicesByRole, type Voice } from '@/lib/voices';
import { useAuth } from '@/contexts/AuthContext';

type Role = 'boyfriend' | 'girlfriend';

export default function HomePageClient() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const { user, logout, mounted } = useAuth();

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    setSelectedVoice(null); // 切换角色时重置语音选择
  };

  const handleLogout = async () => {
    await logout();
  };

  const voices = selectedRole ? getVoicesByRole(selectedRole) : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card sticky top-0 z-40 h-14 flex items-center justify-between px-6 shadow-card">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="text-primary w-5 h-5 fill-primary" />
            <span className="font-bold text-lg text-foreground">哄哄模拟器</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/blog" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
              <BookOpen className="w-4 h-4" />
              <span>恋爱攻略</span>
            </Link>
            <Link href="/leaderboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
              <Trophy className="w-4 h-4" />
              <span>排行榜</span>
            </Link>
            {!mounted ? (
              <div className="h-8 w-28" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <Link href="/profile" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <UserCircle className="w-4 h-4" />
                  <span>{user.username}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>退出登录</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <LogIn className="w-4 h-4" />
                  <span>登录</span>
                </Link>
                <Link href="/register" className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm text-white hover:opacity-90 transition-colors" style={{ backgroundColor: '#C96F3D' }}>
                  <span>注册</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto flex-1 p-6 flex flex-col items-center justify-center gap-10">
        {/* Hero Section */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            哄哄模拟器
          </h1>
          <p className="text-lg text-muted-foreground">
            学会读懂TA的情绪信号
          </p>
          <Link href="/blog" className="inline-flex items-center gap-2 bg-primary/10 text-primary px-5 py-2.5 rounded-full text-sm font-medium hover:bg-primary/20 transition-colors">
            <BookOpen className="w-4 h-4" />
            恋爱攻略 — 让你的感情少踩雷
          </Link>
        </div>

        {/* Step 1: Role Selection */}
        <div className="w-full max-w-2xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">1</span>
            <h2 className="text-lg font-semibold text-foreground">选择你的角色</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Girlfriend Card */}
            <button
              onClick={() => handleSelectRole('girlfriend')}
              className={`group relative bg-card rounded-2xl p-6 shadow-card hover:shadow-float
                transition-all duration-300 hover:-translate-y-1 cursor-pointer text-left
                border-2 ${selectedRole === 'girlfriend' ? 'border-primary' : 'border-transparent'}`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center
                  ${selectedRole === 'girlfriend' ? 'bg-primary/20' : 'bg-surface-container'}
                  transition-colors duration-300`}>
                  <UserRound className={`w-7 h-7 ${selectedRole === 'girlfriend' ? 'text-primary' : 'text-muted-foreground'} transition-colors duration-300`} />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-semibold text-foreground">我是女朋友</h3>
                  <p className="text-sm text-muted-foreground">男朋友生气了，我来哄他</p>
                </div>
              </div>
            </button>

            {/* Boyfriend Card */}
            <button
              onClick={() => handleSelectRole('boyfriend')}
              className={`group relative bg-card rounded-2xl p-6 shadow-card hover:shadow-float
                transition-all duration-300 hover:-translate-y-1 cursor-pointer text-left
                border-2 ${selectedRole === 'boyfriend' ? 'border-primary' : 'border-transparent'}`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center
                  ${selectedRole === 'boyfriend' ? 'bg-primary/20' : 'bg-surface-container'}
                  transition-colors duration-300`}>
                  <User className={`w-7 h-7 ${selectedRole === 'boyfriend' ? 'text-primary' : 'text-muted-foreground'} transition-colors duration-300`} />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-semibold text-foreground">我是男朋友</h3>
                  <p className="text-sm text-muted-foreground">女朋友生气了，我来哄她</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Step 2: Voice Selection (appears after role is selected) */}
        {selectedRole && (
          <div className="w-full max-w-2xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">2</span>
              <h2 className="text-lg font-semibold text-foreground">
                选择TA的声音
              </h2>
            </div>
            <p className="text-sm text-muted-foreground -mt-2 ml-9">
              选一个你最受不了（或最受用）的声音吧
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {voices.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice)}
                  className={`group relative bg-card rounded-xl p-4 shadow-card hover:shadow-float
                    transition-all duration-300 hover:-translate-y-0.5 cursor-pointer text-left
                    border-2 ${selectedVoice?.id === voice.id ? 'border-primary' : 'border-transparent hover:border-primary/30'}`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Volume2 className={`w-5 h-5 ${selectedVoice?.id === voice.id ? 'text-primary' : 'text-muted-foreground/40'}`} />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="font-semibold text-sm text-foreground">
                        {voice.name}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-snug">
                        {voice.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Start Button */}
        {selectedRole && selectedVoice && (
          <Link
            href={`/game?role=${selectedRole}&voice=${selectedVoice.id}`}
            className="bg-primary text-primary-foreground px-8 py-3 rounded-xl
              font-semibold text-lg shadow-float hover:opacity-90
              transition-all duration-300 hover:-translate-y-0.5
              animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            选择场景，开始闯关
          </Link>
        )}

        {/* Description */}
        <p className="text-xs text-muted-foreground text-center max-w-md">
          通过模拟常见吵架场景，练习识别情绪信号并学会正确回应
        </p>
      </main>
    </div>
  );
}
