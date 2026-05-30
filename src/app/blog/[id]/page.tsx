'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Article {
  id: number;
  slug: string;
  title: string;
  summary: string;
  icon: string;
  content: string;
  sort_order: number;
  created_at: string;
}

export default function ArticleDetailPage() {
  const params = useParams();
  const slug = params.id as string;
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/articles?slug=${encodeURIComponent(slug)}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setArticle(data.article || null);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[var(--color-muted-foreground)]">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || '文章不存在'}</p>
          <Link href="/blog" className="text-[var(--color-primary)] hover:underline">返回攻略列表</Link>
        </div>
      </div>
    );
  }

  const paragraphs = article.content.split('\n').filter(p => p.trim());

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-card)]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/blog" className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
          <h1 className="text-xl font-bold text-[var(--color-foreground)]">恋爱攻略</h1>
        </div>
      </header>

      {/* Article */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <article className="bg-[var(--color-card)] rounded-2xl p-8 border border-[var(--color-border)]">
          <div className="text-center mb-8">
            <span className="text-5xl block mb-4">{article.icon}</span>
            <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-3">{article.title}</h1>
            <p className="text-[var(--color-muted-foreground)] text-sm">{article.summary}</p>
          </div>

          <div className="prose max-w-none">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="text-[var(--color-foreground)] leading-relaxed mb-4 text-base">
                {paragraph}
              </p>
            ))}
          </div>
        </article>

        <div className="text-center mt-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-[var(--color-primary)] hover:underline font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            返回攻略列表
          </Link>
        </div>
      </main>
    </div>
  );
}
