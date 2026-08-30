"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

interface Freelancer {
  id: string
  name: string
  email: string
  defaultMaxDiscountPct: number
  defaultMaxDelayDays: number
  escalationKeywords: string
  defaultTone: string
}

export default function SettingsPage() {
  const [fl, setFl] = useState<Freelancer | null>(null)
  const [form, setForm] = useState({
    defaultMaxDiscountPct: 15,
    defaultMaxDelayDays: 14,
    escalationKeywords: "",
    defaultTone: "friendly",
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setFl(d)
        setForm({
          defaultMaxDiscountPct: d.defaultMaxDiscountPct,
          defaultMaxDelayDays: d.defaultMaxDelayDays,
          escalationKeywords: d.escalationKeywords,
          defaultTone: d.defaultTone,
        })
      })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!fl)
    return (
      <div className="min-h-screen dot-grid-bg">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="h-96 border-2 border-foreground/20 bg-muted/20 animate-pulse" />
        </div>
      </div>
    )

  return (
    <div className="min-h-screen dot-grid-bg">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-mono font-bold tracking-tight uppercase text-foreground">AGENT_SETTINGS</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            {"// "}Default boundaries for negotiation. Apply to all clients unless overridden per-client.
          </p>
        </motion.div>

        <form onSubmit={handleSave} className="flex flex-col gap-5">
          {/* Negotiation boundaries */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="border-2 border-foreground bg-card p-5"
          >
            <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-5">
              NEGOTIATION_BOUNDARIES
            </p>

            <div className="flex flex-col gap-5">
              {/* Max discount */}
              <div>
                <label className="block text-xs font-mono tracking-wider uppercase text-foreground mb-2">
                  MAX_DISCOUNT_AGENT_CAN_AGREE_TO
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={5}
                    value={form.defaultMaxDiscountPct}
                    onChange={(e) => setForm({ ...form, defaultMaxDiscountPct: Number(e.target.value) })}
                    className="flex-1 h-1 bg-muted appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#ea580c] [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                  <span className="text-sm font-mono font-bold tabular-nums text-[#ea580c] min-w-12 text-right">
                    {form.defaultMaxDiscountPct}%
                  </span>
                </div>
                <p className="text-[10px] font-mono tracking-wider text-muted-foreground mt-2 leading-relaxed">
                  If client asks for more than this, agent escalates to you.
                </p>
              </div>

              {/* Max delay */}
              <div>
                <label className="block text-xs font-mono tracking-wider uppercase text-foreground mb-2">
                  MAX_PAYMENT_DELAY_AGENT_CAN_GRANT
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={0}
                    max={60}
                    step={7}
                    value={form.defaultMaxDelayDays}
                    onChange={(e) => setForm({ ...form, defaultMaxDelayDays: Number(e.target.value) })}
                    className="flex-1 h-1 bg-muted appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#ea580c] [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                  <span className="text-sm font-mono font-bold tabular-nums text-[#ea580c] min-w-16 text-right">
                    {form.defaultMaxDelayDays}D
                  </span>
                </div>
                <p className="text-[10px] font-mono tracking-wider text-muted-foreground mt-2 leading-relaxed">
                  If client asks for more time, agent escalates instead of agreeing.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Escalation triggers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="border-2 border-foreground bg-card p-5"
          >
            <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-5">
              ESCALATION_TRIGGERS
            </p>
            <label className="block text-xs font-mono tracking-wider uppercase text-foreground mb-2">
              KEYWORDS_THAT_ALWAYS_ESCALATE (COMMA_SEPARATED)
            </label>
            <textarea
              value={form.escalationKeywords}
              onChange={(e) => setForm({ ...form, escalationKeywords: e.target.value })}
              rows={3}
              className="w-full font-mono text-xs leading-relaxed border-2 border-foreground bg-background text-foreground p-3 resize-none focus:outline-none focus:border-[#ea580c]"
            />
            <p className="text-[10px] font-mono tracking-wider text-muted-foreground mt-2 leading-relaxed">
              If client message contains any of these words, agent always stops and flags it — regardless of trust level.
            </p>
          </motion.div>

          {/* Default tone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="border-2 border-foreground bg-card p-5"
          >
            <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-5">DEFAULT_TONE</p>
            <div className="grid grid-cols-3 gap-2">
              {(["friendly", "firm", "formal"] as const).map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setForm({ ...form, defaultTone: tone })}
                  className={`py-3 text-xs font-mono tracking-widest uppercase font-bold transition-colors ${
                    form.defaultTone === tone
                      ? "bg-foreground text-background"
                      : "border-2 border-foreground text-foreground hover:bg-foreground hover:text-background"
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
            <p className="text-[10px] font-mono tracking-wider text-muted-foreground mt-3 leading-relaxed">
              FRIENDLY = warm & casual · FIRM = direct & businesslike · FORMAL = polished
            </p>
          </motion.div>

          {/* Save button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex items-center gap-3"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={saving}
              className="flex-1 bg-foreground text-background py-3 text-xs font-mono tracking-widest uppercase font-bold disabled:opacity-50"
            >
              {saving ? "SAVING..." : "SAVE_SETTINGS"}
            </motion.button>
            {saved && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs font-mono tracking-widest uppercase text-[#16a34a] font-bold"
              >
                ✓ SAVED
              </motion.span>
            )}
          </motion.div>
        </form>
      </div>
    </div>
  )
}
