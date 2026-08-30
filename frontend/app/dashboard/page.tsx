"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"

interface Client {
  id: string
  name: string
  email: string
  company: string | null
  trustScore: number
  autonomyLevel: 0 | 1 | 2
  outstanding: number
  pendingDrafts: number
  lastInvoiceStatus: string | null
  lastInvoiceDueDate: string | null
}

const LEVEL_LABEL = ["OBSERVE", "SOFT_AUTO", "FULL_AUTO"]
const LEVEL_COLOR = {
  0: "text-muted-foreground",
  1: "text-[#ea580c]",
  2: "text-foreground",
}

function TrustBar({ score, level }: { score: number; level: number }) {
  const segments = [
    { max: 39, label: "L0" },
    { max: 74, label: "L1" },
    { max: 100, label: "L2" },
  ]
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5 flex-1 h-1">
        {segments.map((seg, i) => {
          const segMin = i === 0 ? 0 : segments[i - 1].max + 1
          const segMax = seg.max
          const segRange = segMax - segMin
          let fill = 0
          if (score > segMax) fill = 1
          else if (score >= segMin) fill = (score - segMin) / segRange
          
          return (
            <div key={i} className="flex-1 bg-muted overflow-hidden">
              <div
                style={{
                  width: `${fill * 100}%`,
                  height: "100%",
                  backgroundColor: i <= level ? "#ea580c" : "#c4c2b8",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          )
        })}
      </div>
      <span className="text-xs font-mono tabular-nums text-foreground min-w-6">
        {score}
      </span>
    </div>
  )
}

function StatusDot({ status }: { status: string | null }) {
  const statusMap: Record<string, { color: string; label: string }> = {
    overdue: { color: "#dc2626", label: "OVERDUE" },
    disputed: { color: "#dc2626", label: "DISPUTE" },
    partial: { color: "#ea580c", label: "PARTIAL" },
    sent: { color: "#6b7280", label: "SENT" },
    draft: { color: "#9ca3af", label: "DRAFT" },
    paid: { color: "#16a34a", label: "PAID" },
  }
  const s = statusMap[status ?? ""] ?? { color: "#9ca3af", label: status ?? "—" }
  
  return (
    <span className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-mono" style={{ color: s.color }}>
      <span style={{ width: 4, height: 4, backgroundColor: s.color }} />
      {s.label}
    </span>
  )
}

function ClientCard({ c }: { c: Client }) {
  return (
    <Link href={`/dashboard/clients/${c.id}`}>
      <motion.div
        whileHover={{ y: -2 }}
        className="border-2 border-foreground bg-card p-4 cursor-pointer transition-all"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <p className="text-sm font-mono font-bold tracking-tight uppercase text-foreground">{c.name}</p>
            {c.company && <p className="text-[10px] tracking-wider uppercase text-muted-foreground mt-0.5">{c.company}</p>}
          </div>
          <span className={`text-[10px] tracking-[0.15em] uppercase font-mono font-bold ${LEVEL_COLOR[c.autonomyLevel]}`}>
            L{c.autonomyLevel}_{LEVEL_LABEL[c.autonomyLevel]}
          </span>
        </div>

        <TrustBar score={c.trustScore} level={c.autonomyLevel} />

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <div>
            {c.outstanding > 0 ? (
              <p className="text-sm font-mono font-bold tabular-nums text-foreground">
                ${c.outstanding.toLocaleString()}
              </p>
            ) : (
              <p className="text-[10px] tracking-widest uppercase text-muted-foreground">NO_BALANCE</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <StatusDot status={c.lastInvoiceStatus} />
            </div>
          </div>
          {c.pendingDrafts > 0 && (
            <span className="bg-[#ea580c] text-background px-2 py-0.5 text-[10px] tracking-widest uppercase font-bold">
              {c.pendingDrafts}_DRAFT{c.pendingDrafts > 1 ? "S" : ""}
            </span>
          )}
        </div>
      </motion.div>
    </Link>
  )
}

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => {
        setClients(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const totalOutstanding = clients.reduce((s, c) => s + c.outstanding, 0)
  const totalDrafts = clients.reduce((s, c) => s + c.pendingDrafts, 0)

  return (
    <div className="min-h-screen dot-grid-bg">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-end justify-between mb-4">
            <div>
              <h1 className="text-2xl font-mono font-bold tracking-tight uppercase text-foreground">
                CLIENT_DASHBOARD
              </h1>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                {"// "}{clients.length} relationship{clients.length !== 1 ? "s" : ""} under agent management
              </p>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">OUTSTANDING</p>
                <p className="text-xl font-mono font-bold tabular-nums text-foreground">
                  ${totalOutstanding.toLocaleString()}
                </p>
              </div>
              {totalDrafts > 0 && (
                <Link href="/dashboard/inbox" className="text-right">
                  <p className="text-[10px] tracking-widest uppercase text-muted-foreground">AWAITING_REVIEW</p>
                  <p className="text-xl font-mono font-bold tabular-nums text-[#ea580c]">
                    {totalDrafts} DRAFT{totalDrafts > 1 ? "S" : ""}
                  </p>
                </Link>
              )}
            </div>
          </div>

          {/* Trust level legend */}
          <div className="flex gap-3">
            {LEVEL_LABEL.map((label, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-[10px] tracking-widest uppercase font-mono border border-foreground/20 px-3 py-1"
              >
                <span style={{ width: 4, height: 4, backgroundColor: i === 0 ? "#9ca3af" : i === 1 ? "#ea580c" : "#1a1a18" }} />
                L{i}_{label}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Client grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 border-2 border-foreground/20 bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-20 border-2 border-foreground/20">
            <p className="text-4xl font-mono mb-3">◆</p>
            <p className="text-xs font-mono tracking-widest uppercase text-muted-foreground">NO_CLIENTS_YET</p>
            <Link
              href="/dashboard/clients/new"
              className="inline-block mt-4 text-xs font-mono tracking-widest uppercase text-foreground hover:text-[#ea580c] transition-colors"
            >
              ADD_FIRST_CLIENT →
            </Link>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {clients.map((c) => (
              <ClientCard key={c.id} c={c} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
