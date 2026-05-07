// ============================================
// Admin API: Bans
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET || 'fallback-secret');

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return false;

  try {
    const token = auth.slice(7);
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { userId, type } = body;

    if (!userId || !['SOFT', 'HARD'].includes(type)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Upsert ban
    const ban = await prisma.ban.upsert({
      where: { userId },
      update: {
        type,
        expiresAt: type === 'SOFT' ? new Date(Date.now() + 86400000) : null,
      },
      create: {
        userId,
        type,
        expiresAt: type === 'SOFT' ? new Date(Date.now() + 86400000) : null,
      },
    });

    // Log the admin action
    await prisma.auditLog.create({
      data: {
        action: 'BAN_ISSUED',
        actorId: 'admin',
        targetId: userId,
        metadata: { type, banId: ban.id },
      },
    });

    return NextResponse.json({ success: true, ban });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to issue ban' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    await prisma.ban.delete({ where: { userId } });

    await prisma.auditLog.create({
      data: {
        action: 'BAN_LIFTED',
        actorId: 'admin',
        targetId: userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to lift ban' }, { status: 500 });
  }
}
