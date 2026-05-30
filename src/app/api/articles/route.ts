import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  try {
    const client = getSupabaseClient();

    if (slug) {
      // Get single article by slug
      const { data, error } = await client
        .from('articles')
        .select('id, slug, title, summary, icon, content, sort_order, created_at')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw new Error(`查询文章失败: ${error.message}`);
      if (!data) {
        return NextResponse.json({ error: '文章不存在' }, { status: 404 });
      }
      return NextResponse.json({ article: data });
    }

    // Get all articles (list)
    const { data, error } = await client
      .from('articles')
      .select('id, slug, title, summary, icon, sort_order, created_at')
      .order('sort_order', { ascending: true });

    if (error) throw new Error(`查询文章列表失败: ${error.message}`);

    return NextResponse.json({ articles: data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Article API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
