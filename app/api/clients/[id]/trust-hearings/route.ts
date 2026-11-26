import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/clients/:id/trust-hearings — list hearings for a client, newest first
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const hearings = await prisma.trustHearing.findMany({
      where: { clientId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(hearings);
  } catch (err) {
    console.error('[GET /api/clients/:id/trust-hearings]', err);
    return NextResponse.json({ error: 'Failed to fetch hearings' }, { status: 500 });
  }
}
