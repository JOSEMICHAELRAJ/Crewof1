import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/clients/:id — full client detail with invoices, messages, trust events
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        freelancer: {
          select: {
            defaultMaxDiscountPct: true,
            defaultMaxDelayDays: true,
            defaultTone: true,
            escalationKeywords: true,
          },
        },
        invoices: {
          orderBy: { createdAt: "desc" },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            invoice: {
              select: { id: true, amount: true, description: true, status: true },
            },
          },
        },
        trustEvents: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            delta: true,
            reason: true,
            createdAt: true,
            messageId: true,
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Build a running trust score series for the chart
    let running = 20;
    const trustSeries = client.trustEvents.map((evt) => {
      running = Math.max(0, Math.min(100, running + evt.delta));
      return {
        ...evt,
        scoreAfter: running,
      };
    });

    return NextResponse.json({ ...client, trustSeries });
  } catch (err) {
    console.error("[GET /api/clients/:id]", err);
    return NextResponse.json({ error: "Failed to fetch client" }, { status: 500 });
  }
}

// PATCH /api/clients/:id — update boundary overrides or manual autonomy level
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const {
      maxDiscountPctOverride,
      maxDelayDaysOverride,
      toneOverride,
      autonomyLevel,
      manualOverride,
    } = body;

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        ...(maxDiscountPctOverride !== undefined && { maxDiscountPctOverride }),
        ...(maxDelayDaysOverride !== undefined && { maxDelayDaysOverride }),
        ...(toneOverride !== undefined && { toneOverride }),
        ...(autonomyLevel !== undefined && { autonomyLevel }),
        ...(manualOverride !== undefined && { manualOverride }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/clients/:id]", err);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}
