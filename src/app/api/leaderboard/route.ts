import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    // Get top 20 users by their highest score
    const { data, error } = await supabase
      .from('game_records')
      .select('user_id, final_score, played_at, users(username)')
      .order('final_score', { ascending: false });

    if (error) {
      console.error('[leaderboard] Fetch error:', error);
      return NextResponse.json({ error: '获取排行榜失败' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ leaderboard: [] });
    }

    // Group by user_id, keep only the highest score per user
    const bestByUser = new Map<number, { username: string; score: number; playedAt: string }>();
    for (const row of data) {
      const userId = row.user_id as number;
      const username = (row.users as unknown as { username: string })?.username ?? '未知用户';
      const score = row.final_score as number;
      const playedAt = row.played_at as string;

      const existing = bestByUser.get(userId);
      if (!existing || score > existing.score) {
        bestByUser.set(userId, { username, score, playedAt });
      }
    }

    // Sort by score desc, take top 20
    const leaderboard = Array.from(bestByUser.entries())
      .map(([userId, info]) => ({
        userId,
        username: info.username,
        score: info.score,
        playedAt: info.playedAt,
      }))
      .sort((a, b) => b.score - a.score || new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime())
      .slice(0, 20)
      .map((entry, index) => ({
        rank: index + 1,
        ...entry,
      }));

    return NextResponse.json({ leaderboard });
  } catch (err) {
    console.error('[leaderboard] Error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
