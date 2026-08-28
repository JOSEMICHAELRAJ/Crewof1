import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applyTrustDelta, TRUST_DELTAS } from '@/lib/trustLadder';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { editedContent } = await req.json().catch(() => ({}));
    const message = await prisma.message.findUnique({ where: { id } });

    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    const wasEdited = editedContent && editedContent !== message.content;
    const newStatus = wasEdited ? 'approved_edited' : 'approved_unedited';
    const delta = wasEdited ? TRUST_DELTAS.APPROVED_EDITED : TRUST_DELTAS.APPROVED_UNEDITED;

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { status: newStatus, content: editedContent ?? message.content },
    });

    const trustResult = await applyTrustDelta(
      message.clientId,
      delta,
      wasEdited ? 'approved with edits' : 'approved unedited',
      message.id
    );

    return NextResponse.json({ message: updatedMessage, ...trustResult });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to approve message' }, { status: 500 });
  }
}