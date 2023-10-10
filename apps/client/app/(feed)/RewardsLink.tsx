"use client";

import Link from "next/link";
import { useContractRead } from "wagmi";

import { CURVED_ABI } from "@/lib/abi/curved";
import { env } from "@/lib/env.mjs";
import { formatUnits } from "@/lib/utils";

import { useAuth } from "../AuthProvider";

export function RewardsLink() {
  const { user } = useAuth();

  const { data: earned } = useContractRead({
    abi: CURVED_ABI,
    address: env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`,
    args: user ? [user.address] : undefined,
    enabled: Boolean(user),
    functionName: "earned",
  });

  if (!user) {
    return null;
  }

  return (
    <Link
      href="/rewards"
      className="flex items-center space-x-0.5 rounded-full border border-slate-600 px-3 py-0.5 text-sm font-semibold text-slate-400 transition active:bg-slate-700"
    >
      <span>{earned ? formatUnits(earned) : "0.00"}</span>
      <span>YUYU</span>
    </Link>
  );
}