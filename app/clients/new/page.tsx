"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewClientPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", company: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email) { setError("Name and email are required."); return; }
    setSaving(true);
    setError("");
    const r = await fetch("/api/clients", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await r.json();
    setSaving(false);
    if (!r.ok) { setError(data.error ?? "Failed to create client."); return; }
    router.push(`/clients/${data.id}`);
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <Link href="/" className="text-sm mb-4 inline-block" style={{ color: "var(--text-muted)" }}>← Back</Link>
      <h1 className="text-2xl font-bold tracking-tight mb-1">New client</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        New clients start at Trust Score 20 (Level 0 — Observe only). Every message will be drafted for your approval until you trust the agent with that relationship.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Name *</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Anjali Menon"
            className="w-full text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)",
              ["--tw-ring-color" as string]: "var(--accent)" }} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Email *</label>
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="anjali@example.com"
            className="w-full text-sm px-3 py-2.5 rounded-lg focus:outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Company (optional)</label>
          <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
            placeholder="Acme Studio"
            className="w-full text-sm px-3 py-2.5 rounded-lg focus:outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </div>

        {error && <p className="text-sm px-3 py-2 rounded-lg" style={{ background: "#fee2e2", color: "#dc2626" }}>{error}</p>}

        <div className="pt-2 rounded-xl p-4" style={{ background: "var(--accent-light)", border: "1px solid var(--accent-mid)" }}>
          <p className="text-xs font-semibold mb-1" style={{ color: "var(--accent)" }}>Trust Ladder starts at Level 0</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Every message to this client will be drafted for your approval. As you approve drafts unedited, the trust score rises. At 40 it reaches Level 1, at 75 Level 2.
          </p>
        </div>

        <button type="submit" disabled={saving}
          className="py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity"
          style={{ background: "var(--accent)", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Creating…" : "Create client"}
        </button>
      </form>
    </div>
  );
}
