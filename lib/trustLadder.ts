import { prisma } from "./prisma";
import type { AutonomyLevel } from "./types";

// ── Score delta constants ──────────────────────────────────────────────────────
export const TRUST_DELTAS = {
  APPROVED_UNEDITED: 15,
  APPROVED_EDITED: 5,
  REJECTED: -10,
  OVERRIDDEN_AUTO_SEND: -25,
  POSITIVE_OUTCOME: 10,
} as const;

// ── Threshold definitions ─────────────────────────────────────────────────────
export const LEVEL_THRESHOLDS = {
  LEVEL_0_MAX: 39, // 0–39  → Level 0 (Observe only)
  LEVEL_1_MAX: 74, // 40–74 → Level 1 (Soft autonomy)
  // 75–100 → Level 2 (Full autonomy)
} as const;

// ── Pure helpers ──────────────────────────────────────────────────────────────

/** Map a raw score to an autonomy level. */
export function scoreToLevel(score: number): AutonomyLevel {
  if (score <= LEVEL_THRESHOLDS.LEVEL_0_MAX) return 0;
  if (score <= LEVEL_THRESHOLDS.LEVEL_1_MAX) return 1;
  return 2;
}

/** Clamp a score to the valid 0–100 range. */
export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

/** Human-readable label for each level. */
export function levelLabel(level: AutonomyLevel): string {
  const labels: Record<AutonomyLevel, string> = {
    0: "Observe only",
    1: "Soft autonomy",
    2: "Full autonomy",
  };
  return labels[level];
}

// ── Main mutation ─────────────────────────────────────────────────────────────

export interface TrustDeltaResult {
  newScore: number;
  newLevel: AutonomyLevel;
  previousLevel: AutonomyLevel;
  leveledUp: boolean;
  leveledDown: boolean;
  hearingNeeded: boolean;
}

/**
 * Apply a trust delta to a client.
 *
 * - Always updates `trustScore`.
 * - Updates `autonomyLevel` only when `manualOverride` is false.
 * - Persists a `TrustEvent` record.
 * - Returns whether the level changed so the frontend can show a toast.
 */
export async function applyTrustDelta(
  clientId: string,
  delta: number,
  reason: string,
  messageId?: string
): Promise<TrustDeltaResult> {
  // 1. Fetch current client state
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
    select: { trustScore: true, autonomyLevel: true, manualOverride: true },
  });

  const previousLevel = client.autonomyLevel as AutonomyLevel;
  const oldScoreLevel = scoreToLevel(client.trustScore);
  const newScore = clampScore(client.trustScore + delta);
  const proposedLevel = scoreToLevel(newScore);

  // Promotions no longer apply automatically — the court grants them.
  // Demotions (score drops) remain immediate.
  let newLevel: AutonomyLevel;
  if (client.manualOverride) {
    newLevel = previousLevel;
  } else if (proposedLevel < previousLevel) {
    // Immediate demotion
    newLevel = proposedLevel;
  } else {
    // Promotions are held pending a court hearing
    newLevel = previousLevel;
  }

  // A hearing is needed only on a fresh upward crossing and no manual override
  const hearingNeeded =
    !client.manualOverride &&
    proposedLevel > previousLevel &&
    oldScoreLevel < proposedLevel;

  // 3. Persist trust event + update client in a transaction
  await prisma.$transaction([
    prisma.trustEvent.create({
      data: {
        clientId,
        messageId: messageId ?? null,
        delta,
        reason,
      },
    }),
    prisma.client.update({
      where: { id: clientId },
      data: {
        trustScore: newScore,
        // Only change level when not manually overridden
        ...(client.manualOverride ? {} : { autonomyLevel: newLevel }),
      },
    }),
  ]);

  return {
    newScore,
    newLevel,
    previousLevel,
    leveledUp: false, // court grants promotions, not this function
    leveledDown: newLevel < previousLevel,
    hearingNeeded,
  };
}
