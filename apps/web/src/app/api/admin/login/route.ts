// ============================================
// Admin API: Login (JWT generation)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

const ADMIN_SECRET = process.env.ADMIN_SECRET || '';
const JWT_SECRET = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET || 'fallback-secret');

// Simple in-memory rate limit for login attempts
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (attempt && attempt.resetAt > now && attempt.count >= 5) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again later.' },
      { status: 429 }
    );
  }

  if (!attempt || attempt.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 900_000 }); // 15 min window
  } else {
    attempt.count++;
  }

  try {
    const body = await req.json();
    const { secret } = body;

    if (typeof secret !== 'string' || secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Generate JWT with 1-hour expiry
    const token = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(JWT_SECRET);

    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
