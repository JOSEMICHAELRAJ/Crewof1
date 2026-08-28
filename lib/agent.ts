import 'dotenv/config';
import OpenAI from 'openai';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const MODEL = 'openai/gpt-oss-120b';

// ---------- TYPES ----------

export type SituationType = 'routine' | 'negotiation' | 'dispute';

export type Decision =
  | { action: 'AUTO_SEND'; draftedMessage: string }
  | { action: 'DRAFT_FOR_APPROVAL'; draftedMessage: string }
  | { action: 'ESCALATE'; reason: string };

interface ClientContext {
  id: string;
  name: string;
  autonomyLevel: 0 | 1 | 2;
  toneOverride: string | null;
  maxDiscountPctOverride: number | null;
  maxDelayDaysOverride: number | null;
}

interface FreelancerContext {
  name: string;
  defaultTone: string;
  defaultMaxDiscountPct: number;
  defaultMaxDelayDays: number;
  escalationKeywords: string; // comma-separated
}

interface InvoiceContext {
  id: string;
  amount: number;
  amountPaid: number;
  dueDate: Date;
  description: string;
}

// ---------- LOW-LEVEL LLM CALL ----------

async function draftMessage(systemPrompt: string, userPrompt: string): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 400,
  });

  return completion.choices[0]?.message?.content?.trim() ?? '';
}

// ---------- SYSTEM PROMPT ----------

function buildSystemPrompt(tone: string): string {
  return `You are "Collect," an AI assistant that helps freelancers get paid without damaging their client relationships. You write messages ON BEHALF OF the freelancer, in first person, as if the freelancer wrote it themselves.

Core behavioral rules:
- Always assume good faith from the client. Never accuse, guilt-trip, or use aggressive/threatening language.
- Escalate firmness gradually. A first reminder should be light and friendly. A second follow-up can be a bit more direct. Never jump straight to a firm tone unless explicitly told this is a later-stage message.
- When negotiating a delay or partial payment, always try to secure something concrete — a specific new date or a specific partial amount — never accept an open-ended "whenever works."
- Keep messages short. 3-5 sentences max. This is a message between two people who know each other, not a formal notice.
- Sign off naturally (e.g. "Thanks so much," or "Appreciate it,") — never sound like a collections agency or automated system.
- Tone for this message should be: ${tone}.

Output ONLY the message text. No preamble, no explanation, no quotation marks around it.`;
}

// ---------- SITUATION CLASSIFICATION ----------

export function classifySituation(
  clientMessage: string | undefined,
  freelancer: FreelancerContext
): SituationType {
  if (!clientMessage) return 'routine';

  const keywords = freelancer.escalationKeywords
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  const lowerMessage = clientMessage.toLowerCase();
  const hasEscalationKeyword = keywords.some((kw) => lowerMessage.includes(kw));

  if (hasEscalationKeyword) return 'dispute';

  // Simple heuristic for negotiation — expand this if needed
  const negotiationSignals = ['partial', 'delay', 'later', 'next month', 'discount', 'extension', 'installment'];
  const looksLikeNegotiation = negotiationSignals.some((sig) => lowerMessage.includes(sig));

  return looksLikeNegotiation ? 'negotiation' : 'routine';
}

// ---------- MESSAGE GENERATION (builds prompt from real data) ----------

function daysOverdue(dueDate: Date): number {
  const diffMs = Date.now() - new Date(dueDate).getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export async function generateAgentMessage(
  client: ClientContext,
  freelancer: FreelancerContext,
  invoice: InvoiceContext,
  situationType: SituationType,
  clientMessage?: string
): Promise<string> {
  const tone = client.toneOverride ?? freelancer.defaultTone;
  const systemPrompt = buildSystemPrompt(tone);

  const overdueDays = daysOverdue(invoice.dueDate);
  const remainingAmount = invoice.amount - invoice.amountPaid;

  const userPrompt = `
Client name: ${client.name}
Invoice: ${invoice.description}
Amount owed: $${remainingAmount.toFixed(2)} (of $${invoice.amount.toFixed(2)} total)
Days overdue: ${overdueDays}
Situation type: ${situationType}
${clientMessage ? `The client just said: "${clientMessage}"\n\nWrite a reply that responds directly to what they said.` : 'Write a payment reminder message.'}
${situationType === 'negotiation' ? `\nYou may agree to a delay of up to ${client.maxDelayDaysOverride ?? freelancer.defaultMaxDelayDays} days or a discount of up to ${client.maxDiscountPctOverride ?? freelancer.defaultMaxDiscountPct}% if it helps close this out. Try to get a specific commitment.` : ''}
`.trim();

  return draftMessage(systemPrompt, userPrompt);
}

// ---------- DECISION LOGIC ----------

interface NegotiationTerms {
  requestedDiscountPct?: number;
  requestedDelayDays?: number;
}

function withinBoundaries(client: ClientContext, freelancer: FreelancerContext, terms: NegotiationTerms): boolean {
  const maxDiscount = client.maxDiscountPctOverride ?? freelancer.defaultMaxDiscountPct;
  const maxDelay = client.maxDelayDaysOverride ?? freelancer.defaultMaxDelayDays;

  if (terms.requestedDiscountPct !== undefined && terms.requestedDiscountPct > maxDiscount) return false;
  if (terms.requestedDelayDays !== undefined && terms.requestedDelayDays > maxDelay) return false;

  return true;
}

export async function decideAction(
  client: ClientContext,
  freelancer: FreelancerContext,
  invoice: InvoiceContext,
  situationType: SituationType,
  clientMessage?: string,
  negotiationTerms: NegotiationTerms = {}
): Promise<Decision> {
  // Rule 1: disputes ALWAYS escalate, no matter the trust level. No exceptions.
  if (situationType === 'dispute') {
    return {
      action: 'ESCALATE',
      reason: `Client message contains language matching escalation keywords. Requires human review regardless of trust level.`,
    };
  }

  // Rule 2: routine reminders
  if (situationType === 'routine') {
    const draftedMessage = await generateAgentMessage(client, freelancer, invoice, situationType, clientMessage);
    return client.autonomyLevel >= 1
      ? { action: 'AUTO_SEND', draftedMessage }
      : { action: 'DRAFT_FOR_APPROVAL', draftedMessage };
  }

  // Rule 3: negotiation
  if (situationType === 'negotiation') {
    const draftedMessage = await generateAgentMessage(client, freelancer, invoice, situationType, clientMessage);
    // Only auto-send if explicit terms were provided AND they're within boundaries.
    // Without explicit terms we can't verify boundaries, so always draft for approval.
    const hasExplicitTerms =
      negotiationTerms.requestedDiscountPct !== undefined ||
      negotiationTerms.requestedDelayDays !== undefined;
    const inBounds = withinBoundaries(client, freelancer, negotiationTerms);

    return client.autonomyLevel === 2 && hasExplicitTerms && inBounds
      ? { action: 'AUTO_SEND', draftedMessage }
      : { action: 'DRAFT_FOR_APPROVAL', draftedMessage };
  }

  // Fallback (shouldn't be reached)
  return {
    action: 'DRAFT_FOR_APPROVAL',
    draftedMessage: await generateAgentMessage(client, freelancer, invoice, 'routine', clientMessage),
  };
}