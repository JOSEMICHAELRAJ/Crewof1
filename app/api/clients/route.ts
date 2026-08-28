import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/clients — all clients with trust info + outstanding balance
export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        invoices: {
          select: {
            id: true,
            amount: true,
            amountPaid: true,
            status: true,
            dueDate: true,
          },
        },
        messages: {
          where: { status: "drafted" },
          select: { id: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    const enriched = clients.map((c) => {
      const outstanding = c.invoices
        .filter((inv) => !["paid", "draft"].includes(inv.status))
        .reduce((sum, inv) => sum + (inv.amount - inv.amountPaid), 0);

      const lastInvoice = c.invoices
        .sort(
          (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
        )
        .at(0);

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        company: c.company,
        trustScore: c.trustScore,
        autonomyLevel: c.autonomyLevel,
        manualOverride: c.manualOverride,
        outstanding,
        pendingDrafts: c.messages.length,
        lastInvoiceStatus: lastInvoice?.status ?? null,
        lastInvoiceDueDate: lastInvoice?.dueDate ?? null,
        createdAt: c.createdAt,
      };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("[GET /api/clients]", err);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

// POST /api/clients — create a new client
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, company } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    // Get the single demo freelancer
    const freelancer = await prisma.freelancer.findFirst();
    if (!freelancer) {
      return NextResponse.json(
        { error: "No freelancer account found. Run the seed script." },
        { status: 500 }
      );
    }

    const client = await prisma.client.create({
      data: {
        freelancerId: freelancer.id,
        name: name.trim(),
        email: email.trim(),
        company: company?.trim() ?? null,
        trustScore: 20,
        autonomyLevel: 0,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    console.error("[POST /api/clients]", err);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
