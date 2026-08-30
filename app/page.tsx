"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  email: string;
  company: string | null;
  trustScore: number;
  autonomyLevel: 0 | 1 | 2;
  outstanding: number;
  pendingDrafts: number;
  lastInvoiceStatus: string | null;
  lastInvoiceDueDate: string | null;
  createdAt: string;
}

const LEVEL_LABEL = ["Observe only", "Soft autonomy", "Full autonomy"];
const LEVEL_COLOR = ["#6b7280", "#ca8a04", "#1a6348"];
const LEVEL_BG    = ["#f3f4f6", "#fef9c3", "#e8f4ef"];

function TrustBar({ score, level }: { score: number; level: number }) {
  // 3 segments, one per level. Fill is how far into the current segment.
  const segments = [
    { max: 39, label: "L0" },
    { max: 74, label: "L1" },
    { max: 100, label: "L2" },
  ];
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5 flex-1" style={{ height: 6 }}>
        {segments.map((seg, i) => {
          const segMin = i === 0 ? 0 : segments[i - 1].max + 1;
          const segMax = seg.max;
          const segRange = segMax - segMin;
          let fill = 0;
          if (score > segMax) fill = 1;
          else if (score >= segMin) fill = (score - segMin) / segRange;
          return (
            <div key={i} className="flex-1 rounded-full overflow-hidden"
              style={{ background: "var(--border)" }}>
              <div style={{
                width: `${fill * 100}%`,
                height: "100%",
                background: i <= level ? LEVEL_COLOR[level] : "var(--border-strong)",
                transition: "width 0.4s ease",
              }} />
            </div>
          );
        })}
      </div>
      <span className="text-xs font-mono" style={{ color: LEVEL_COLOR[level], minWidth: 24 }}>
        {score}
      </span>
    </div>
  );
}

function StatusDot({ status }: { status: string | null }) {
  const map: Record<string, { color: string; label: string }> = {
    overdue:  { color: "#dc2626", label: "Overdue" },
    disputed: { color: "#dc2626", label: "Disputed" },
    partial:  { color: "#ca8a04", label: "Partial" },
    sent:     { color: "#2563eb", label: "Sent" },
    draft:    { color: "#9ca3af", label: "Draft" },
    paid:     { color: "#16a34a", label: "Paid" },
  };
  const s = map[status ?? ""] ?? { color: "#9ca3af", label: status ?? "—" };
  return (
    <span className="flex items-center gap-1 text-xs" style={{ color: s.color }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, display: "inline-block" }} />
      {s.label}
    </span>
  );
}

function ClientCard({ c }: { c: Client }) {
  return (
    <Link href={`/clients/${c.id}`} className="block rounded-xl p-5 transition-shadow hover:shadow-md"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{c.name}</p>
          {c.company && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{c.company}</p>}
        </div>
        <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ background: LEVEL_BG[c.autonomyLevel], color: LEVEL_COLOR[c.autonomyLevel] }}>
          L{c.autonomyLevel} — {LEVEL_LABEL[c.autonomyLevel]}
        </span>
      </div>

      <TrustBar score={c.trustScore} level={c.autonomyLevel} />

      <div className="flex items-center justify-between mt-3 pt-3"
        style={{ borderTop: "1px solid var(--border)" }}>
        <div>
          {c.outstanding > 0
            ? <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                ${c.outstanding.toLocaleString()} outstanding
              </p>
            : <p className="text-xs" style={{ color: "var(--text-muted)" }}>No outstanding balance</p>
          }
          <div className="flex items-center gap-2 mt-0.5">
            <StatusDot status={c.lastInvoiceStatus} />
            {c.lastInvoiceDueDate && c.lastInvoiceStatus === "overdue" && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {Math.floor((Date.now() - new Date(c.lastInvoiceDueDate).getTime()) / 86400000)}d overdue
              </span>
            )}
          </div>
        </div>
        {c.pendingDrafts > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: "#fef3c7", color: "#b45309" }}>
            {c.pendingDrafts} draft{c.pendingDrafts > 1 ? "s" : ""} waiting
          </span>
        )}
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => { setClients(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalOutstanding = clients.reduce((s, c) => s + c.outstanding, 0);
  const totalDrafts = clients.reduce((s, c) => s + c.pendingDrafts, 0);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Clients
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Your agent is managing {clients.length} client relationship{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Outstanding</p>
            <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              ${totalOutstanding.toLocaleString()}
            </p>
          </div>
          {totalDrafts > 0 && (
            <Link href="/inbox" className="text-right">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Awaiting review</p>
              <p className="text-lg font-bold" style={{ color: "#b45309" }}>{totalDrafts} drafts</p>
            </Link>
          )}
        </div>
      </div>

      {/* Trust level legend */}
      <div className="flex gap-3 mb-6">
        {LEVEL_LABEL.map((label, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
            style={{ background: LEVEL_BG[i], color: LEVEL_COLOR[i] }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: LEVEL_COLOR[i], display: "inline-block" }} />
            L{i} {label}
          </div>
        ))}
      </div>

      {/* Client grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 rounded-xl animate-pulse"
              style={{ background: "var(--border)" }} />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>
          <p className="text-4xl mb-3">◆</p>
          <p className="text-sm">No clients yet.</p>
          <Link href="/clients/new" className="inline-block mt-3 text-sm font-medium"
            style={{ color: "var(--accent)" }}>Add your first client →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {clients.map((c) => <ClientCard key={c.id} c={c} />)}
        </div>
      )}
    </div>
  );
}
