"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"

interface TrustEvent {
  id: string
  delta: number
  reason: string
  createdAt: string
  scoreAfter: number
}
interface Invoice {
  id: string
  amount: number
  amountPaid: number
  description: string
  status: string
  dueDate: string
  createdAt: string
}
interface Message {
  id: string
  sender: string
  content: string
  status: string
  createdAt: string
  invoice: { id: string; amount: number; description: string; status: string }
}
interface ClientDetail {
  id: string
  name: string
  email: string
  company: string | null
  trustScore: number
  autonomyLevel: number
  manualOverride: boolean
  maxDiscountPctOverride: number | null
  maxDelayDaysOverride: number | null
  toneOverride: string | null
  freelancer: {
    defaultMaxDiscountPct: number
    defaultMaxDelayDays: number
    defaultTone: string
    escalationKeywords: string
  }
  invoices: Invoice[]
  messages: Message[]
  trustEvents: TrustEvent[]
  trustSeries: (TrustEvent & { scoreAfter: number })[]
}

const LEVEL_LABEL = ["OBSERVE", "SOFT_AUTO", "FULL_AUTO"]

function MiniChart({ series }: { series: { scoreAfter: number }[] }) {
  if (series.length < 2)
    return <div className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">NOT_ENOUGH_DATA</div>

  const W = 280,
    H = 80,
    PAD = 8
  const scores = series.map((s) => s.scoreAfter)
  const minV = 0,
    maxV = 100
  const pts = scores.map((v, i) => {
    const x = PAD + (i / (scores.length - 1)) * (W - 2 * PAD)
    const y = PAD + (1 - (v - minV) / (maxV - minV)) * (H - 2 * PAD)
    return `${x},${y}`
  })
  const last = scores[scores.length - 1]

  return (
    <div>
      <svg width={W} height={H} className="overflow-visible">
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke="#ea580c"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {scores.map((v, i) => {
          const [x, y] = pts[i].split(",").map(Number)
          return <circle key={i} cx={x} cy={y} r={3} fill="#ea580c" />
        })}
      </svg>
      <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground mt-2">
        CURRENT_SCORE: <span className="text-[#ea580c] font-bold">{last}</span>
      </p>
    </div>
  )
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [overrideLevel, setOverrideLevel] = useState<number | "">("")
  const [showNewInvoice, setShowNewInvoice] = useState(false)
  const [inv, setInv] = useState({ amount: "", description: "", dueDate: "" })

  const load = () =>
    fetch(`/api/clients/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setClient(d)
        setLoading(false)
      })

  useEffect(() => {
    load()
  }, [id])

  async function handleManualOverride() {
    if (overrideLevel === "") return
    setSaving(true)
    await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autonomyLevel: Number(overrideLevel), manualOverride: true }),
    })
    setSaving(false)
    load()
  }

  async function handleUnpin() {
    setSaving(true)
    await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manualOverride: false }),
    })
    setSaving(false)
    load()
  }

  async function createInvoice() {
    if (!inv.amount || !inv.description || !inv.dueDate) return
    setSaving(true)
    await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: id,
        amount: parseFloat(inv.amount),
        description: inv.description,
        dueDate: inv.dueDate,
        status: "sent",
      }),
    })
    setSaving(false)
    setShowNewInvoice(false)
    setInv({ amount: "", description: "", dueDate: "" })
    load()
  }

  if (loading)
    return (
      <div className="min-h-screen dot-grid-bg">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="h-8 w-40 border-2 border-foreground/20 bg-muted/20 animate-pulse mb-4" />
          <div className="h-64 border-2 border-foreground/20 bg-muted/20 animate-pulse" />
        </div>
      </div>
    )
  if (!client)
    return (
      <div className="min-h-screen dot-grid-bg flex items-center justify-center">
        <p className="text-xs font-mono tracking-widest uppercase text-muted-foreground">CLIENT_NOT_FOUND</p>
      </div>
    )

  const statusColor: Record<string, string> = {
    overdue: "#dc2626",
    disputed: "#dc2626",
    partial: "#ea580c",
    sent: "#6b7280",
    draft: "#9ca3af",
    paid: "#16a34a",
  }

  return (
    <div className="min-h-screen dot-grid-bg">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Back + header */}
        <Link
          href="/dashboard"
          className="inline-block mb-4 text-[10px] font-mono tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
        >
          ← BACK_TO_DASHBOARD
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-mono font-bold tracking-tight uppercase text-foreground">{client.name}</h1>
              {client.company && (
                <p className="text-xs font-mono tracking-wider uppercase text-muted-foreground mt-1">{client.company}</p>
              )}
              <p className="text-[10px] font-mono tracking-wider text-muted-foreground mt-1">{client.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#ea580c]">
                L{client.autonomyLevel}_{LEVEL_LABEL[client.autonomyLevel]}
              </span>
              {client.manualOverride && (
                <span className="bg-[#ea580c] text-background px-2 py-0.5 text-[10px] tracking-widest uppercase font-bold">
                  PINNED
                </span>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Trust chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2 border-2 border-foreground bg-card p-5"
          >
            <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-4">
              TRUST_SCORE_OVER_TIME
            </p>
            <MiniChart series={client.trustSeries} />
            <div className="mt-4 flex flex-col gap-1 max-h-32 overflow-y-auto border-t border-border pt-3">
              {client.trustEvents
                .slice()
                .reverse()
                .map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-muted-foreground tracking-wider">{e.reason}</span>
                    <span
                      className="font-bold tabular-nums"
                      style={{ color: e.delta > 0 ? "#16a34a" : "#dc2626" }}
                    >
                      {e.delta > 0 ? "+" : ""}
                      {e.delta}
                    </span>
                  </div>
                ))}
            </div>
          </motion.div>

          {/* Manual override */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="border-2 border-foreground bg-card p-5"
          >
            <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-4">MANUAL_OVERRIDE</p>
            <p className="text-[10px] font-mono tracking-wider text-muted-foreground mb-4 leading-relaxed">
              Pin autonomy level regardless of score. Score keeps changing underneath.
            </p>
            <select
              value={overrideLevel}
              onChange={(e) => setOverrideLevel(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full font-mono text-xs border-2 border-foreground bg-background text-foreground px-3 py-2 mb-3 focus:outline-none focus:border-[#ea580c]"
            >
              <option value="">SELECT_LEVEL...</option>
              <option value="0">L0_OBSERVE</option>
              <option value="1">L1_SOFT_AUTO</option>
              <option value="2">L2_FULL_AUTO</option>
            </select>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={overrideLevel === "" || saving}
              onClick={handleManualOverride}
              className="w-full bg-foreground text-background px-4 py-2 text-[10px] font-mono tracking-widest uppercase font-bold mb-2 disabled:opacity-50"
            >
              PIN_LEVEL
            </motion.button>
            {client.manualOverride && (
              <button
                onClick={handleUnpin}
                className="w-full border-2 border-foreground text-foreground px-4 py-2 text-[10px] font-mono tracking-widest uppercase hover:bg-foreground hover:text-background transition-colors"
              >
                UNPIN_(LET_SCORE_DECIDE)
              </button>
            )}
          </motion.div>
        </div>

        {/* Invoices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="border-2 border-foreground bg-card mb-4"
        >
          <div className="flex items-center justify-between px-5 py-3 border-b-2 border-foreground">
            <p className="text-xs font-mono font-bold tracking-widest uppercase">INVOICES</p>
            <button
              onClick={() => setShowNewInvoice(!showNewInvoice)}
              className="bg-foreground text-background px-3 py-1 text-[10px] font-mono tracking-widest uppercase font-bold"
            >
              + NEW
            </button>
          </div>
          {showNewInvoice && (
            <div className="px-5 py-4 flex gap-2 flex-wrap items-end border-b border-border bg-muted/20">
              <input
                placeholder="DESCRIPTION"
                value={inv.description}
                onChange={(e) => setInv({ ...inv, description: e.target.value })}
                className="flex-1 min-w-32 font-mono text-xs border-2 border-foreground bg-background text-foreground px-3 py-2 focus:outline-none focus:border-[#ea580c] uppercase placeholder:text-muted-foreground"
              />
              <input
                placeholder="AMOUNT"
                type="number"
                value={inv.amount}
                onChange={(e) => setInv({ ...inv, amount: e.target.value })}
                className="w-28 font-mono text-xs border-2 border-foreground bg-background text-foreground px-3 py-2 focus:outline-none focus:border-[#ea580c]"
              />
              <input
                type="date"
                value={inv.dueDate}
                onChange={(e) => setInv({ ...inv, dueDate: e.target.value })}
                className="font-mono text-xs border-2 border-foreground bg-background text-foreground px-3 py-2 focus:outline-none focus:border-[#ea580c] uppercase"
              />
              <button
                onClick={createInvoice}
                disabled={saving}
                className="bg-foreground text-background px-4 py-2 text-[10px] font-mono tracking-widest uppercase font-bold disabled:opacity-50"
              >
                SAVE
              </button>
            </div>
          )}
          {client.invoices.length === 0 ? (
            <p className="px-5 py-8 text-center text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
              NO_INVOICES_YET
            </p>
          ) : (
            client.invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3 border-b border-border">
                <div>
                  <p className="text-xs font-mono font-bold uppercase text-foreground">{inv.description}</p>
                  <p className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground mt-0.5">
                    DUE: {new Date(inv.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-bold tabular-nums text-foreground">
                    ${inv.amount.toLocaleString()}
                  </p>
                  <span
                    className="text-[10px] font-mono tracking-widest uppercase font-bold"
                    style={{ color: statusColor[inv.status] ?? "#6b7280" }}
                  >
                    {inv.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </motion.div>

        {/* Message history */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="border-2 border-foreground bg-card"
        >
          <p className="px-5 py-3 text-xs font-mono font-bold tracking-widest uppercase border-b-2 border-foreground">
            MESSAGE_HISTORY
          </p>
          {client.messages.length === 0 ? (
            <p className="px-5 py-8 text-center text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
              NO_MESSAGES_YET
            </p>
          ) : (
            client.messages.map((m) => (
              <div key={m.id} className="px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[10px] font-mono font-bold tracking-widest uppercase"
                    style={{
                      color: m.sender === "agent" ? "#ea580c" : m.sender === "client" ? "#2563eb" : "#6b7280",
                    }}
                  >
                    {m.sender}
                  </span>
                  <span className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
                    {m.status}
                  </span>
                  <span className="text-[10px] font-mono tracking-wider text-muted-foreground ml-auto">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs font-mono leading-relaxed text-foreground whitespace-pre-wrap">{m.content}</p>
              </div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  )
}
