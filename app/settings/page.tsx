"use client";
import { useEffect, useState } from "react";

interface Freelancer {
  id: string;
  name: string;
  email: string;
  defaultMaxDiscountPct: number;
  defaultMaxDelayDays: number;
  escalationKeywords: string;
  defaultTone: string;
}

export default function SettingsPage() {
  const [fl, setFl] = useState<Freelancer | null>(null);
  const [form, setForm] = useState({ defaultMaxDiscountPct: 15, defaultMaxDelayDays: 14, escalationKeywords: "", defaultTone: "friendly" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      setFl(d);
      setForm({
        defaultMaxDiscountPct: d.defaultMaxDiscountPct,
        defaultMaxDelayDays: d.defaultMaxDelayDays,
        escalationKeywords: d.escalationKeywords,
        defaultTone: d.defaultTone,
      });
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!fl) return (
    <div className="max-w-xl mx-auto px-6 py-8">
      <div className="h-64 rounded-xl animate-pulse" style={{ background: "var(--border)" }} />
    </div>
  );

  return (
    <div className="max-w-xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Settings</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        Default boundaries for how the agent negotiates. These apply to all clients unless overridden per-client.
      </p>

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
            Negotiation boundaries
          </p>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                Max discount the agent can agree to
              </label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={50} step={5}
                  value={form.defaultMaxDiscountPct}
                  onChange={(e) => setForm({ ...form, defaultMaxDiscountPct: Number(e.target.value) })}
                  className="flex-1 accent-green-700" />
                <span className="text-sm font-semibold w-10 text-right" style={{ color: "var(--accent)" }}>
                  {form.defaultMaxDiscountPct}%
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                If a client asks for more than this, the agent escalates to you.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                Max payment delay the agent can grant
              </label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={60} step={7}
                  value={form.defaultMaxDelayDays}
                  onChange={(e) => setForm({ ...form, defaultMaxDelayDays: Number(e.target.value) })}
                  className="flex-1 accent-green-700" />
                <span className="text-sm font-semibold w-16 text-right" style={{ color: "var(--accent)" }}>
                  {form.defaultMaxDelayDays}d
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                If a client asks for more time, the agent escalates instead of agreeing.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
            Escalation triggers
          </p>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
            Keywords that always escalate to you (comma-separated)
          </label>
          <textarea value={form.escalationKeywords}
            onChange={(e) => setForm({ ...form, escalationKeywords: e.target.value })}
            rows={3} className="w-full text-sm px-3 py-2.5 rounded-lg resize-none focus:outline-none"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)",
              fontFamily: "var(--font-geist-mono, monospace)" }} />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            If a client message contains any of these words, the agent always stops and flags it — regardless of trust level.
          </p>
        </div>

        <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
            Default tone
          </p>
          <div className="flex gap-2">
            {(["friendly", "firm", "formal"] as const).map((tone) => (
              <button key={tone} type="button"
                onClick={() => setForm({ ...form, defaultTone: tone })}
                className="flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors"
                style={{
                  background: form.defaultTone === tone ? "var(--accent)" : "var(--bg)",
                  color: form.defaultTone === tone ? "white" : "var(--text-secondary)",
                  border: `1px solid ${form.defaultTone === tone ? "var(--accent)" : "var(--border)"}`,
                }}>
                {tone}
              </button>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
            Friendly = warm and casual · Firm = direct and businesslike · Formal = polished
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
            style={{ background: "var(--accent)", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save settings"}
          </button>
          {saved && <span className="text-sm" style={{ color: "var(--accent)" }}>✓ Saved</span>}
        </div>
      </form>
    </div>
  );
}
