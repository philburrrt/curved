"use client";

import { useEffect, useState } from "react";
import { useContractRead } from "wagmi";

import { TOKEN_ABI } from "@/lib/abi/token";
import { env } from "@/lib/env.mjs";
import { formatUnits } from "@/lib/utils";

export const useBalance = (address: string) => {
  const [formattedBalance, setFormattedBalance] = useState<string>();
  const {
    data: balance,
    isLoading: dataLoading,
    isError: dataError,
  } = useContractRead({
    abi: TOKEN_ABI,
    address: env.NEXT_PUBLIC_TOKEN_ADDRESS as `0x${string}`,
    args: [address as `0x${string}`],
    enabled: Boolean(address),
    functionName: "balanceOf",
    watch: true,
  });

  useEffect(() => {
    if (balance) {
      setFormattedBalance(formatUnits(balance));
    }
  }, [balance]);

  return {
    balance,
    dataError,
    dataLoading,
    formattedBalance,
  };
};
