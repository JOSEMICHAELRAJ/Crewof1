import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const freelancer = await prisma.freelancer.findFirst();
    if (!freelancer) return NextResponse.json({ error: "No freelancer found" }, { status: 404 });
    return NextResponse.json(freelancer);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { defaultMaxDiscountPct, defaultMaxDelayDays, escalationKeywords, defaultTone } = body;

    const freelancer = await prisma.freelancer.findFirst();
    if (!freelancer) return NextResponse.json({ error: "No freelancer found" }, { status: 404 });

    const updated = await prisma.freelancer.update({
      where: { id: freelancer.id },
      data: {
        ...(defaultMaxDiscountPct !== undefined && { defaultMaxDiscountPct: Number(defaultMaxDiscountPct) }),
        ...(defaultMaxDelayDays !== undefined && { defaultMaxDelayDays: Number(defaultMaxDelayDays) }),
        ...(escalationKeywords !== undefined && { escalationKeywords }),
        ...(defaultTone !== undefined && { defaultTone }),
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
