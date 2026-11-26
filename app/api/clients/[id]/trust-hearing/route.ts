import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { convene } from '@/lib/trustCourt';

// POST /api/clients/:id/trust-hearing — manually convene a court hearing
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const result = await convene(id, 'manual');
    return NextResponse.json(result.hearing);
  } catch (err) {
    console.error('[POST /api/clients/:id/trust-hearing]', err);
    return NextResponse.json({ error: 'Failed to convene hearing' }, { status: 500 });
  }
}
