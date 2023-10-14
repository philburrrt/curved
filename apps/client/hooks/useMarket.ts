"use client";
import {
  useAccount,
  useContractReads,
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

export const useMarket = (shareId: number) => {
  const { address } = useAccount();

  const {
    data,
    isLoading: isReadLoading,
    isError: isReadError,
  } = useContractReads({
    contracts: [
      {
        ...contract,
        args: [BigInt(shareId), BigInt(1)],
        functionName: "getBuyPriceAfterFee",
      },
      {
        ...contract,
        args: [BigInt(shareId), BigInt(1)],
        functionName: "getSellPriceAfterFee",
      },
      {
        ...contract,
        args: [BigInt(shareId), address as `0x${string}`],
        functionName: "getShareBalance",
      },
    ],
    enabled: Boolean(address),
    suspense: true,
    watch: true,
  });

  const buyPrice = data ? data[0].result : undefined;
  const sellPrice = data ? data[1].result : undefined;
  const shareBalance = data ? data[2].result : undefined;

  const {
    config: buyConfig,
    isLoading: isPrepareBuyLoading,
    isError: isPrepareBuyError,
  } = usePrepareContractWrite({
    ...contract,
    args: [BigInt(shareId), BigInt(1)],
    enabled: Boolean(address) && Boolean(buyPrice),
    functionName: "buyShare",
    value: buyPrice,
  });

  const {
    config: sellConfig,
    isLoading: isPrepareSellLoading,
    isError: isPrepareSellError,
  } = usePrepareContractWrite({
    ...contract,
    args: [BigInt(shareId), BigInt(1)],
    enabled: Boolean(address) && Boolean(sellPrice) && Boolean(shareBalance),
    functionName: "sellShare",
  });

  const {
    write: buy,
    isLoading: isBuyLoading,
    data: buyResult,
  } = useContractWrite(buyConfig);
  const {
    write: sell,
    isLoading: isSellLoading,
    data: sellResult,
  } = useContractWrite(sellConfig);

  const { isSuccess: doneBuying, isLoading: waitingForBuy } =
    useWaitForTransaction({
      enabled: Boolean(buyResult),
      hash: buyResult?.hash,
    });
  const { isSuccess: doneSelling, isLoading: waitingForSell } =
    useWaitForTransaction({
      enabled: Boolean(sellResult),
      hash: sellResult?.hash,
    });

  return {
    buy,
    buyPrice,
    doneBuying,
    doneSelling,
    isBuyLoading: isBuyLoading || isPrepareBuyLoading,
    isPrepareBuyError,
    isPrepareSellError,
    isReadError,
    isReadLoading,
    isSellLoading: isSellLoading || isPrepareSellLoading,
    sell,
    sellPrice,
    shareBalance,
    waitingForBuy,
    waitingForSell,
  };
};
