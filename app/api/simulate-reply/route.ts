import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decideAction, classifySituation } from '@/lib/agent';

export async function POST(req: NextRequest) {
  try {
    const { clientId, invoiceId, content } = await req.json();

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { freelancer: true },
    });
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });

    if (!client || !invoice) {
      return NextResponse.json({ error: 'Client or invoice not found' }, { status: 404 });
    }

    // Save the simulated client message
    const clientMessage = await prisma.message.create({
      data: { invoiceId, clientId, sender: 'client', content, status: 'received' },
    });

    const situationType = classifySituation(content, client.freelancer);
    const decision = await decideAction(client, client.freelancer, invoice, situationType, content);

    const status =
      decision.action === 'AUTO_SEND' ? 'auto_sent' :
      decision.action === 'ESCALATE' ? 'escalated' : 'drafted';

    const agentMessage = await prisma.message.create({
      data: {
        invoiceId,
        clientId,
        sender: 'agent',
        content: decision.action === 'ESCALATE' ? decision.reason : decision.draftedMessage,
        status,
      },
    });

    return NextResponse.json({ clientMessage, agentMessage, decision, situationType });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to process reply' }, { status: 500 });
  }
}