import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const { userId, scenario, finalScore, result } = await request.json();

    if (!userId || !scenario || finalScore === undefined || !result) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    if (typeof finalScore !== 'number' || finalScore < 0) {
      return NextResponse.json({ error: '分数无效' }, { status: 400 });
    }

    if (!['pass', 'fail'].includes(result)) {
      return NextResponse.json({ error: '结果类型无效' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Verify user exists
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const { data: record, error } = await supabase
      .from('game_records')
      .insert({
        user_id: userId,
        scenario,
        final_score: finalScore,
        result,
      })
      .select('id, scenario, final_score, result, played_at')
      .single();

    if (error || !record) {
      console.error('[game-records] Save error:', error);
      return NextResponse.json({ error: '保存失败' }, { status: 500 });
    }

    return NextResponse.json({ record });
  } catch (err) {
    console.error('[game-records] Error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const { data: records, error } = await supabase
      .from('game_records')
      .select('id, scenario, final_score, result, played_at')
      .eq('user_id', Number(userId))
      .order('played_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[game-records] Fetch error:', error);
      return NextResponse.json({ error: '获取记录失败' }, { status: 500 });
    }

    return NextResponse.json({ records: records || [] });
  } catch (err) {
    console.error('[game-records] Error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
