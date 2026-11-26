import OpenAI from 'openai';
import { prisma } from './prisma';
import { scoreToLevel, TRUST_DELTAS } from './trustLadder';
import type { AutonomyLevel } from './types';

// ── Groq client (same pattern as lib/agent.ts) ────────────────────────────────
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const AGENT_MODEL = 'openai/gpt-oss-120b'; // 20b produces empty responses; using 120b for all agents
const JUDGE_MODEL = 'openai/gpt-oss-120b';

// ── Evidence types ────────────────────────────────────────────────────────────

interface InvoiceEvidence {
  id: string;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: string;
  daysLate: number | null;
  daysOverdue: number | null;
}

export interface EvidencePacket {
  currentScore: number;
  currentLevel: number;
  scoreLevel: number;
  trustEvents: { delta: number; reason: string; createdAt: string }[];
  messageStats: {
    approved_unedited: number;
    approved_edited: number;
    rejected: number;
    auto_sent: number;
    escalated: number;
  };
  overrideCount: number;
  invoices: InvoiceEvidence[];
  paidInvoiceCount: number;
  avgDaysLate: number;
  unpaidOverdueCount: number;
  escalationCount: number;
}

// ── 3a. buildEvidencePacket ───────────────────────────────────────────────────

export async function buildEvidencePacket(clientId: string): Promise<EvidencePacket> {
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
    select: {
      trustScore: true,
      autonomyLevel: true,
      trustEvents: {
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: { delta: true, reason: true, createdAt: true },
      },
      messages: {
        where: { sender: 'agent' },
        select: { status: true },
      },
      invoices: {
        select: {
          id: true,
          amount: true,
          dueDate: true,
          paidAt: true,
          status: true,
        },
      },
    },
  });

  const currentScore = client.trustScore;
  const currentLevel = client.autonomyLevel;
  const scoreLevel = scoreToLevel(currentScore);

  const trustEvents = client.trustEvents.map((e) => ({
    delta: e.delta,
    reason: e.reason,
    createdAt: e.createdAt.toISOString(),
  }));

  // Message stats
  const messageStats = {
    approved_unedited: 0,
    approved_edited: 0,
    rejected: 0,
    auto_sent: 0,
    escalated: 0,
  };
  for (const m of client.messages) {
    const s = m.status as keyof typeof messageStats;
    if (s in messageStats) messageStats[s]++;
  }

  // Override count
  const overrideCount = client.trustEvents.filter(
    (e) => e.delta === TRUST_DELTAS.OVERRIDDEN_AUTO_SEND
  ).length;

  // Invoice evidence
  const now = Date.now();
  const invoices: InvoiceEvidence[] = client.invoices.map((inv) => {
    const dueMs = new Date(inv.dueDate).getTime();
    let daysLate: number | null = null;
    let daysOverdue: number | null = null;

    if (inv.paidAt) {
      const paidMs = new Date(inv.paidAt).getTime();
      daysLate = Math.floor((paidMs - dueMs) / (1000 * 60 * 60 * 24));
    } else if (inv.status !== 'paid' && now > dueMs) {
      daysOverdue = Math.floor((now - dueMs) / (1000 * 60 * 60 * 24));
    }

    return {
      id: inv.id,
      amount: inv.amount,
      dueDate: inv.dueDate.toISOString(),
      paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
      status: inv.status,
      daysLate,
      daysOverdue,
    };
  });

  const paidInvoices = invoices.filter((i) => i.paidAt !== null);
  const paidInvoiceCount = paidInvoices.length;
  const avgDaysLate =
    paidInvoiceCount > 0
      ? paidInvoices.reduce((sum, i) => sum + (i.daysLate ?? 0), 0) / paidInvoiceCount
      : 0;
  const unpaidOverdueCount = invoices.filter((i) => i.daysOverdue !== null).length;
  const escalationCount = messageStats.escalated;

  return {
    currentScore,
    currentLevel,
    scoreLevel,
    trustEvents,
    messageStats,
    overrideCount,
    invoices,
    paidInvoiceCount,
    avgDaysLate,
    unpaidOverdueCount,
    escalationCount,
  };
}

// ── 3b. Agent calls ───────────────────────────────────────────────────────────

