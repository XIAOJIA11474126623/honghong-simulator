'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ArticleListItem {
  id: number;
  slug: string;
  title: string;
  summary: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

export default function BlogPage() {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/articles')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setArticles(data.articles || []);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-card)]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
          <h1 className="text-xl font-bold text-[var(--color-foreground)]">恋爱攻略</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {loading && (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-[var(--color-muted-foreground)]">加载中...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {!loading && !error && articles.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[var(--color-muted-foreground)]">暂无文章</p>
          </div>
        )}

        <div className="space-y-4">
          {articles.map(article => (
            <Link
              key={article.id}
              href={`/blog/${article.slug}`}
              className="block bg-[var(--color-card)] rounded-2xl p-6 border border-[var(--color-border)] hover:shadow-md hover:border-[var(--color-primary)]/30 transition-all group"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl flex-shrink-0 mt-1 group-hover:scale-110 transition-transform">{article.icon}</span>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-[var(--color-foreground)] mb-2 group-hover:text-[var(--color-primary)] transition-colors">{article.title}</h2>
                  <p className="text-[var(--color-muted-foreground)] text-sm leading-relaxed">{article.summary}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-muted-foreground)] flex-shrink-0 mt-2 group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
