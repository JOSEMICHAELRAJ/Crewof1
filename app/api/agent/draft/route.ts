import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decideAction, classifySituation, SituationType } from '@/lib/agent';

export async function POST(req: NextRequest) {
  try {
    const { clientId, invoiceId, situationType } = await req.json();

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { freelancer: true },
    });
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });

    if (!client || !invoice) {
      return NextResponse.json({ error: 'Client or invoice not found' }, { status: 404 });
    }

    const decision = await decideAction(
      client,
      client.freelancer,
      invoice,
      situationType as SituationType
    );

    const status =
      decision.action === 'AUTO_SEND' ? 'auto_sent' :
      decision.action === 'ESCALATE' ? 'escalated' : 'drafted';

    const message = await prisma.message.create({
      data: {
        invoiceId,
        clientId,
        sender: 'agent',
        content: decision.action === 'ESCALATE' ? decision.reason : decision.draftedMessage,
        status,
      },
    });

    return NextResponse.json({ message, decision });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to draft message' }, { status: 500 });
  }
}