"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getContractOwner } from "@/lib/genlayer";
import { useWallet, sameAddr } from "@/lib/wallet";

export function AdminNavLink() {
  const { address } = useWallet();
  const [ownerAddr, setOwnerAddr] = useState<string | null>(null);

  useEffect(() => {
    getContractOwner().then(setOwnerAddr);
  }, []);

  if (!sameAddr(address, ownerAddr)) return null;

  return (
    <Link href="/admin" className="text-muted hover:text-softwhite">Admin</Link>
  );
}
