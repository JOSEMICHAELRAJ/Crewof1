"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface TrustEvent { id: string; delta: number; reason: string; createdAt: string; scoreAfter: number; }
interface Invoice { id: string; amount: number; amountPaid: number; description: string; status: string; dueDate: string; createdAt: string; }
interface Message { id: string; sender: string; content: string; status: string; createdAt: string; invoice: { id: string; amount: number; description: string; status: string }; }
interface TrustHearing { id: string; triggerReason: string; prosecution: string; defense: string; verdict: string; reasoning: string; conditions: string | null; fromLevel: number; toLevel: number; createdAt: string; }
interface ClientDetail {
  id: string; name: string; email: string; company: string | null;
  trustScore: number; autonomyLevel: number; manualOverride: boolean;
  maxDiscountPctOverride: number | null; maxDelayDaysOverride: number | null; toneOverride: string | null;
  freelancer: { defaultMaxDiscountPct: number; defaultMaxDelayDays: number; defaultTone: string; escalationKeywords: string; };
  invoices: Invoice[]; messages: Message[]; trustEvents: TrustEvent[]; trustSeries: (TrustEvent & { scoreAfter: number })[];
}

const LEVEL_LABEL = ["Observe only", "Soft autonomy", "Full autonomy"];
const LEVEL_COLOR = ["#6b7280", "#ca8a04", "#1a6348"];
const LEVEL_BG    = ["#f3f4f6", "#fef9c3", "#e8f4ef"];

