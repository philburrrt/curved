import { formatEther } from "viem";
import { useContractRead } from "wagmi";

import { SHARES_ABI } from "@/lib/abi/shares";
import { env } from "@/lib/env.mjs";

export function usePostPrice(shareId: number) {
  const { data, isLoading, isError } = useContractRead({
    abi: SHARES_ABI,
    address: env.NEXT_PUBLIC_SHARES_ADDRESS as `0x${string}`,
    args: [BigInt(shareId), BigInt(1)],
    functionName: "getBuyPriceAfterFee",
    suspense: true,
  });

  const price = data ? formatEther(data) : null;

  return { isError, isLoading, price };
}
