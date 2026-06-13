import Link from "next/link";
import { WalletConnectButton } from "./WalletConnectButton";
import { AdminNavLink } from "./AdminNavLink";
import { usingMock } from "@/lib/genlayer";

export function NavBar() {
  return (
    <header className="border-b hairline border-b-bronze/40 bg-ink/80 backdrop-blur sticky top-0 z-30">
      {usingMock && (
        <div className="bg-gold/10 border-b border-gold/30 text-center py-1 text-[10px] font-mono tracking-widest uppercase text-gold">
          Mock mode · no contract address configured · submissions are local only
        </div>
      )}
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-7 h-7 border border-gold rotate-45 flex items-center justify-center">
            <div className="w-2 h-2 bg-gold rotate-45" />
          </div>
          <div>
            <div className="font-display text-lg text-softwhite leading-none">GrantGuard</div>
            <div className="label-eyebrow leading-none mt-0.5">intelligence layer</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-7 font-mono text-[11px] tracking-widest uppercase">
          <Link href="/rounds" className="text-muted hover:text-softwhite">Rounds</Link>
          <Link href="/submit" className="text-muted hover:text-softwhite">Submit</Link>
          <Link href="/my" className="text-muted hover:text-softwhite">My submissions</Link>
          <AdminNavLink />
        </nav>
        <WalletConnectButton />
      </div>
    </header>
  );
}
