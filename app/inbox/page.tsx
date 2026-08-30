"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface InboxMessage {
  id: string;
  content: string;
  status: string;
  sender: string;
  createdAt: string;
  daysOverdue: number;
  client: { id: string; name: string; trustScore: number; autonomyLevel: number };
  invoice: { id: string; amount: number; amountPaid: number; description: string; status: string; dueDate: string };
}

interface LevelUpToast {
  clientName: string;
  newLevel: number;
  newScore: number;
}

const LEVEL_LABEL = ["Observe only", "Soft autonomy", "Full autonomy"];
const LEVEL_COLOR = ["#6b7280", "#ca8a04", "#1a6348"];

export default function InboxPage() {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [working, setWorking] = useState<string | null>(null);
  const [toast, setToast] = useState<LevelUpToast | null>(null);

  const load = () => {
    // Fetch both drafted (pending approval) and escalated (flagged) messages
    Promise.all([
      fetch("/api/messages?status=drafted").then((r) => r.json()),
      fetch("/api/messages?status=escalated").then((r) => r.json()),
    ]).then(([drafted, escalated]) => {
      setMessages([...escalated, ...drafted]);
      setLoading(false);
    });
  };
  useEffect(load, []);

  async function handleApprove(msg: InboxMessage, edited?: string) {
    setWorking(msg.id);
    const body = edited ? { editedContent: edited } : {};
    const r = await fetch(`/api/messages/${msg.id}/approve`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (data.leveledUp) {
      setToast({ clientName: msg.client.name, newLevel: data.newLevel, newScore: data.newScore });
      setTimeout(() => setToast(null), 4000);
    }
    setEditingId(null);
    setWorking(null);
    load();
  }

  async function handleReject(id: string) {
    setWorking(id);
    await fetch(`/api/messages/${id}/reject`, { method: "POST" });
    setWorking(null);
    load();
  }

  const escalated = messages.filter((m) => m.status === "escalated");
  const drafted = messages.filter((m) => m.status === "drafted");

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Level-up toast */}
      {toast && (
        <div className="fixed top-16 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white"
          style={{ background: "var(--accent)", maxWidth: 320 }}>
          🎉 {toast.clientName} reached Level {toast.newLevel} — {LEVEL_LABEL[toast.newLevel]}!
          <span className="block text-xs mt-0.5 opacity-80">Trust score: {toast.newScore}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agent Inbox</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Messages drafted by Collect waiting for your review
          </p>
        </div>
        {drafted.length > 0 && (
          <span className="px-3 py-1 rounded-full text-sm font-medium"
            style={{ background: "#fef3c7", color: "#b45309" }}>
            {drafted.length} pending
          </span>
        )}
      </div>

      {/* Escalated — always show first */}
      {escalated.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#dc2626" }}>
            ⚠ Escalated — requires your attention
          </p>
          <div className="flex flex-col gap-3">
            {escalated.map((m) => (
              <div key={m.id} className="rounded-xl p-5"
                style={{ background: "#fff5f5", border: "1px solid #fecaca" }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <Link href={`/clients/${m.client.id}`} className="font-semibold text-sm hover:underline"
                    style={{ color: "var(--text-primary)" }}>
                    {m.client.name}
                  </Link>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "#fee2e2", color: "#dc2626" }}>Escalated</span>
                </div>
                <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                  Invoice ${m.invoice.amount.toLocaleString()} · {m.invoice.description}
                  {m.daysOverdue > 0 ? ` · ${m.daysOverdue}d overdue` : ""}
                </p>
                <p className="text-sm p-3 rounded-lg" style={{ background: "#fee2e2", color: "#7f1d1d" }}>
                  {m.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drafted — awaiting approval */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => <div key={i} className="h-48 rounded-xl animate-pulse" style={{ background: "var(--border)" }} />)}
        </div>
      ) : drafted.length === 0 && escalated.length === 0 ? (
        <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>
          <p className="text-4xl mb-3">✓</p>
          <p className="text-sm">Inbox is clear.</p>
          <p className="text-xs mt-1">Collect will draft new messages as invoices become overdue.</p>
        </div>
      ) : drafted.length === 0 ? null : (
        <div className="flex flex-col gap-4">
          {drafted.map((m) => {
            const isEditing = editingId === m.id;
            const busy = working === m.id;
            return (
              <div key={m.id} className="rounded-xl p-5"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                {/* Client + context */}
                <div className="flex items-start justify-between gap-3 mb-1">
                  <Link href={`/clients/${m.client.id}`}
                    className="font-semibold text-sm hover:underline" style={{ color: "var(--text-primary)" }}>
                    {m.client.name}
                  </Link>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                    L{m.client.autonomyLevel} · {m.client.trustScore} pts
                  </span>
                </div>
                <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                  Invoice ${m.invoice.amount.toLocaleString()} · {m.invoice.description}
                  {m.daysOverdue > 0 ? ` · ${m.daysOverdue}d overdue` : ""}
                </p>

                {/* Draft message */}
                {isEditing ? (
                  <textarea
                    className="w-full text-sm rounded-lg p-3 resize-none focus:outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--accent)", color: "var(--text-primary)", minHeight: 120 }}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={5}
                  />
                ) : (
                  <div className="text-sm p-3 rounded-lg whitespace-pre-wrap"
                    style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
                    {m.content}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  {isEditing ? (
                    <>
                      <button disabled={busy}
                        onClick={() => handleApprove(m, editContent)}
                        className="px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-opacity"
                        style={{ background: "var(--accent)", opacity: busy ? 0.6 : 1 }}>
                        {busy ? "Sending…" : "Send edited"}
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="px-4 py-1.5 rounded-lg text-sm"
                        style={{ color: "var(--text-secondary)", background: "var(--bg)" }}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button disabled={busy}
                        onClick={() => handleApprove(m)}
                        className="px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-opacity"
                        style={{ background: "var(--accent)", opacity: busy ? 0.6 : 1 }}>
                        {busy ? "Sending…" : "Approve & Send"}
                      </button>
                      <button disabled={busy}
                        onClick={() => { setEditingId(m.id); setEditContent(m.content); }}
                        className="px-4 py-1.5 rounded-lg text-sm"
                        style={{ color: "var(--text-primary)", background: "var(--bg)", border: "1px solid var(--border)" }}>
                        Edit & Send
                      </button>
                      <button disabled={busy}
                        onClick={() => handleReject(m.id)}
                        className="px-4 py-1.5 rounded-lg text-sm ml-auto"
                        style={{ color: "#dc2626", background: "transparent" }}>
                        Reject
                      </button>
                    </>
                  )}
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  Approving unedited +15 pts · Edited +5 pts · Reject −10 pts
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
