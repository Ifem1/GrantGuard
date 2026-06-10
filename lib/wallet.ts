"use client";

import { useEffect, useState } from "react";

const KEY = "gg.wallet";

export function useWallet() {
  const [addr, setAddr] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    if (stored) setAddr(stored);
    const eth = (typeof window !== "undefined" && (window as any).ethereum) as any;
    if (eth?.request) {
      eth.request({ method: "eth_accounts" }).then((accs: string[]) => {
        if (accs?.[0]) {
          setAddr(accs[0]);
          localStorage.setItem(KEY, accs[0]);
        }
      }).catch(() => {});
      eth.on?.("accountsChanged", (accs: string[]) => {
        const a = accs?.[0] ?? null;
        setAddr(a);
        if (a) localStorage.setItem(KEY, a);
        else localStorage.removeItem(KEY);
      });
    }
  }, []);

  async function connect() {
    const eth = (typeof window !== "undefined" && (window as any).ethereum) as any;
    if (eth?.request) {
      try {
        const accs = await eth.request({ method: "eth_requestAccounts" });
        if (accs?.[0]) {
          setAddr(accs[0]);
          localStorage.setItem(KEY, accs[0]);
          return accs[0];
        }
      } catch {}
    }
    // Demo fallback so the UI is testable without a wallet.
    const mock = "0x" + Math.random().toString(16).slice(2, 42).padEnd(40, "0");
    setAddr(mock);
    localStorage.setItem(KEY, mock);
    return mock;
  }

  function disconnect() {
    setAddr(null);
    localStorage.removeItem(KEY);
  }

  return { address: addr, connect, disconnect };
}

export function sameAddr(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}