async function callAgent(
  systemPrompt: string,
  userContent: string,
  model: string,
  maxTokens = 300
): Promise<string> {
  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.4,
    max_tokens: maxTokens,
  });
  return completion.choices[0]?.message?.content?.trim() ?? '';
}

const PROSECUTOR_SYSTEM = `You are the Prosecutor in a Trust Court hearing. Your job is to argue AGAINST raising this client's autonomy level. Cite only facts present in the evidence JSON provided. Write 4-6 sentences. If the evidence is strongly positive, focus only on residual risk and uncertainty. Never invent facts.`;

const DEFENDER_SYSTEM = `You are the Defender in a Trust Court hearing. Your job is to argue FOR raising this client's autonomy level. Cite only facts present in the evidence JSON provided. Write 4-6 sentences. Never invent facts.`;

function buildJudgeSystem(): string {
  return `You are the Judge in a Trust Court hearing. You have received evidence about a client's payment and communication behavior, and arguments from both a Prosecutor and a Defender. You must decide whether to PROMOTE, HOLD, or DEMOTE the client's autonomy level.

Rules:
- For brand-new clients with thin payment history, that alone is not evidence of risk — judge mainly on approval behavior.
- Base your verdict strictly on the evidence provided.
- Return ONLY valid JSON on a single line in this exact format (no code fences, no extra text, no newlines inside the JSON):
{"verdict":"PROMOTE","reasoning":"2-4 sentences","conditions":"optional or omit field"}
Verdict must be exactly one of: PROMOTE, HOLD, DEMOTE. Keep reasoning under 200 characters.`;
}

// ── 3c. enforceVerdictRules ───────────────────────────────────────────────────

interface VerdictResult {
  verdict: 'PROMOTE' | 'HOLD' | 'DEMOTE';
  reasoning: string;
  conditions?: string;
}

export function enforceVerdictRules(
  result: VerdictResult,
  evidence: EvidencePacket,
  fromLevel: number
): VerdictResult {
  let { verdict, reasoning, conditions } = result;

  function override(reason: string) {
    if (verdict !== 'HOLD') {
      verdict = 'HOLD';
      reasoning = reasoning + ` Rule override: ${reason}.`;
    }
  }

  if (verdict === 'DEMOTE') {
    if (fromLevel <= 0) {
      verdict = 'HOLD';
      reasoning = reasoning + ` Rule override: cannot demote below Level 0.`;
    }
  }

  if (verdict === 'PROMOTE') {
    // Score band must actually be higher than current level
    if (evidence.scoreLevel <= evidence.currentLevel) {
      override('score band must be higher than current level for PROMOTE');
    }

    // Level 1 requires at least 2 approvals total
    const toLevel = fromLevel + 1;
    if (toLevel === 1) {
      const totalApproved =
        evidence.messageStats.approved_unedited + evidence.messageStats.approved_edited;
      if (totalApproved < 2) {
        override('PROMOTE to Level 1 requires approved_unedited + approved_edited >= 2');
      }
    }

    // Level 2 requires 3+ unedited approvals AND at least 1 paid invoice
    if (toLevel === 2) {
      if (evidence.messageStats.approved_unedited < 3) {
        override('PROMOTE to Level 2 requires approved_unedited >= 3');
      } else if (evidence.paidInvoiceCount < 1) {
        override('PROMOTE to Level 2 requires paidInvoiceCount >= 1');
      }
    }

    // Block promotion if too many overdue or consistently late
    if (verdict === 'PROMOTE' && evidence.unpaidOverdueCount >= 2) {
      override('blocked: unpaidOverdueCount >= 2');
    }
    if (verdict === 'PROMOTE' && evidence.avgDaysLate > 14) {
      override('blocked: avgDaysLate > 14');
    }
  }

  return { verdict, reasoning, conditions };
}

// ── 3d. convene ───────────────────────────────────────────────────────────────

export interface HearingResult {
  hearing: {
    id: string;
    clientId: string;
    triggerReason: string;
    evidenceJson: string;
    prosecution: string;
    defense: string;
    verdict: string;
    reasoning: string;
    conditions: string | null;
    fromLevel: number;
    toLevel: number;
    createdAt: Date;
  };
  leveledUp: boolean;
  leveledDown: boolean;
}

