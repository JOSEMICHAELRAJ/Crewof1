"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

interface Client {
  id: string
  name: string
  autonomyLevel: number
  trustScore: number
}
interface Invoice {
  id: string
  description: string
  amount: number
  status: string
  clientId: string
}
interface SimResult {
  clientMessage: { content: string }
  agentMessage: { content: string; status: string }
  situationType: string
  decision: { action: string; draftedMessage?: string; reason?: string }
}

const SUGGESTED = [
  { label: "ROUTINE_THANKS", content: "Got it, will process soon." },
  { label: "PARTIAL_PAYMENT", content: "Can I pay half now and half next month?" },
  { label: "DISCOUNT_REQUEST", content: "Could you do 20% off? We're tight on cash right now." },
  { label: "DELAY_REQUEST", content: "I need 30 more days to process this, is that ok?" },
  { label: "🚨 REFUND_DEMAND", content: "I want a refund, this work was not what we agreed on." },
  { label: "🚨 LEGAL_THREAT", content: "If this isn't resolved I'll have to involve a lawyer." },
]

const ACTION_COLOR: Record<string, string> = {
  ESCALATE: "#dc2626",
  AUTO_SEND: "#16a34a",
  DRAFT_FOR_APPROVAL: "#ea580c",
}

const ACTION_LABEL: Record<string, string> = {
  ESCALATE: "⚠ ESCALATED_NEEDS_REVIEW",
  AUTO_SEND: "✓ AUTO_SENT_BY_AGENT",
  DRAFT_FOR_APPROVAL: "DRAFT_QUEUED_FOR_APPROVAL",
}

const LEVEL_LABEL = ["OBSERVE", "SOFT_AUTO", "FULL_AUTO"]

