import Link from "next/link";

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b hairline border-b-bronze/40">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink" />
        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-32 grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-7">
            <div className="label-eyebrow mb-6">GenLayer Studionet · Intelligent Contracts</div>
            <h1 className="font-display text-6xl md:text-7xl leading-[1.02] text-softwhite mb-6">
              The intelligence layer for ecosystem grants.
            </h1>
            <p className="text-lg text-muted max-w-xl leading-relaxed mb-10">
              Review proposals, detect plagiarism, score feasibility, and rank applicants with
              GenLayer-powered consensus. Built for the grant committees who can no longer read
              every submission by hand.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/rounds/new"
                className="bg-gold text-ink font-mono text-xs tracking-widest uppercase px-5 py-3 rounded-sm hover:bg-sand"
              >
                Create grant round
              </Link>
              <Link
                href="/submit"
                className="border border-bronze/60 text-softwhite font-mono text-xs tracking-widest uppercase px-5 py-3 rounded-sm hover:border-gold hover:text-gold"
              >
                Submit proposal
              </Link>
              <Link
                href="/rounds/grant_round_001"
                className="border border-transparent text-muted font-mono text-xs tracking-widest uppercase px-5 py-3 rounded-sm hover:text-softwhite"
              >
                View demo round →
              </Link>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-5">
            <DossierPreview />
          </div>
        </div>
      </section>

      {/* Problem */}
      <Section eyebrow="The problem" title="Grant programmes receive too many proposals to review well.">
        <div className="grid md:grid-cols-2 gap-5 mt-8">
          {[
            "Weak proposals that look polished but are not feasible.",
            "Copy-pasted or AI-generated submissions with little originality.",
            "Applicants recycling the same pitch across ecosystems.",
            "Reviewers spending the most time on the lowest-quality entries.",
            "Subjective ranking without consistent criteria.",
            "No audit trail for why one proposal beat another.",
          ].map((s, i) => (
            <div key={i} className="panel p-5">
              <div className="font-mono text-xs text-gold mb-2">{String(i + 1).padStart(2, "0")}</div>
              <p className="text-sm text-softwhite/90">{s}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* GenLayer */}
      <Section eyebrow="Why GenLayer" title="Proposal review is naturally non-deterministic.">
        <p className="text-muted text-base leading-relaxed max-w-3xl mt-6">
          A normal smart contract can store proposals and votes — but it cannot judge whether a
          proposal is original, whether the team can ship it, whether the budget is reasonable, or
          whether two submissions are suspiciously similar. GrantGuard runs each review through
          GenLayer consensus so those judgements become structured, auditable, and on-chain.
        </p>
        <div className="grid md:grid-cols-3 gap-4 mt-10">
          {[
            ["Feasibility", "AI judges the technical plan against the milestones."],
            ["Originality", "Consensus catches recycled pitches and near-duplicates."],
            ["Ranking", "Risk-adjusted ordering with a written rationale per slot."],
          ].map(([t, d]) => (
            <div key={t} className="panel p-5">
              <div className="label-eyebrow mb-3">{t}</div>
              <p className="text-sm text-softwhite/90">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section eyebrow="How it works" title="From submission to shortlist in four steps.">
        <ol className="grid md:grid-cols-4 gap-4 mt-8">
          {[
            ["Submit", "Builders submit a structured proposal. A hash is committed on-chain."],
            ["Review", "GenLayer consensus scores each proposal across six weighted criteria."],
            ["Compare", "A similarity pass flags suspicious overlaps within the round."],
            ["Rank", "Risk-adjusted rankings feed the committee dashboard with rationales."],
          ].map(([t, d], i) => (
            <li key={t} className="panel p-5">
              <div className="font-mono text-gold text-xs mb-2">STEP {i + 1}</div>
              <div className="font-display text-xl text-softwhite mb-2">{t}</div>
              <p className="text-sm text-muted leading-relaxed">{d}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Use cases */}
      <Section eyebrow="Built for" title="The teams that already drown in proposals.">
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {[
            "Ecosystem grant committees",
            "DAO public-goods funds",
            "Hackathon organisers",
            "Accelerator programmes",
            "Retroactive funding rounds",
            "Treasury allocation teams",
          ].map((u) => (
            <div key={u} className="panel p-5 text-softwhite text-sm">— {u}</div>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <section className="border-t hairline border-t-bronze/40 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <h2 className="font-display text-4xl text-softwhite mb-4">Make grant review legible again.</h2>
          <p className="text-muted max-w-xl mx-auto mb-8">
            Spin up a round, point your applicants at it, let GenLayer do the heavy reading.
          </p>
          <Link
            href="/admin/rounds/new"
            className="inline-block bg-gold text-ink font-mono text-xs tracking-widest uppercase px-6 py-3 rounded-sm hover:bg-sand"
          >
            Start your first round
          </Link>
        </div>
      </section>
    </div>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="max-w-7xl mx-auto px-6 py-20 border-b hairline border-b-bronze/40">
      <div className="label-eyebrow mb-3">{eyebrow}</div>
      <h2 className="font-display text-4xl text-softwhite max-w-3xl">{title}</h2>
      {children}
    </section>
  );
}

function DossierPreview() {
  return (
    <div className="panel-ivory p-6 shadow-2xl rotate-1 hover:rotate-0 transition">
      <div className="flex justify-between items-start mb-4 pb-4 border-b border-bronze/30">
        <div>
          <div className="text-[10px] tracking-widest uppercase text-bronze font-mono">Review Dossier</div>
          <div className="font-display text-xl text-ink mt-1">ProofAid</div>
          <div className="text-xs text-bronze">Atlas Labs · $28,000 requested</div>
        </div>
        <div className="font-display text-5xl text-moss tabular-nums">87<span className="text-xs text-bronze">/100</span></div>
      </div>
      <div className="space-y-3">
        {[
          ["Originality", 85],
          ["Feasibility", 88],
          ["Alignment", 92],
          ["Team", 84],
        ].map(([l, v]) => (
          <div key={l as string}>
            <div className="flex justify-between text-[10px] font-mono text-bronze uppercase tracking-widest">
              <span>{l}</span><span>{v}</span>
            </div>
            <div className="h-1 bg-bronze/20 mt-1 rounded-sm overflow-hidden">
              <div className="h-full bg-moss" style={{ width: `${v}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 pt-4 border-t border-bronze/30 flex justify-between text-[10px] font-mono uppercase tracking-widest text-bronze">
        <span>Plag: LOW · Deliv: LOW</span>
        <span className="text-moss">ACCEPT</span>
      </div>
    </div>
  );
}
