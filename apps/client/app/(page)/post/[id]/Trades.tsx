import Image from "next/image";
import Link from "next/link";

import Avatar from "@/components/Avatar";
import { db } from "@/lib/db";
import { getAvatarUrl } from "@/lib/getAvatarUrl";
import { ETH_SYMBOL, formatAddress, formatUnits } from "@/lib/utils";

import etherscan from "./etherscan-logo-circle-light.svg";

interface Props {
  shareId: number;
}

export async function Trades({ shareId }: Props) {
  const trades = await db.query.trade.findMany({
    columns: {
      amount: true,
      hash: true,
      price: true,
      side: true,
      trader: true,
    },
    limit: 8,
    orderBy: (row, { desc }) => desc(row.id),
    where: (row, { eq }) => eq(row.shareId, shareId),
  });

  const traders = trades.map((trade) => trade.trader);

  const profiles =
    traders.length > 0
      ? await db.query.user.findMany({
          columns: {
            address: true,
            avatarId: true,
            username: true,
          },
          where: (row, { inArray }) => inArray(row.address, traders),
        })
      : [];

  const withProfiles = trades.map((trade) => {
    const profile = profiles.find(
      (profile) => profile.address.toLowerCase() === trade.trader.toLowerCase(),
    );

    return {
      ...trade,
      trader: {
        address: trade.trader,
        avatar: getAvatarUrl(profile?.avatarId),
        username: profile?.username ?? null,
      },
    };
  });

  return (
    <div className="bg-slate-900/50 py-2 md:rounded-lg">
      <ul className="space-y-2 px-3">
        {withProfiles.map((trade) => {
          const sign = trade.side === 0 ? "+" : "-";
          const verb = trade.side === 0 ? "bought" : "sold";
          const price = BigInt(trade.price);
          const amount = trade.amount;
          const hash = trade.hash;

          return (
            <li key={hash} className="flex items-center space-x-1 text-sm">
              {trade.trader.username ? (
                <Link
                  href={`/@${trade.trader.username}`}
                  className="flex items-center space-x-1 font-bold hover:underline"
                >
                  <Avatar
                    uniqueKey={trade.trader.username}
                    size={24}
                    src={trade.trader.avatar}
                    draggable={false}
                  />
                  <span>{trade.trader.username}</span>
                </Link>
              ) : (
                <>
                  <Avatar
                    uniqueKey={trade.trader.address}
                    size={24}
                    draggable={false}
                  />
                  <span>{formatAddress(trade.trader.address)}</span>
                </>
              )}

              <div className="space-x-1">
                <span className="text-slate-400">{verb}</span>
                <span className="font-bold text-white">{amount}</span>
                <span className="text-slate-400">
                  post{amount > 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex w-full items-center justify-end space-x-2">
                <div
                  className={`text-sm ${
                    sign === "+" ? "text-sky-500" : "text-amber-500"
                  }`}
                >
                  {sign}
                  {formatUnits(price, 4)} {ETH_SYMBOL}
                </div>

                <Link
                  title="View on Etherscan"
                  href={`https://etherscan.io/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:opacity-80 active:opacity-70"
                >
                  <Image
                    src={etherscan}
                    width={16}
                    height={16}
                    alt="Etherscan"
                  />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
