"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRound } from "@/lib/genlayer";
import { DEFAULT_WEIGHTS } from "@/lib/scoring";
import { useWallet } from "@/lib/wallet";

export default function NewRoundPage() {
  const router = useRouter();
  const { address, connect } = useWallet();
  const [form, setForm] = useState({
    title: "",
    ecosystem: "",
    description: "",
    funding_pool: 100000,
    deadline: "2026-12-31",
    plagiarism_sensitivity: "HIGH" as "LOW" | "MEDIUM" | "HIGH",
    visibility: "public" as "public" | "private",
    weights: { ...DEFAULT_WEIGHTS },
    min_score: 50,
  });
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    let creator = address;
    if (!creator) creator = await connect();
    setSubmitting(true);
    const id = "grant_round_" + Math.random().toString(16).slice(2, 8);
    try {
      await createRound({
        round_id: id,
        title: form.title,
        ecosystem: form.ecosystem,
        description: form.description,
        funding_pool: Number(form.funding_pool),
        deadline: form.deadline,
        criteria_weights: form.weights,
        plagiarism_sensitivity: form.plagiarism_sensitivity,
        visibility: form.visibility,
        status: "Open",
        applicant_count: 0,
        creator: creator ?? undefined,
      });
      try {
        const created = JSON.parse(localStorage.getItem("gg.myRounds") ?? "[]");
        localStorage.setItem("gg.myRounds", JSON.stringify([id, ...created]));
      } catch {}
      router.push(`/rounds/${id}`);
    } catch (err: any) {
      setSubmitting(false);
      alert(`Create round failed: ${err?.message ?? String(err)}`);
    }
  }

  const wsum = Object.values(form.weights).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="label-eyebrow mb-2">Admin</div>
      <h1 className="font-display text-4xl text-softwhite mb-2">Create grant round</h1>
      <p className="text-muted mb-10">Open a new round, define criteria weights, and publish it for submissions.</p>

      <form onSubmit={submit} className="space-y-6">
        <fieldset className="panel p-6">
          <legend className="label-eyebrow px-2">Basics</legend>
          <div className="space-y-4">
            <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
            <Field label="Ecosystem / organisation" value={form.ecosystem} onChange={(v) => setForm({ ...form, ecosystem: v })} required />
            <Field
              label="Description"
              value={form.description}
              onChange={(v) => setForm({ ...form, description: v })}
              textarea
              rows={3}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Funding pool (USD)"
                value={String(form.funding_pool)}
                onChange={(v) => setForm({ ...form, funding_pool: Number(v) || 0 })}
                type="number"
              />
              <Field
                label="Deadline"
                value={form.deadline}
                onChange={(v) => setForm({ ...form, deadline: v })}
                type="date"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="panel p-6">
          <legend className="label-eyebrow px-2">Scoring weights (sum = {wsum})</legend>
          <div className="space-y-3">
            {(Object.keys(form.weights) as (keyof typeof form.weights)[]).map((k) => (
              <div key={k} className="flex items-center gap-4">
                <span className="label-eyebrow w-48">{k.replace(/_/g, " ")}</span>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={form.weights[k]}
                  onChange={(e) =>
                    setForm({ ...form, weights: { ...form.weights, [k]: Number(e.target.value) } })
                  }
                  className="flex-1 accent-gold"
                />
                <span className="font-mono text-sm text-softwhite w-10 text-right">{form.weights[k]}%</span>
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset className="panel p-6">
          <legend className="label-eyebrow px-2">Policy</legend>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="label-eyebrow block mb-1.5">Plagiarism sensitivity</span>
              <select
                value={form.plagiarism_sensitivity}
                onChange={(e) => setForm({ ...form, plagiarism_sensitivity: e.target.value as any })}
                className="w-full bg-ink border border-bronze/50 rounded-sm px-3 py-2 text-sm font-mono text-softwhite"
              >
                <option>LOW</option><option>MEDIUM</option><option>HIGH</option>
              </select>
            </label>
            <label className="block">
              <span className="label-eyebrow block mb-1.5">Visibility</span>
              <select
                value={form.visibility}
                onChange={(e) => setForm({ ...form, visibility: e.target.value as any })}
                className="w-full bg-ink border border-bronze/50 rounded-sm px-3 py-2 text-sm font-mono text-softwhite"
              >
                <option value="public">public</option>
                <option value="private">private</option>
              </select>
            </label>
            <Field
              label="Minimum feasibility score"
              value={String(form.min_score)}
              onChange={(v) => setForm({ ...form, min_score: Number(v) || 0 })}
              type="number"
            />
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gold text-ink font-mono text-xs tracking-widest uppercase py-3.5 rounded-sm hover:bg-sand disabled:opacity-50"
        >
          {submitting ? "Creating round on GenLayer…" : "Create round"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label, value, onChange, textarea, rows, required, type,
}: {
  label: string; value: string; onChange: (v: string) => void; textarea?: boolean; rows?: number; required?: boolean; type?: string;
}) {
  return (
    <label className="block">
      <span className="label-eyebrow block mb-1.5">{label}{required && " *"}</span>
      {textarea ? (
        <textarea
          value={value}
          required={required}
          rows={rows ?? 3}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-ink border border-bronze/50 rounded-sm px-3 py-2 text-sm text-softwhite focus:border-gold outline-none"
        />
      ) : (
        <input
          type={type ?? "text"}
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-ink border border-bronze/50 rounded-sm px-3 py-2 text-sm font-mono text-softwhite focus:border-gold outline-none"
        />
      )}
    </label>
  );
}