function MiniChart({ series }: { series: { scoreAfter: number }[] }) {
  if (series.length < 2) return <div className="text-xs" style={{ color: "var(--text-muted)" }}>Not enough data yet</div>;
  const W = 240, H = 60, PAD = 8;
  const scores = series.map((s) => s.scoreAfter);
  const minV = 0, maxV = 100;
  const pts = scores.map((v, i) => {
    const x = PAD + (i / (scores.length - 1)) * (W - 2 * PAD);
    const y = PAD + (1 - (v - minV) / (maxV - minV)) * (H - 2 * PAD);
    return `${x},${y}`;
  });
  const last = scores[scores.length - 1];
  return (
    <div>
      <svg width={W} height={H} className="overflow-visible">
        <polyline points={pts.join(" ")} fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeLinejoin="round" />
        {scores.map((v, i) => {
          const [x, y] = pts[i].split(",").map(Number);
          return <circle key={i} cx={x} cy={y} r={2.5} fill="var(--accent)" />;
        })}
      </svg>
      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
        Current score: <span style={{ color: "var(--accent)", fontWeight: 600 }}>{last}</span>
      </p>
    </div>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [overrideLevel, setOverrideLevel] = useState<number | "">("");
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [inv, setInv] = useState({ amount: "", description: "", dueDate: "" });
  const [hearings, setHearings] = useState<TrustHearing[]>([]);
  const [convening, setConvening] = useState(false);

  const load = () =>
    fetch(`/api/clients/${id}`).then((r) => r.json()).then((d) => { setClient(d); setLoading(false); });

  const loadHearings = () =>
    fetch(`/api/clients/${id}/trust-hearings`).then((r) => r.json()).then((d) => { if (Array.isArray(d)) setHearings(d); });

  useEffect(() => { load(); loadHearings(); }, [id]);

  async function handleManualOverride() {
    if (overrideLevel === "") return;
    setSaving(true);
    await fetch(`/api/clients/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autonomyLevel: Number(overrideLevel), manualOverride: true }),
    });
    setSaving(false);
    load();
  }

  async function handleUnpin() {
    setSaving(true);
    await fetch(`/api/clients/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manualOverride: false }),
    });
    setSaving(false);
    load();
  }

  async function createInvoice() {
    if (!inv.amount || !inv.description || !inv.dueDate) return;
    setSaving(true);
    await fetch("/api/invoices", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: id, amount: parseFloat(inv.amount), description: inv.description, dueDate: inv.dueDate, status: "sent" }),
    });
    setSaving(false);
    setShowNewInvoice(false);
    setInv({ amount: "", description: "", dueDate: "" });
    load();
  }

  async function conveneHearing() {
    setConvening(true);
    await fetch(`/api/clients/${id}/trust-hearing`, { method: "POST" });
    setConvening(false);
    load();
    loadHearings();
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="h-8 w-40 rounded animate-pulse mb-4" style={{ background: "var(--border)" }} />
      <div className="h-48 rounded-xl animate-pulse" style={{ background: "var(--border)" }} />
    </div>
  );
  if (!client) return <div className="p-8 text-sm" style={{ color: "var(--text-muted)" }}>Client not found.</div>;

  const statusColor: Record<string, string> = {
    overdue: "#dc2626", disputed: "#dc2626", partial: "#ca8a04",
    sent: "#2563eb", draft: "#9ca3af", paid: "#16a34a",
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Back + header */}
      <Link href="/" className="text-sm mb-4 inline-block" style={{ color: "var(--text-muted)" }}>← Back</Link>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
          {client.company && <p className="text-sm" style={{ color: "var(--text-muted)" }}>{client.company}</p>}
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{client.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-sm font-medium"
            style={{ background: LEVEL_BG[client.autonomyLevel], color: LEVEL_COLOR[client.autonomyLevel] }}>
            L{client.autonomyLevel} — {LEVEL_LABEL[client.autonomyLevel]}
          </span>
          {client.manualOverride && (
            <span className="px-2 py-0.5 rounded text-xs" style={{ background: "#fef3c7", color: "#b45309" }}>Pinned</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Trust chart */}
        <div className="md:col-span-2 rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Trust score over time</p>
          <MiniChart series={client.trustSeries} />
          <div className="mt-3 flex flex-col gap-1 max-h-32 overflow-y-auto">
            {client.trustEvents.slice().reverse().map((e) => (
              <div key={e.id} className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--text-secondary)" }}>{e.reason}</span>
                <span style={{ color: e.delta > 0 ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                  {e.delta > 0 ? "+" : ""}{e.delta}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Manual override */}
        <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Manual override</p>
          <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
            Pin autonomy level regardless of score. Score keeps changing underneath.
          </p>
          <select value={overrideLevel} onChange={(e) => setOverrideLevel(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full text-sm rounded-lg px-3 py-2 mb-2 focus:outline-none"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
            <option value="">Select level…</option>
            <option value="0">L0 — Observe only</option>
            <option value="1">L1 — Soft autonomy</option>
            <option value="2">L2 — Full autonomy</option>
          </select>
          <button disabled={overrideLevel === "" || saving} onClick={handleManualOverride}
            className="w-full py-2 rounded-lg text-sm font-medium text-white mb-2"
            style={{ background: "var(--accent)", opacity: overrideLevel === "" ? 0.5 : 1 }}>
            Pin level
          </button>
          {client.manualOverride && (
            <button onClick={handleUnpin} className="w-full py-2 rounded-lg text-sm"
              style={{ color: "var(--text-secondary)", background: "var(--bg)", border: "1px solid var(--border)" }}>
              Unpin (let score decide)
            </button>
          )}
        </div>
      </div>

      {/* Invoices */}
      <div className="rounded-xl mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <p className="text-sm font-semibold">Invoices</p>
          <button onClick={() => setShowNewInvoice(!showNewInvoice)}
            className="text-xs px-3 py-1 rounded-lg font-medium text-white"
            style={{ background: "var(--accent)" }}>+ New</button>
        </div>
        {showNewInvoice && (
          <div className="px-5 py-4 flex gap-2 flex-wrap items-end" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
            <input placeholder="Description" value={inv.description} onChange={(e) => setInv({ ...inv, description: e.target.value })}
              className="flex-1 min-w-32 text-sm px-3 py-2 rounded-lg focus:outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
            <input placeholder="Amount" type="number" value={inv.amount} onChange={(e) => setInv({ ...inv, amount: e.target.value })}
              className="w-28 text-sm px-3 py-2 rounded-lg focus:outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
            <input type="date" value={inv.dueDate} onChange={(e) => setInv({ ...inv, dueDate: e.target.value })}
              className="text-sm px-3 py-2 rounded-lg focus:outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
            <button onClick={createInvoice} disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: "var(--accent)" }}>Save</button>
          </div>
        )}
        {client.invoices.length === 0 ? (
          <p className="px-5 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>No invoices yet.</p>
        ) : (
          client.invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: "1px solid var(--border)" }}>
              <div>
                <p className="text-sm font-medium">{inv.description}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Due {new Date(inv.dueDate).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">${inv.amount.toLocaleString()}</p>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ color: statusColor[inv.status] ?? "#6b7280", background: (statusColor[inv.status] ?? "#6b7280") + "18" }}>
                  {inv.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Message history */}
      <div className="rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="px-5 py-3 text-sm font-semibold" style={{ borderBottom: "1px solid var(--border)" }}>
          Message history
        </p>
        {client.messages.length === 0 ? (
          <p className="px-5 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>No messages yet.</p>
        ) : (
          client.messages.map((m) => (
            <div key={m.id} className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold capitalize"
                  style={{ color: m.sender === "agent" ? "var(--accent)" : m.sender === "client" ? "#2563eb" : "var(--text-secondary)" }}>
                  {m.sender}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: "var(--bg)", color: "var(--text-muted)" }}>{m.status}</span>
                <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>
                  {new Date(m.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>{m.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Trust Court */}
      <div className="rounded-xl mt-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <p className="text-sm font-semibold">Trust Court</p>
          <button onClick={conveneHearing} disabled={convening}
            className="text-xs px-3 py-1 rounded-lg font-medium text-white"
            style={{ background: "var(--accent)", opacity: convening ? 0.6 : 1 }}>
            {convening ? "Convening…" : "Convene court"}
          </button>
        </div>
        {hearings.length === 0 ? (
          <p className="px-5 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>No hearings yet.</p>
        ) : (() => {
          const h = hearings[0];
          const verdictColors: Record<string, { bg: string; color: string }> = {
            PROMOTE: { bg: "#e8f4ef", color: "#1a6348" },
            HOLD: { bg: "#fef9c3", color: "#b45309" },
            DEMOTE: { bg: "#fee2e2", color: "#dc2626" },
          };
          const vc = verdictColors[h.verdict] ?? { bg: "#f3f4f6", color: "#6b7280" };
          return (
            <div className="px-5 py-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-full text-sm font-bold"
                  style={{ background: vc.bg, color: vc.color }}>{h.verdict}</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  L{h.fromLevel} → L{h.toLevel} · {new Date(h.createdAt).toLocaleDateString()} · {h.triggerReason}
                </span>
              </div>
              <p className="text-sm mb-4" style={{ color: "var(--text-primary)" }}>{h.reasoning}</p>
              {h.conditions && (
                <p className="text-xs mb-4 px-3 py-2 rounded-lg italic"
                  style={{ background: "var(--bg)", color: "var(--text-secondary)" }}>Conditions: {h.conditions}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg p-3" style={{ background: "#fee2e220", border: "1px solid #fca5a520" }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: "#dc2626" }}>⚖ Prosecutor</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{h.prosecution}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: "#e8f4ef20", border: "1px solid #6ee7b720" }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: "#1a6348" }}>🛡 Defender</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{h.defense}</p>
                </div>
              </div>
              {hearings.length > 1 && (
                <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
                  + {hearings.length - 1} earlier hearing{hearings.length > 2 ? "s" : ""}
                </p>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
