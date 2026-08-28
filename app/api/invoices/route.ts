import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/invoices — list invoices, optionally filtered by clientId
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    const invoices = await prisma.invoice.findMany({
      where: clientId ? { clientId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true, autonomyLevel: true } },
      },
    });

    return NextResponse.json(invoices);
  } catch (err) {
    console.error("[GET /api/invoices]", err);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

// POST /api/invoices — create a new invoice for a client
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientId, amount, description, dueDate, status } = body;

    if (!clientId || typeof clientId !== "string") {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "amount must be a positive number" },
        { status: 400 }
      );
    }
    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "description is required" },
        { status: 400 }
      );
    }
    if (!dueDate) {
      return NextResponse.json({ error: "dueDate is required" }, { status: 400 });
    }

    const parsedDate = new Date(dueDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: "dueDate must be a valid ISO date string" },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const validStatuses = ["draft", "sent", "overdue", "partial", "disputed", "paid"];
    const invoiceStatus =
      status && validStatuses.includes(status) ? status : "draft";

    const invoice = await prisma.invoice.create({
      data: {
        clientId,
        amount,
        description: description.trim(),
        dueDate: parsedDate,
        status: invoiceStatus,
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (err) {
    console.error("[POST /api/invoices]", err);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
