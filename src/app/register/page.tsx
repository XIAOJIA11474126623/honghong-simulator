'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('请填写用户名和密码');
      return;
    }

    if (username.trim().length < 2) {
      setError('用户名至少2个字符');
      return;
    }

    if (password.length < 6) {
      setError('密码至少6个字符');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      await register(username.trim(), password);
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#FBF3E7' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#C96F3D' }}>哄哄模拟器</h1>
          <p className="text-sm" style={{ color: '#8B7662' }}>学会读懂TA的情绪信号</p>
        </div>

        <div className="rounded-2xl p-6 shadow-lg" style={{ backgroundColor: '#FFF9F1' }}>
          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: '#31251B' }}>注册</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm text-red-700 bg-red-50 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#31251B' }}>用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: '#FBF3E7',
                  borderColor: '#e8ddd0',
                  color: '#31251B',
                }}
                placeholder="2个字符以上"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#31251B' }}>密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: '#FBF3E7',
                  borderColor: '#e8ddd0',
                  color: '#31251B',
                }}
                placeholder="6个字符以上"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#31251B' }}>确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: '#FBF3E7',
                  borderColor: '#e8ddd0',
                  color: '#31251B',
                }}
                placeholder="再次输入密码"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: '#C96F3D' }}
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm" style={{ color: '#8B7662' }}>
            已有账号？
            <Link href="/login" className="font-medium hover:underline ml-1" style={{ color: '#C96F3D' }}>
              去登录
            </Link>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm hover:underline" style={{ color: '#8B7662' }}>
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