export default function SimulatePage() {
  const [clients, setClients] = useState<Client[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clientId, setClientId] = useState("")
  const [invoiceId, setInvoiceId] = useState("")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SimResult | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => {
        setClients(d)
        if (d.length > 0) setClientId(d[0].id)
      })
  }, [])

  useEffect(() => {
    if (!clientId) return
    fetch(`/api/invoices?clientId=${clientId}`)
      .then((r) => r.json())
      .then((d) => {
        setInvoices(d)
        if (d.length > 0) setInvoiceId(d[0].id)
      })
  }, [clientId])

  const selectedClient = clients.find((c) => c.id === clientId)

  async function handleSend() {
    if (!clientId || !invoiceId || !content.trim()) return
    setLoading(true)
    setError("")
    setResult(null)
    const r = await fetch("/api/simulate-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, invoiceId, content: content.trim() }),
    })
    const data = await r.json()
    setLoading(false)
    if (!r.ok) {
      setError(data.error ?? "SIMULATION_FAILED")
      return
    }
    setResult(data)
  }

  return (
    <div className="min-h-screen dot-grid-bg">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-mono font-bold tracking-tight uppercase text-foreground">
            SIMULATE_CLIENT_REPLY
          </h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            {"// "}Inject fake client message, watch agent decide in real time
          </p>
        </motion.div>

        {/* Client + invoice selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="border-2 border-foreground bg-card p-5 mb-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-1">
                CLIENT
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full font-mono text-xs border-2 border-foreground bg-background text-foreground px-3 py-2 focus:outline-none focus:border-[#ea580c] uppercase"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-1">
                INVOICE
              </label>
              <select
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                className="w-full font-mono text-xs border-2 border-foreground bg-background text-foreground px-3 py-2 focus:outline-none focus:border-[#ea580c] uppercase"
              >
                {invoices.length === 0 ? (
                  <option value="">NO_INVOICES_FOR_CLIENT</option>
                ) : (
                  invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      ${inv.amount.toLocaleString()} — {inv.description} ({inv.status})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {selectedClient && (
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase border-t border-border pt-3">
              <span className="text-[#ea580c] font-bold">
                L{selectedClient.autonomyLevel}_{LEVEL_LABEL[selectedClient.autonomyLevel]}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">TRUST_SCORE: {selectedClient.trustScore}</span>
              {selectedClient.autonomyLevel === 2 && (
                <span className="ml-auto bg-[#16a34a] text-background px-2 py-0.5 text-[10px] tracking-widest uppercase font-bold">
                  FULL_AUTO_WATCH_ESCALATION
                </span>
              )}
            </div>
          )}
        </motion.div>

        {/* Suggested messages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-3"
        >
          <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-2">TRY_ONE_OF_THESE:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((s) => (
              <button
                key={s.label}
                onClick={() => setContent(s.content)}
                className={`text-[10px] font-mono tracking-wider uppercase px-2.5 py-1 border transition-colors ${
                  content === s.content
                    ? "bg-[#ea580c] text-background border-[#ea580c]"
                    : "bg-card text-muted-foreground border-border hover:border-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Message input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="TYPE WHAT THE CLIENT SAYS..."
            rows={4}
            className="w-full font-mono text-xs leading-relaxed border-2 border-foreground bg-background text-foreground p-4 resize-none focus:outline-none focus:border-[#ea580c] placeholder:text-muted-foreground mb-3"
          />

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSend}
            disabled={loading || !content.trim() || !invoiceId || invoices.length === 0}
            className="w-full bg-foreground text-background py-3 text-xs font-mono tracking-widest uppercase font-bold disabled:opacity-50 mb-6"
          >
            {loading ? "AGENT_THINKING..." : "SEND_TO_AGENT →"}
          </motion.button>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-2 border-destructive bg-destructive/5 p-4 mb-6"
          >
            <p className="text-xs font-mono text-destructive uppercase">{error}</p>
          </motion.div>
        )}

        {/* Result */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-4"
          >
            {/* Situation classification */}
            <div className="border-2 border-foreground bg-card px-4 py-2 flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase">
              <span className="text-muted-foreground">SITUATION_CLASSIFIED_AS:</span>
              <span className="font-bold text-foreground">{result.situationType}</span>
            </div>

            {/* Client message bubble */}
            <div>
              <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-1">
                CLIENT_MESSAGE
              </p>
              <div className="border-2 border-[#2563eb] bg-[#eff6ff] p-4 font-mono text-xs leading-relaxed text-[#1e3a8a]">
                {result.clientMessage.content}
              </div>
            </div>

            {/* Agent decision banner */}
            <div
              className="border-2 px-4 py-3"
              style={{
                borderColor: ACTION_COLOR[result.decision.action],
                backgroundColor: ACTION_COLOR[result.decision.action] + "10",
              }}
            >
              <p
                className="text-[10px] font-mono font-bold tracking-widest uppercase"
                style={{ color: ACTION_COLOR[result.decision.action] }}
              >
                {ACTION_LABEL[result.decision.action]}
              </p>
            </div>

            {/* Agent response */}
            <div>
              <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-1">
                AGENT_{result.decision.action === "ESCALATE" ? "ESCALATION_NOTE" : "RESPONSE"}
              </p>
              <div
                className="border-2 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap"
                style={{
                  borderColor:
                    result.decision.action === "ESCALATE"
                      ? "#dc2626"
                      : result.decision.action === "AUTO_SEND"
                        ? "#16a34a"
                        : "#ea580c",
                  backgroundColor:
                    result.decision.action === "ESCALATE"
                      ? "#fee2e2"
                      : result.decision.action === "AUTO_SEND"
                        ? "#f0fdf4"
                        : "#fff7ed",
                  color: result.decision.action === "ESCALATE" ? "#7f1d1d" : "#1a1a18",
                }}
              >
                {result.agentMessage.content}
              </div>
            </div>

            <p className="text-[10px] font-mono tracking-wider uppercase text-center text-muted-foreground">
              {result.agentMessage.status === "drafted" && "DRAFT_NOW_IN_INBOX_WAITING_FOR_APPROVAL"}
              {result.agentMessage.status === "auto_sent" && "MESSAGE_WAS_SENT_AUTOMATICALLY"}
              {result.agentMessage.status === "escalated" && "FLAGGED_AGENT_DID_NOT_DRAFT_RESPONSE"}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
