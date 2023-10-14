"use client";

import Image from "next/image";
import Link from "next/link";
import { useContractRead } from "wagmi";

import { SHARES_ABI } from "@/lib/abi/shares";
import { env } from "@/lib/env.mjs";
import { formatUnits } from "@/lib/utils";
import Logo from "@/public/images/favicon-16x16.png";

import { useAuth } from "../AuthProvider";

export function RewardsLink() {
  const { user } = useAuth();

  const { data: earned } = useContractRead({
    abi: SHARES_ABI,
    address: env.NEXT_PUBLIC_SHARES_ADDRESS as `0x${string}`,
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
      title="Rewards"
      className="flex items-center space-x-1 rounded-full border border-slate-600 py-0.5 pl-1.5 pr-2 text-sm font-semibold transition hover:border-slate-500 hover:bg-slate-700 active:opacity-90"
    >
      <Image src={Logo} alt="YUYU Logo" />
      <span>
        {earned
          ? Number(formatUnits(earned)).toLocaleString(undefined, {
              useGrouping: true,
            })
          : "0.00"}
      </span>
      <span className="text-slate-400">YUYU</span>
    </Link>
  );
}
