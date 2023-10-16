"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { formatEther } from "viem";

import { useMarket } from "@/hooks/useMarket";
import { ETH_SYMBOL } from "@/lib/utils";

interface Props {
  shareId: number;
}

export function TradeButtons({ shareId }: Props) {
  const {
    buy,
    sell,
    waitingForBuy,
    waitingForSell,
    doneBuying,
    doneSelling,
    buyPrice,
    sellPrice,
    isPrepareBuyError,
    isPrepareSellError,
    isReadError,
    isBuyLoading,
    isReadLoading,
    isSellLoading,
    shareBalance,
  } = useMarket(shareId);

  const router = useRouter();

  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;

    if (doneBuying || doneSelling) {
      // Delay to give indexer time to update
      timeout = setTimeout(() => {
        router.refresh();
      }, 5000);
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [router, doneBuying, doneSelling]);

  const canSell = shareBalance && sellPrice;

  const disableBuy = !buy || isBuyLoading || isReadLoading || isPrepareBuyError;
  const disableSell =
    !sell || isSellLoading || isReadLoading || isPrepareSellError;

  return (
    <div className="mx-3 space-y-1 md:mx-0">
      <div className="flex w-full space-x-2">
        <div className="w-full space-y-1">
          <button
            title="Buy post"
            disabled={disableBuy}
            onClick={() => {
              if (!disableBuy && buy) {
                buy();
              }
            }}
            className={`w-full rounded-lg bg-sky-600 py-2 text-lg font-bold transition ${
              disableBuy ? "opacity-50" : "hover:bg-sky-500 active:scale-95"
            }`}
          >
            Buy
          </button>

          <p className="text-center text-sm text-slate-400">
            {isReadError || isPrepareBuyError
              ? "Error"
              : !buyPrice
              ? ""
              : `${formatEther(buyPrice)} ${ETH_SYMBOL}`}
          </p>

          <div className="h-5">
            {waitingForBuy ? (
              <p className="text-center text-sm text-slate-400">
                Waiting for transaction...
              </p>
            ) : doneBuying ? (
              <p className="text-center text-sm text-sky-400">
                Successfully bought post! 🎉
              </p>
            ) : null}
          </div>
        </div>

        {canSell ? (
          <div className="w-full space-y-1">
            <button
              title="Sell post"
              disabled={disableSell}
              onClick={() => {
                if (!disableSell && sell) {
                  sell();
                }
              }}
              className={`w-full rounded-lg bg-amber-600 py-2 text-lg font-bold transition ${
                disableSell
                  ? "cursor-default opacity-50"
                  : "hover:bg-amber-500 active:scale-95"
              }`}
            >
              Sell
            </button>

            <p className="text-center text-sm text-slate-400">
              {isReadError || isPrepareSellError
                ? "Error"
                : !sellPrice
                ? ""
                : `${formatEther(sellPrice)} ${ETH_SYMBOL}`}
            </p>

            <div className="h-5">
              {waitingForSell ? (
                <p className="text-center text-sm text-slate-400">
                  Waiting for transaction...
                </p>
              ) : doneSelling ? (
                <p className="text-center text-sm text-amber-400">
                  Successfully sold post! 🎉
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
