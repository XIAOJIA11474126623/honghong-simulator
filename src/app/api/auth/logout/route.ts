import { NextResponse } from 'next/server';

export async function POST() {
  // Client-side clears localStorage, this is just a clean endpoint
  return NextResponse.json({ success: true });
}
