"use client";

import { useEffect, useState } from "react";
import { useContractRead } from "wagmi";

import { CURVED_ABI } from "@/lib/abi/curved";
import { formatUnits } from "@/lib/utils";

export const useBalance = (address: string) => {
  const [formattedBalance, setFormattedBalance] = useState<string>();
  const {
    data: balance,
    isLoading: dataLoading,
    isError: dataError,
  } = useContractRead({
    abi: CURVED_ABI,
    address: process.env.NEXT_PUBLIC_CURVED_ADDRESS as `0x${string}`,
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