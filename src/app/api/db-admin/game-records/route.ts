import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    const { data: records, error } = await supabase
      .from('game_records')
      .select('*')
      .order('played_at', { ascending: false });
    
    if (error) throw error;
    
    return NextResponse.json({ records });
  } catch (error) {
    console.error('获取游戏记录失败:', error);
    return NextResponse.json({ records: [] });
  }
}
