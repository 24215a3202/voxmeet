// ============================================
// Next.js Middleware — Admin Route Protection
// ============================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET || 'fallback-secret');

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect admin page (not login page)
  if (pathname === '/admin') {
    // For page requests, the JWT is in sessionStorage (client-side),
    // so we can't validate it in middleware. Instead, the admin page
    // itself validates the token via API calls.
    // However, we can add additional security headers here.
  }

  // Protect admin API routes (not login)
  if (pathname.startsWith('/api/admin/') && !pathname.startsWith('/api/admin/login')) {
    const auth = request.headers.get('authorization');

    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const token = auth.slice(7);
      await jwtVerify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/api/admin/:path*'],
};
