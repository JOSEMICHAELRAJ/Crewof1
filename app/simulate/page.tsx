"use client";
import { useEffect, useState } from "react";

interface Client { id: string; name: string; autonomyLevel: number; trustScore: number; }
interface Invoice { id: string; description: string; amount: number; status: string; clientId: string; }
interface SimResult {
  clientMessage: { content: string };
  agentMessage: { content: string; status: string };
  situationType: string;
  decision: { action: string; draftedMessage?: string; reason?: string };
}

const SUGGESTED = [
  { label: "Routine thanks", content: "Got it, will process soon." },
  { label: "Partial payment ask", content: "Can I pay half now and half next month?" },
  { label: "Discount request", content: "Could you do 20% off? We're tight on cash right now." },
  { label: "Delay request", content: "I need 30 more days to process this, is that ok?" },
  { label: "🚨 Refund demand", content: "I want a refund, this work was not what we agreed on." },
  { label: "🚨 Legal threat", content: "If this isn't resolved I'll have to involve a lawyer." },
];

const ACTION_COLOR: Record<string, string> = {
  ESCALATE: "#dc2626",
  AUTO_SEND: "#1a6348",
  DRAFT_FOR_APPROVAL: "#b45309",
};
const ACTION_BG: Record<string, string> = {
  ESCALATE: "#fee2e2",
  AUTO_SEND: "#e8f4ef",
  DRAFT_FOR_APPROVAL: "#fef3c7",
};
const ACTION_LABEL: Record<string, string> = {
  ESCALATE: "⚠ Escalated — needs your review",
  AUTO_SEND: "✓ Auto-sent by agent",
  DRAFT_FOR_APPROVAL: "Draft queued for your approval",
};

export default function SimulatePage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clientId, setClientId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then((d) => {
      setClients(d);
      if (d.length > 0) setClientId(d[0].id);
    });
  }, []);

  useEffect(() => {
    if (!clientId) return;
    fetch(`/api/invoices?clientId=${clientId}`).then((r) => r.json()).then((d) => {
      setInvoices(d);
      if (d.length > 0) setInvoiceId(d[0].id);
    });
  }, [clientId]);

  const selectedClient = clients.find((c) => c.id === clientId);

  async function handleSend() {
    if (!clientId || !invoiceId || !content.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    const r = await fetch("/api/simulate-reply", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, invoiceId, content: content.trim() }),
    });
    const data = await r.json();
    setLoading(false);
    if (!r.ok) { setError(data.error ?? "Something went wrong."); return; }
    setResult(data);
  }

  const LEVEL_COLOR = ["#6b7280", "#ca8a04", "#1a6348"];
  const LEVEL_LABEL = ["Observe only", "Soft autonomy", "Full autonomy"];

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Simulate client reply</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        Inject a fake client message and watch Collect decide in real time — draft for approval, auto-send, or escalate.
      </p>

      {/* Client selector */}
      <div className="flex flex-col gap-4 mb-4 p-5 rounded-xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Client</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg focus:outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Invoice</label>
            <select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg focus:outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
              {invoices.length === 0
                ? <option value="">No invoices for this client</option>
                : invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      ${inv.amount.toLocaleString()} — {inv.description} ({inv.status})
                    </option>
                  ))
              }
            </select>
          </div>
        </div>

        {selectedClient && (
          <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
            style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <span style={{ color: LEVEL_COLOR[selectedClient.autonomyLevel], fontWeight: 600 }}>
              L{selectedClient.autonomyLevel} — {LEVEL_LABEL[selectedClient.autonomyLevel]}
            </span>
            <span style={{ color: "var(--text-muted)" }}>·</span>
            <span style={{ color: "var(--text-secondary)" }}>Trust score: {selectedClient.trustScore}</span>
            {selectedClient.autonomyLevel === 2 && (
              <span className="ml-auto px-2 py-0.5 rounded-full font-medium"
                style={{ background: "#e8f4ef", color: "#1a6348" }}>
                Full autonomy — watch escalation override this
              </span>
            )}
          </div>
        )}
      </div>

      {/* Suggested messages */}
      <div className="mb-3">
        <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Try one of these:</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.map((s) => (
            <button key={s.label} onClick={() => setContent(s.content)}
              className="text-xs px-2.5 py-1 rounded-full transition-colors"
              style={{ background: content === s.content ? "var(--accent)" : "var(--surface)",
                color: content === s.content ? "white" : "var(--text-secondary)",
                border: "1px solid var(--border)" }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message input */}
      <textarea value={content} onChange={(e) => setContent(e.target.value)}
        placeholder="Type what the client says…"
        rows={3}
        className="w-full text-sm px-4 py-3 rounded-xl resize-none focus:outline-none mb-3"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
      />

      <button onClick={handleSend} disabled={loading || !content.trim() || !invoiceId || invoices.length === 0}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity mb-6"
        style={{ background: "var(--accent)", opacity: loading || !content.trim() || !invoiceId || invoices.length === 0 ? 0.5 : 1 }}>
        {loading ? "Agent is thinking…" : "Send to agent →"}
      </button>

      {error && <p className="text-sm px-4 py-3 rounded-xl mb-4" style={{ background: "#fee2e2", color: "#dc2626" }}>{error}</p>}

      {/* Result */}
      {result && (
        <div className="flex flex-col gap-3">
          {/* Situation classification */}
          <div className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg"
            style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <span style={{ color: "var(--text-muted)" }}>Situation classified as:</span>
            <span className="font-semibold capitalize" style={{ color: "var(--text-primary)" }}>
              {result.situationType}
            </span>
          </div>

          {/* Client message bubble */}
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Client message</p>
            <div className="text-sm px-4 py-3 rounded-xl" style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e3a8a" }}>
              {result.clientMessage.content}
            </div>
          </div>

          {/* Agent decision banner */}
          <div className="px-4 py-3 rounded-xl"
            style={{ background: ACTION_BG[result.decision.action], border: `1px solid ${ACTION_COLOR[result.decision.action]}30` }}>
            <p className="text-xs font-semibold" style={{ color: ACTION_COLOR[result.decision.action] }}>
              {ACTION_LABEL[result.decision.action]}
            </p>
          </div>

          {/* Agent response */}
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
              Agent {result.decision.action === "ESCALATE" ? "escalation note" : "response"}
            </p>
            <div className="text-sm px-4 py-3 rounded-xl whitespace-pre-wrap"
              style={{
                background: result.decision.action === "ESCALATE" ? "#fee2e2" : "var(--accent-light)",
                border: `1px solid ${result.decision.action === "ESCALATE" ? "#fecaca" : "var(--accent-mid)"}`,
                color: result.decision.action === "ESCALATE" ? "#7f1d1d" : "var(--text-primary)",
              }}>
              {result.agentMessage.content}
            </div>
          </div>

          <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
            {result.agentMessage.status === "drafted" && "This draft is now in your inbox waiting for approval."}
            {result.agentMessage.status === "auto_sent" && "This message was sent automatically by the agent."}
            {result.agentMessage.status === "escalated" && "This was flagged — the agent did not draft a response."}
          </p>
        </div>
      )}
    </div>
  );
}
