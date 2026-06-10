"use client";

import { useState } from "react";

export function WalletConnectButton() {
  const [addr, setAddr] = useState<string | null>(null);

  async function connect() {
    const eth = (typeof window !== "undefined" && (window as any).ethereum) as any;
    if (eth?.request) {
      try {
        const accs = await eth.request({ method: "eth_requestAccounts" });
        if (accs?.[0]) return setAddr(accs[0]);
      } catch {}
    }
    setAddr("0x" + Math.random().toString(16).slice(2, 42).padEnd(40, "0"));
  }

  return (
    <button
      onClick={connect}
      className="font-mono text-[11px] tracking-widest uppercase border border-bronze/50 text-softwhite hover:border-gold hover:text-gold px-3 py-1.5 rounded-sm"
    >
      {addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "Connect wallet"}
    </button>
  );
}
