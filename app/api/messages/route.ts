import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/messages — list messages, optionally filtered by status or clientId
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // e.g. "drafted" for inbox
    const clientId = searchParams.get("clientId");

    const messages = await prisma.message.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(clientId ? { clientId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            trustScore: true,
            autonomyLevel: true,
          },
        },
        invoice: {
          select: {
            id: true,
            amount: true,
            amountPaid: true,
            description: true,
            status: true,
            dueDate: true,
          },
        },
      },
    });

    // Enrich with days overdue for the inbox context display
    const enriched = messages.map((m) => {
      const daysOverdue = m.invoice
        ? Math.max(
            0,
            Math.floor(
              (Date.now() - new Date(m.invoice.dueDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )
        : 0;
      return { ...m, daysOverdue };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("[GET /api/messages]", err);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
