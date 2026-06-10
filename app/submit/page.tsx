"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getRounds, getRound, hashProposal, submitProposal, usingMock } from "@/lib/genlayer";
import { mockRounds } from "@/lib/mockData";
import type { GrantRound } from "@/lib/types";

export default function SubmitPageWrapper() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-6 py-20 text-muted font-mono text-sm">Loading…</div>}>
      <SubmitPage />
    </Suspense>
  );
}

function SubmitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rounds, setRounds] = useState<GrantRound[]>([]);
  const openRounds = rounds.filter((r) => r.status === "Open" || r.status === "Reviewing");
  const initialRound = searchParams.get("round") ?? "";
  const [form, setForm] = useState({
    round_id: initialRound,
    project_name: "",
    team_name: "",
    wallet: "",
    contact: "",
    summary: "",
    problem: "",
    solution: "",
    why_ecosystem: "",
    architecture: "",
    milestones: "",
    timeline: "",
    budget: 20000,
    team_background: "",
    prior_work: "",
    links: "",
    disclosure: "",
    honesty: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      // getRounds() returns chain-only rounds in live mode; mock data only in mock mode.
      const visible = await getRounds();
      setRounds(visible);
      if (!form.round_id) {
        const firstOpen = visible.find((r) => r.status === "Open") ?? visible.find((r) => r.status === "Reviewing");
        if (firstOpen) setForm((f) => ({ ...f, round_id: firstOpen.round_id }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm({ ...form, [k]: v });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.honesty) {
      alert("Please confirm the honesty statement.");
      return;
    }
    const selected = rounds.find((r) => r.round_id === form.round_id);
    if (!selected) {
      alert("Pick a grant round.");
      return;
    }
    if (selected.status !== "Open" && selected.status !== "Reviewing") {
      alert(`This round is in "${selected.status}" status and is not accepting submissions.`);
      return;
    }
    if (selected.status === "Reviewing") {
      const ok = confirm("This round is already under review. Late submissions are allowed but reviews are already in flight. Continue?");
      if (!ok) { return; }
    }
    // Live-mode pre-flight: confirm the round actually exists on-chain before asking
    // the user to sign a transaction that would otherwise revert.
    if (!usingMock) {
      const onchain = await getRound(form.round_id);
      if (!onchain) {
        alert(
          `Round "${form.round_id}" doesn't exist on the deployed contract yet. ` +
          `Ask the round creator to call create_round, or create one yourself at /admin/rounds/new.`
        );
        return;
      }
    }
    setSubmitting(true);
    const id = "proposal_" + Math.random().toString(16).slice(2, 8);
    const hash = hashProposal({
      project_name: form.project_name,
      summary: form.summary,
      solution: form.solution,
      wallet: form.wallet,
    });
    const newProposal = {
      proposal_id: id,
      round_id: form.round_id,
      project_name: form.project_name,
      team_name: form.team_name,
      wallet: form.wallet,
      contact: form.contact,
      summary: form.summary,
      problem: form.problem,
      solution: form.solution,
      why_ecosystem: form.why_ecosystem,
      architecture: form.architecture,
      milestones: form.milestones,
      timeline: form.timeline,
      budget: Number(form.budget),
      team_background: form.team_background,
      prior_work: form.prior_work,
      links: form.links,
      disclosure: form.disclosure,
      honesty_confirmed: true,
      proposal_hash: hash,
      status: "SUBMITTED" as const,
      submitted_at: new Date().toISOString().slice(0, 10),
    };
    try {
      const { txHash } = await submitProposal(newProposal);
      try {
        const existing = JSON.parse(localStorage.getItem("gg.proposals") ?? "[]");
        localStorage.setItem("gg.proposals", JSON.stringify([newProposal, ...existing]));
      } catch {}
      if (txHash) {
        try { localStorage.setItem(`gg.tx.${id}`, txHash); } catch {}
      }
      router.push(`/proposals/${id}`);
    } catch (err: any) {
      setSubmitting(false);
      alert(`Submission failed: ${err?.message ?? String(err)}`);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="label-eyebrow mb-2">Submit proposal</div>
      <h1 className="font-display text-4xl text-softwhite mb-2">Apply for a grant</h1>
      <p className="text-muted mb-6">
        Your proposal is hashed and submitted to the GrantGuard intelligent contract on GenLayer. Be specific —
        vague pitches score poorly.
      </p>

      {usingMock && (
        <div className="panel p-4 mb-6 border-l-2 border-l-gold">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] tracking-widest uppercase text-gold">Mock mode</span>
          </div>
          <p className="text-sm text-softwhite/90">
            No <span className="font-mono">NEXT_PUBLIC_GRANTGUARD_CONTRACT</span> is set, so submissions are stored
            locally instead of on Studionet. You will not be asked to sign a transaction and nothing will appear on the
            GenLayer explorer. Deploy{" "}
            <span className="font-mono">contracts/GrantGuardProtocol.py</span> and add the address to{" "}
            <span className="font-mono">.env.local</span> to enable real on-chain submission.
          </p>
        </div>
      )}

      {openRounds.length === 0 && rounds.length > 0 && (
        <div className="panel p-4 mb-6 border-l-2 border-l-rust">
          <div className="font-mono text-[10px] tracking-widest uppercase text-rust mb-1">No open rounds</div>
          <p className="text-sm text-softwhite/90">
            None of the existing rounds are currently accepting submissions.{" "}
            <Link href="/admin/rounds/new" className="text-gold hover:underline">Create one</Link>.
          </p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">
        <Group title="Round">
          <Select label="Grant round (Open or Reviewing)" value={form.round_id} onChange={(v) => set("round_id", v)}>
            <option value="" disabled>Select a round…</option>
            {openRounds.map((r) => (
              <option key={r.round_id} value={r.round_id}>
                {r.title} — {r.ecosystem}{r.status === "Reviewing" ? " · LATE" : ""}
              </option>
            ))}
          </Select>
          {rounds.length > 0 && openRounds.length < rounds.length && (
            <p className="text-xs text-muted font-mono mt-2">
              {rounds.length - openRounds.length} round(s) hidden because they are Finalised or Archived.
            </p>
          )}
          {openRounds.some((r) => r.status === "Reviewing") && (
            <p className="text-xs text-gold font-mono mt-2">
              Rounds tagged LATE are already under review — submissions are accepted but reviews are in flight.
            </p>
          )}
        </Group>

        <Group title="Project">
          <Field label="Project name" value={form.project_name} onChange={(v) => set("project_name", v)} required />
          <Field label="Team name" value={form.team_name} onChange={(v) => set("team_name", v)} />
          <Field label="Applicant wallet" value={form.wallet} onChange={(v) => set("wallet", v)} placeholder="0x…" />
          <Field label="Contact (email or Telegram)" value={form.contact} onChange={(v) => set("contact", v)} />
          <Field label="Short summary" value={form.summary} onChange={(v) => set("summary", v)} required textarea rows={2} />
        </Group>

        <Group title="Substance">
          <Field label="Problem statement" value={form.problem} onChange={(v) => set("problem", v)} textarea rows={4} />
          <Field label="Proposed solution" value={form.solution} onChange={(v) => set("solution", v)} textarea rows={4} />
          <Field label="Why this ecosystem?" value={form.why_ecosystem} onChange={(v) => set("why_ecosystem", v)} textarea rows={3} />
          <Field label="Technical architecture" value={form.architecture} onChange={(v) => set("architecture", v)} textarea rows={4} />
        </Group>

        <Group title="Delivery">
          <Field label="Milestones" value={form.milestones} onChange={(v) => set("milestones", v)} textarea rows={4} />
          <Field label="Timeline" value={form.timeline} onChange={(v) => set("timeline", v)} placeholder="e.g. 12 weeks" />
          <Field label="Budget requested (USD)" value={String(form.budget)} onChange={(v) => set("budget", Number(v) || 0)} type="number" />
        </Group>

        <Group title="Team & history">
          <Field label="Team background" value={form.team_background} onChange={(v) => set("team_background", v)} textarea rows={3} />
          <Field label="Previous work links" value={form.prior_work} onChange={(v) => set("prior_work", v)} />
          <Field label="GitHub / demo / website" value={form.links} onChange={(v) => set("links", v)} />
          <Field
            label="Similar projects or prior submissions disclosure"
            value={form.disclosure}
            onChange={(v) => set("disclosure", v)}
            textarea
            rows={3}
          />
        </Group>

        <div className="panel p-5">
          <label className="flex gap-3 items-start cursor-pointer">
            <input
              type="checkbox"
              checked={form.honesty}
              onChange={(e) => set("honesty", e.target.checked)}
              className="mt-1 accent-gold"
            />
            <span className="text-sm text-softwhite/90">
              I confirm this proposal is original, or I have disclosed any reused material, prior submissions, and external sources.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting || openRounds.length === 0 || !form.round_id}
          className="w-full bg-gold text-ink font-mono text-xs tracking-widest uppercase py-3.5 rounded-sm hover:bg-sand disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting
            ? usingMock ? "Saving locally…" : "Submitting to GenLayer…"
            : usingMock ? "Submit proposal · mock (no signature)" : "Submit proposal · hash & sign"}
        </button>
      </form>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="panel p-6">
      <legend className="label-eyebrow px-2">{title}</legend>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}

function Field({
  label, value, onChange, textarea, rows, required, type, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  rows?: number;
  required?: boolean;
  type?: string;
  placeholder?: string;
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
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-ink border border-bronze/50 rounded-sm px-3 py-2 text-sm font-mono text-softwhite focus:border-gold outline-none"
        />
      )}
    </label>
  );
}

function Select({
  label, value, onChange, children,
}: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label-eyebrow block mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-ink border border-bronze/50 rounded-sm px-3 py-2 text-sm font-mono text-softwhite focus:border-gold outline-none"
      >
        {children}
      </select>
    </label>
  );
}
