"use client";
import {
  useContractRead,
  useContractWrite,
  usePrepareContractWrite,
  useWaitForTransaction,
} from "wagmi";

import { SHARES_ABI } from "@/lib/abi/shares";
import { env } from "@/lib/env.mjs";

const contract = {
  abi: SHARES_ABI,
  address: env.NEXT_PUBLIC_SHARES_ADDRESS as `0x${string}`,
};

export const useRewards = (address: `0x${string}` | undefined) => {
  const {
    data: earned,
    isLoading: dataLoading,
    isError: dataError,
  } = useContractRead({
    ...contract,
    args: address ? [address] : undefined,
    enabled: Boolean(address),
    functionName: "earned",
    suspense: true,
    watch: true,
  });

  const { config } = usePrepareContractWrite({
    ...contract,
    enabled: Boolean(address),
    functionName: "getReward",
  });

  const {
    write: getReward,
    isLoading: isGetRewardLoading,
    isError: isGetRewardError,
    data: claimData,
  } = useContractWrite(config);

  const {
    isLoading: isWaitForTransactionLoading,
    isSuccess: isWaitForTransactionSuccess,
  } = useWaitForTransaction({
    enabled: Boolean(claimData?.hash),
    hash: claimData?.hash,
  });

  return {
    read: {
      dataError,
      dataLoading,
      earned,
    },
    write: {
      getReward,
      isTransactionSuccess: isWaitForTransactionSuccess,
      isWaitingForTransaction: isWaitForTransactionLoading,
      methodError: isGetRewardError,
      methodLoading: isGetRewardLoading,
    },
  };
};
