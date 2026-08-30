"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

interface InboxMessage {
  id: string
  content: string
  status: string
  sender: string
  createdAt: string
  daysOverdue: number
  client: { id: string; name: string; trustScore: number; autonomyLevel: number }
  invoice: { id: string; amount: number; amountPaid: number; description: string; status: string; dueDate: string }
}

interface LevelUpToast {
  clientName: string
  newLevel: number
  newScore: number
}

const LEVEL_LABEL = ["OBSERVE", "SOFT_AUTO", "FULL_AUTO"]

export default function InboxPage() {
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [working, setWorking] = useState<string | null>(null)
  const [toast, setToast] = useState<LevelUpToast | null>(null)

  const load = () => {
    Promise.all([
      fetch("/api/messages?status=drafted").then((r) => r.json()),
      fetch("/api/messages?status=escalated").then((r) => r.json()),
    ]).then(([drafted, escalated]) => {
      setMessages([...escalated, ...drafted])
      setLoading(false)
    })
  }

  useEffect(load, [])

  async function handleApprove(msg: InboxMessage, edited?: string) {
    setWorking(msg.id)
    const body = edited ? { editedContent: edited } : {}
    const r = await fetch(`/api/messages/${msg.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await r.json()
    if (data.leveledUp) {
      setToast({ clientName: msg.client.name, newLevel: data.newLevel, newScore: data.newScore })
      setTimeout(() => setToast(null), 4000)
    }
    setEditingId(null)
    setWorking(null)
    load()
  }

  async function handleReject(id: string) {
    setWorking(id)
    await fetch(`/api/messages/${id}/reject`, { method: "POST" })
    setWorking(null)
    load()
  }

  const escalated = messages.filter((m) => m.status === "escalated")
  const drafted = messages.filter((m) => m.status === "drafted")

  return (
    <div className="min-h-screen dot-grid-bg">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Level-up toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-6 right-6 z-50 bg-[#ea580c] text-background px-6 py-4 border-2 border-foreground shadow-lg max-w-sm"
            >
              <p className="text-xs font-mono font-bold tracking-widest uppercase">
                LEVEL_UP: {toast.clientName}
              </p>
              <p className="text-[10px] font-mono tracking-wider mt-1 opacity-90">
                L{toast.newLevel} {LEVEL_LABEL[toast.newLevel]} · SCORE: {toast.newScore}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-mono font-bold tracking-tight uppercase text-foreground">
                AGENT_INBOX
              </h1>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                {"// "}Drafts queued for manual approval
              </p>
            </div>
            {drafted.length > 0 && (
              <span className="bg-[#ea580c] text-background px-3 py-1 text-[10px] tracking-widest uppercase font-bold">
                {drafted.length}_PENDING
              </span>
            )}
          </div>
        </motion.div>

        {/* Escalated — always first */}
        {escalated.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <p className="text-[10px] font-mono tracking-widest uppercase text-destructive mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-destructive" />
              ESCALATED_REQUIRES_ATTENTION
            </p>
            <div className="flex flex-col gap-4">
              {escalated.map((m) => (
                <div key={m.id} className="border-2 border-destructive bg-destructive/5 p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <Link
                      href={`/dashboard/clients/${m.client.id}`}
                      className="font-mono font-bold text-sm uppercase text-foreground hover:text-[#ea580c] transition-colors"
                    >
                      {m.client.name}
                    </Link>
                    <span className="text-[10px] tracking-widest uppercase font-mono bg-destructive text-destructive-foreground px-2 py-0.5">
                      ESCALATED
                    </span>
                  </div>
                  <p className="text-[10px] font-mono tracking-wider text-muted-foreground mb-3">
                    INVOICE: ${m.invoice.amount.toLocaleString()} · {m.invoice.description}
                    {m.daysOverdue > 0 ? ` · ${m.daysOverdue}D_OVERDUE` : ""}
                  </p>
                  <div className="bg-destructive/10 border border-destructive p-3 font-mono text-xs leading-relaxed text-foreground">
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Drafted — awaiting approval */}
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 border-2 border-foreground/20 bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : drafted.length === 0 && escalated.length === 0 ? (
          <div className="text-center py-20 border-2 border-foreground/20">
            <p className="text-4xl font-mono mb-3">✓</p>
            <p className="text-xs font-mono tracking-widest uppercase text-muted-foreground">INBOX_CLEAR</p>
            <p className="text-[10px] font-mono tracking-wider text-muted-foreground mt-2">
              Agent will draft new messages as invoices become overdue
            </p>
          </div>
        ) : drafted.length === 0 ? null : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col gap-4"
          >
            {drafted.map((m) => {
              const isEditing = editingId === m.id
              const busy = working === m.id
              return (
                <div key={m.id} className="border-2 border-foreground bg-card p-5">
                  {/* Client + context */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <Link
                      href={`/dashboard/clients/${m.client.id}`}
                      className="font-mono font-bold text-sm uppercase text-foreground hover:text-[#ea580c] transition-colors"
                    >
                      {m.client.name}
                    </Link>
                    <span className="text-[10px] tracking-widest uppercase font-mono text-muted-foreground">
                      L{m.client.autonomyLevel} · {m.client.trustScore}_PTS
                    </span>
                  </div>
                  <p className="text-[10px] font-mono tracking-wider text-muted-foreground mb-3">
                    INVOICE: ${m.invoice.amount.toLocaleString()} · {m.invoice.description}
                    {m.daysOverdue > 0 ? ` · ${m.daysOverdue}D_OVERDUE` : ""}
                  </p>

                  {/* Draft message */}
                  {isEditing ? (
                    <textarea
                      className="w-full font-mono text-xs leading-relaxed border-2 border-[#ea580c] bg-background text-foreground p-3 resize-none focus:outline-none"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={6}
                    />
                  ) : (
                    <div className="bg-muted/30 border border-border p-3 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                      {m.content}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4">
                    {isEditing ? (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          disabled={busy}
                          onClick={() => handleApprove(m, editContent)}
                          className="bg-foreground text-background px-4 py-2 text-[10px] font-mono tracking-widest uppercase font-bold disabled:opacity-50"
                        >
                          {busy ? "SENDING..." : "SEND_EDITED"}
                        </motion.button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="border border-foreground text-foreground px-4 py-2 text-[10px] font-mono tracking-widest uppercase hover:bg-foreground hover:text-background transition-colors"
                        >
                          CANCEL
                        </button>
                      </>
                    ) : (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          disabled={busy}
                          onClick={() => handleApprove(m)}
                          className="bg-foreground text-background px-4 py-2 text-[10px] font-mono tracking-widest uppercase font-bold disabled:opacity-50"
                        >
                          {busy ? "SENDING..." : "APPROVE_&_SEND"}
                        </motion.button>
                        <button
                          disabled={busy}
                          onClick={() => {
                            setEditingId(m.id)
                            setEditContent(m.content)
                          }}
                          className="border border-foreground text-foreground px-4 py-2 text-[10px] font-mono tracking-widest uppercase hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
                        >
                          EDIT_&_SEND
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => handleReject(m.id)}
                          className="ml-auto text-destructive text-[10px] font-mono tracking-widest uppercase hover:underline disabled:opacity-50"
                        >
                          REJECT
                        </button>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] font-mono tracking-wider text-muted-foreground mt-3">
                    APPROVE_UNEDITED: +15_PTS · EDITED: +5_PTS · REJECT: −10_PTS
                  </p>
                </div>
              )
            })}
          </motion.div>
        )}
      </div>
    </div>
  )
}
