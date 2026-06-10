import Link from "next/link";
import type { GrantRound } from "@/lib/types";
import { StatusPill } from "./StatusPill";

export function GrantRoundCard({ round }: { round: GrantRound }) {
  return (
    <Link
      href={`/rounds/${round.round_id}`}
      className="panel p-6 block hover:border-gold/50 hover:bg-ivory/[0.04] transition group"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="label-eyebrow mb-2">{round.ecosystem}</div>
          <h3 className="font-display text-2xl text-softwhite group-hover:text-gold">{round.title}</h3>
        </div>
        <StatusPill status={round.status} />
      </div>
      <p className="text-muted text-sm leading-relaxed mb-6 line-clamp-2">{round.description}</p>
      <div className="grid grid-cols-3 gap-4 pt-4 border-t hairline border-t-bronze/40">
        <Field label="Pool" value={`$${round.funding_pool.toLocaleString()}`} />
        <Field label="Applicants" value={String(round.applicant_count)} />
        <Field label="Deadline" value={round.deadline} />
      </div>
    </Link>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label-eyebrow mb-1">{label}</div>
      <div className="font-mono text-sm text-softwhite">{value}</div>
    </div>
  );
}
