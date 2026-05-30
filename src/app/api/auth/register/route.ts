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

    if (username.length < 2 || username.length > 20) {
      return NextResponse.json({ error: '用户名长度需在2-20之间' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密码长度不能少于6位' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Check if username already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: '用户名已被注册' }, { status: 409 });
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const { data: user, error } = await supabase
      .from('users')
      .insert({ username, password_hash: passwordHash })
      .select('id, username, created_at')
      .single();

    if (error || !user) {
      console.error('Register error:', error);
      return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 });
    }

    return NextResponse.json({
      user: { id: user.id, username: user.username, createdAt: user.created_at },
    });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
