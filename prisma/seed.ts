import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Clean up existing data ────────────────────────────────────────────────
  await prisma.trustEvent.deleteMany();
  await prisma.message.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.client.deleteMany();
  await prisma.freelancer.deleteMany();

  // ── Freelancer ────────────────────────────────────────────────────────────
  const freelancer = await prisma.freelancer.create({
    data: {
      name: "Demo Freelancer",
      email: "demo@collectapp.dev",
      defaultMaxDiscountPct: 15,
      defaultMaxDelayDays: 14,
      escalationKeywords: "refund,lawyer,cancel,chargeback,dispute,legal action,sue",
      defaultTone: "friendly",
    },
  });
  console.log(`  ✓ Freelancer: ${freelancer.name}`);

  // ── Client 1: Riya Sharma — Level 2, fully trusted ────────────────────────
  // Score 82 → Level 2. Agent auto-sent a routine reminder already.
  const riya = await prisma.client.create({
    data: {
      freelancerId: freelancer.id,
      name: "Riya Sharma",
      email: "riya@sharmacreative.io",
      company: "Sharma Creative",
      trustScore: 82,
      autonomyLevel: 2,
      toneOverride: "friendly",
    },
  });

  const riyaInvoice = await prisma.invoice.create({
    data: {
      clientId: riya.id,
      amount: 4200,
      amountPaid: 0,
      description: "Brand identity redesign — final deliverables",
      dueDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days overdue
      status: "overdue",
    },
  });

  await prisma.message.create({
    data: {
      invoiceId: riyaInvoice.id,
      clientId: riya.id,
      sender: "agent",
      content:
        "Hey Riya! Just a quick note — invoice #" +
        riyaInvoice.id.slice(-6).toUpperCase() +
        " for the brand identity project ($4,200) was due last week. I know things get busy — whenever you get a chance to process it, that'd be great. Let me know if you have any questions!",
      status: "auto_sent",
    },
  });

  // Seed trust events that got Riya to score 82
  const riyaEventReasons = [
    { delta: 15, reason: "Freelancer approved draft unedited" },
    { delta: 10, reason: "Client paid on time — positive outcome" },
    { delta: 15, reason: "Freelancer approved draft unedited" },
    { delta: 5, reason: "Freelancer approved draft after editing it" },
    { delta: 10, reason: "Client paid on time — positive outcome" },
    { delta: 15, reason: "Freelancer approved draft unedited" },
    { delta: -10, reason: "Freelancer rejected agent draft entirely" },
    { delta: 15, reason: "Freelancer approved draft unedited" },
    { delta: 5, reason: "Freelancer approved draft after editing it" },
    { delta: 10, reason: "Client paid on time — positive outcome" },
    // Running total from 20: 20+15+10+15+5+10+15-10+15+5+10 = 110 → clamped... recalculate
  ];

  // Simpler: just create a few events that add up correctly from 20 to 82
  const riyaEvents = [
    { delta: 15, reason: "Freelancer approved draft unedited" },
    { delta: 10, reason: "Client paid on time — positive outcome" },
    { delta: 15, reason: "Freelancer approved draft unedited" },
    { delta: 10, reason: "Client paid on time — positive outcome" },
    { delta: 5, reason: "Freelancer approved draft after editing it" },
    { delta: 10, reason: "Client paid on time — positive outcome" },
    { delta: -3, reason: "Score adjustment" }, // 20+15+10+15+10+5+10-3 = 82
  ];

  for (const evt of riyaEvents) {
    await prisma.trustEvent.create({
      data: {
        clientId: riya.id,
        delta: evt.delta,
        reason: evt.reason,
        createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log(`  ✓ Client: ${riya.name} (Level 2, score 82)`);

  // ── Client 2: Dev Studio Co — Level 1, pending negotiation in inbox ────────
  const devStudio = await prisma.client.create({
    data: {
      freelancerId: freelancer.id,
      name: "Dev Studio Co",
      email: "billing@devstudio.co",
      company: "Dev Studio Co",
      trustScore: 55,
      autonomyLevel: 1,
      toneOverride: "firm",
    },
  });

  const devInvoice = await prisma.invoice.create({
    data: {
      clientId: devStudio.id,
      amount: 7800,
      amountPaid: 0,
      description: "Full-stack web application — Phase 2 development",
      dueDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // 18 days overdue
      status: "overdue",
    },
  });

  // Client sent a message asking for a payment plan
  await prisma.message.create({
    data: {
      invoiceId: devInvoice.id,
      clientId: devStudio.id,
      sender: "client",
      content:
        "Hi, we're a bit tight on cash flow right now. Could we do half now ($3,900) and the rest in 30 days? Really appreciate your flexibility.",
      status: "approved_unedited",
    },
  });

  // Agent drafted a negotiation response — awaiting freelancer approval
  await prisma.message.create({
    data: {
      invoiceId: devInvoice.id,
      clientId: devStudio.id,
      sender: "agent",
      content:
        "Thanks for reaching out. I understand cash flow can be challenging. I can work with a split payment — $3,900 now and the remaining $3,900 by " +
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
        }) +
        ". To confirm this arrangement, could you process the first payment today? I'll send a revised payment schedule once that's confirmed.",
      status: "drafted",
    },
  });

  // Trust events that got Dev Studio to 55
  const devEvents = [
    { delta: 15, reason: "Freelancer approved draft unedited" },
    { delta: 10, reason: "Client paid on time — positive outcome" },
    { delta: 5, reason: "Freelancer approved draft after editing it" },
    { delta: 5, reason: "Freelancer approved draft after editing it" },
    // 20+15+10+5+5 = 55
  ];
  for (const evt of devEvents) {
    await prisma.trustEvent.create({
      data: {
        clientId: devStudio.id,
        delta: evt.delta,
        reason: evt.reason,
        createdAt: new Date(Date.now() - Math.random() * 40 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log(`  ✓ Client: ${devStudio.name} (Level 1, score 55 — negotiation pending)`);

  // ── Client 3: Anjali Menon — Level 0, new client, first draft waiting ──────
  const anjali = await prisma.client.create({
    data: {
      freelancerId: freelancer.id,
      name: "Anjali Menon",
      email: "anjali@menondesigns.com",
      trustScore: 20,
      autonomyLevel: 0,
    },
  });

  const anjaliInvoice = await prisma.invoice.create({
    data: {
      clientId: anjali.id,
      amount: 2400,
      amountPaid: 0,
      description: "UX audit and wireframes — e-commerce redesign",
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days overdue
      status: "overdue",
    },
  });

  // First-ever reminder, drafted and waiting for approval
  await prisma.message.create({
    data: {
      invoiceId: anjaliInvoice.id,
      clientId: anjali.id,
      sender: "agent",
      content:
        "Hi Anjali! Hope the project is going well. I wanted to send a quick reminder that invoice #" +
        anjaliInvoice.id.slice(-6).toUpperCase() +
        " for the UX audit ($2,400) was due a few days ago. No rush — just wanted to make sure it didn't slip through. Let me know if you have any questions or need anything from me!",
      status: "drafted",
    },
  });

  console.log(`  ✓ Client: ${anjali.name} (Level 0, score 20 — first draft pending)`);

  // ── Client 4: Kabir Retail — Level 1, escalated dispute ───────────────────
  // Proves the safety net: escalation fires regardless of trust level
  const kabir = await prisma.client.create({
    data: {
      freelancerId: freelancer.id,
      name: "Kabir Retail",
      email: "ops@kabirretail.com",
      company: "Kabir Retail Ltd",
      trustScore: 60,
      autonomyLevel: 1,
    },
  });

  const kabirInvoice = await prisma.invoice.create({
    data: {
      clientId: kabir.id,
      amount: 5500,
      amountPaid: 0,
      description: "Brand campaign creative direction — Q3 launch",
      dueDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days overdue
      status: "disputed",
    },
  });

  // Client sent a message with dispute language
  await prisma.message.create({
    data: {
      invoiceId: kabirInvoice.id,
      clientId: kabir.id,
      sender: "client",
      content:
        "We're not happy with the deliverables and we want a refund. The campaign didn't perform as discussed and we feel we were misled about what was included. We may need to involve our legal team if this isn't resolved.",
      status: "approved_unedited",
    },
  });

  // Agent escalated immediately — did NOT try to handle this autonomously
  await prisma.message.create({
    data: {
      invoiceId: kabirInvoice.id,
      clientId: kabir.id,
      sender: "agent",
      content:
        "Client message contains escalation keywords (refund, legal). This requires your direct attention — do not respond without reviewing. The client is expressing dissatisfaction with deliverables and mentioning a potential refund and legal involvement. This is outside what I can handle autonomously — please respond personally.",
      status: "escalated",
    },
  });

  // Trust events that got Kabir to 60
  const kabirEvents = [
    { delta: 15, reason: "Freelancer approved draft unedited" },
    { delta: 15, reason: "Freelancer approved draft unedited" },
    { delta: 10, reason: "Client paid on time — positive outcome" },
    // 20+15+15+10 = 60
  ];
  for (const evt of kabirEvents) {
    await prisma.trustEvent.create({
      data: {
        clientId: kabir.id,
        delta: evt.delta,
        reason: evt.reason,
        createdAt: new Date(Date.now() - Math.random() * 50 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log(`  ✓ Client: ${kabir.name} (Level 1, score 60 — dispute escalated)`);

  console.log("\n✅ Seed complete. Run 'npm run dev' to start the app.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
