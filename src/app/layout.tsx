import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

export const metadata: Metadata = {
  title: '哄哄模拟器 | 学会读懂TA的情绪信号',
  description:
    '通过模拟常见吵架场景，练习识别情绪信号并学会正确回应。让理工男也能学会哄人！',
  keywords: [
    '哄哄模拟器',
    '恋爱模拟',
    '情绪识别',
    '情侣沟通',
    '哄人技巧',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">
        <AuthProvider>
          <Suspense>{children}</Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
