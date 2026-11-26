import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applyTrustDelta, TRUST_DELTAS } from '@/lib/trustLadder';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    // Update message status BEFORE applyTrustDelta so evidence counts include this rejection
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { status: 'rejected' },
    });

    const trustResult = await applyTrustDelta(
      message.clientId,
      TRUST_DELTAS.REJECTED,
      'rejected by freelancer',
      message.id
    );

    return NextResponse.json({ message: updatedMessage, ...trustResult });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to reject message' }, { status: 500 });
  }
}