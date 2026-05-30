import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Find user by username
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password_hash, created_at')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('[login] DB error:', error);
      return NextResponse.json({ error: '服务器错误' }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    // Verify password with bcrypt
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    return NextResponse.json({
      user: { id: user.id, username: user.username, createdAt: user.created_at },
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
