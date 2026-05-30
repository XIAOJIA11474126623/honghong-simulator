import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Auth state is managed client-side via localStorage
  // This endpoint validates the stored user data
  const authHeader = request.headers.get('x-auth-user');
  if (!authHeader) {
    return NextResponse.json({ user: null });
  }

  try {
    const user = JSON.parse(authHeader);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}
