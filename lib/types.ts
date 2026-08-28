// Shared TypeScript types for Collect

export type TonePreference = "friendly" | "firm" | "formal";

export type MessageSender = "agent" | "freelancer" | "client";

export type MessageStatus =
  | "drafted"
  | "approved_unedited"
  | "approved_edited"
  | "rejected"
  | "auto_sent"
  | "escalated";

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "overdue"
  | "partial"
  | "disputed"
  | "paid";

export type AutonomyLevel = 0 | 1 | 2;

export type SituationType = "routine" | "negotiation" | "dispute";

export type Decision =
  | { action: "AUTO_SEND"; draftedMessage: string }
  | { action: "DRAFT_FOR_APPROVAL"; draftedMessage: string }
  | { action: "ESCALATE"; reason: string };

export interface ClientBoundaries {
  maxDiscountPct: number;
  maxDelayDays: number;
  tone: TonePreference;
  escalationKeywords: string[];
}

export interface AgentContext {
  clientName: string;
  clientEmail: string;
  autonomyLevel: AutonomyLevel;
  trustScore: number;
  invoiceAmount: number;
  invoiceDescription: string;
  daysOverdue: number;
  invoiceStatus: InvoiceStatus;
  tone: TonePreference;
  boundaries: ClientBoundaries;
  clientMessage?: string;
  messageSequenceNumber?: number; // how many agent messages have been sent already (for escalating firmness)
}
