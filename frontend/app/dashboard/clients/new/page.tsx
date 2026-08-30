"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"

export default function NewClientPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", email: "", company: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email) {
      setError("NAME_AND_EMAIL_REQUIRED")
      return
    }
    setSaving(true)
    setError("")
    const r = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await r.json()
    setSaving(false)
    if (!r.ok) {
      setError(data.error ?? "FAILED_TO_CREATE_CLIENT")
      return
    }
    router.push(`/dashboard/clients/${data.id}`)
  }

  return (
    <div className="min-h-screen dot-grid-bg">
      <div className="max-w-2xl mx-auto px-6 py-12">
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
          <h1 className="text-2xl font-mono font-bold tracking-tight uppercase text-foreground">NEW_CLIENT</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            {"// "}New clients start at Trust Score 20 (L0 — Observe only). Every message drafted for approval.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="border-2 border-foreground bg-card p-5"
          >
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-1">
                  NAME *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="ANJALI MENON"
                  className="w-full font-mono text-xs border-2 border-foreground bg-background text-foreground px-3 py-2.5 focus:outline-none focus:border-[#ea580c] uppercase placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-1">
                  EMAIL *
                </label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="anjali@example.com"
                  className="w-full font-mono text-xs border-2 border-foreground bg-background text-foreground px-3 py-2.5 focus:outline-none focus:border-[#ea580c] placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-1">
                  COMPANY (OPTIONAL)
                </label>
                <input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="ACME STUDIO"
                  className="w-full font-mono text-xs border-2 border-foreground bg-background text-foreground px-3 py-2.5 focus:outline-none focus:border-[#ea580c] uppercase placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border-2 border-destructive bg-destructive/5 p-4"
            >
              <p className="text-xs font-mono text-destructive uppercase">{error}</p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="border-2 border-[#ea580c] bg-[#ea580c]/5 p-5"
          >
            <p className="text-[10px] font-mono font-bold tracking-widest uppercase text-[#ea580c] mb-2">
              TRUST_LADDER_STARTS_AT_L0
            </p>
            <p className="text-[10px] font-mono tracking-wider leading-relaxed text-muted-foreground">
              Every message to this client will be drafted for your approval. As you approve drafts unedited, trust
              score rises. At 40 it reaches L1, at 75 L2.
            </p>
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={saving}
            className="w-full bg-foreground text-background py-3 text-xs font-mono tracking-widest uppercase font-bold disabled:opacity-50"
          >
            {saving ? "CREATING..." : "CREATE_CLIENT"}
          </motion.button>
        </form>
      </div>
    </div>
  )
}