export async function convene(
  clientId: string,
  triggerReason: string
): Promise<HearingResult> {
  // 1. Build evidence
  const evidence = await buildEvidencePacket(clientId);
  const evidenceStr = JSON.stringify(evidence, null, 2);

  const fromLevel = evidence.currentLevel;

  // 2. Run Prosecutor and Defender in parallel
  let prosecution = '';
  let defense = '';

  try {
    [prosecution, defense] = await Promise.all([
      callAgent(PROSECUTOR_SYSTEM, `Evidence:\n${evidenceStr}`, AGENT_MODEL).catch(async (e) => {
        // Fallback to 120b if 20b not found
        if (String(e).includes('model_not_found') || String(e).includes('404')) {
          return callAgent(PROSECUTOR_SYSTEM, `Evidence:\n${evidenceStr}`, JUDGE_MODEL);
        }
        throw e;
      }),
      callAgent(DEFENDER_SYSTEM, `Evidence:\n${evidenceStr}`, AGENT_MODEL).catch(async (e) => {
        if (String(e).includes('model_not_found') || String(e).includes('404')) {
          return callAgent(DEFENDER_SYSTEM, `Evidence:\n${evidenceStr}`, JUDGE_MODEL);
        }
        throw e;
      }),
    ]);
  } catch (e) {
    prosecution = prosecution || 'Prosecution unavailable due to API error.';
    defense = defense || 'Defense unavailable due to API error.';
  }

  // Guard against empty agent responses
  if (!prosecution) prosecution = 'Prosecution unavailable (empty response from model).';
  if (!defense) defense = 'Defense unavailable (empty response from model).';

  // 3. Judge
  let judgeResult: VerdictResult = {
    verdict: 'HOLD',
    reasoning: 'Default HOLD due to judge parse failure.',
    conditions: undefined,
  };

  try {
    const judgeUserContent = `Evidence:\n${evidenceStr}\n\nProsecution argument:\n${prosecution}\n\nDefense argument:\n${defense}\n\nReturn your verdict as JSON only.`;
    const judgeRaw = await callAgent(buildJudgeSystem(), judgeUserContent, JUDGE_MODEL, 600);

    // Strip code fences defensively
    const cleaned = judgeRaw
      .replace(/```(?:json)?/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    if (
      parsed.verdict === 'PROMOTE' ||
      parsed.verdict === 'HOLD' ||
      parsed.verdict === 'DEMOTE'
    ) {
      judgeResult = {
        verdict: parsed.verdict,
        reasoning: String(parsed.reasoning ?? ''),
        conditions: parsed.conditions ? String(parsed.conditions) : undefined,
      };
    } else {
      judgeResult = {
        verdict: 'HOLD',
        reasoning: `Judge returned unexpected verdict "${parsed.verdict}". Defaulting to HOLD.`,
      };
    }
  } catch (e) {
    judgeResult = {
      verdict: 'HOLD',
      reasoning: `Judge failed to respond or returned unparseable output: ${String(e).slice(0, 200)}`,
    };
  }

  // 4. Enforce rules
  const enforced = enforceVerdictRules(judgeResult, evidence, fromLevel);

  // 5. Compute resulting level
  let toLevel = fromLevel;
  if (enforced.verdict === 'PROMOTE') toLevel = Math.min(2, fromLevel + 1);
  if (enforced.verdict === 'DEMOTE') toLevel = Math.max(0, fromLevel - 1);

  // 6. Persist hearing
  const hearing = await prisma.trustHearing.create({
    data: {
      clientId,
      triggerReason,
      evidenceJson: evidenceStr,
      prosecution,
      defense,
      verdict: enforced.verdict,
      reasoning: enforced.reasoning,
      conditions: enforced.conditions ?? null,
      fromLevel,
      toLevel,
    },
  });

  // 7. Apply level change if warranted
  if (enforced.verdict === 'PROMOTE') {
    await prisma.client.update({
      where: { id: clientId },
      data: { autonomyLevel: toLevel },
    });
  } else if (enforced.verdict === 'DEMOTE') {
    await prisma.client.update({
      where: { id: clientId },
      data: { autonomyLevel: toLevel },
    });
  }

  return {
    hearing,
    leveledUp: enforced.verdict === 'PROMOTE',
    leveledDown: enforced.verdict === 'DEMOTE',
  };
}
