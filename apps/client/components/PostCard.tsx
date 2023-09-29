"use client";

import Image from "next/image";
import Link from "next/link";
import { BiRepost } from "react-icons/bi";

import { usePostPrice } from "@/hooks/usePostPrice";

import Avatar from "./Avatar";

interface Props {
  shareId: number;
  url: string;
  owner: string;
  caption: string;
  avatar?: string | null;
  username?: string | null;
}

export function PostCard({
  url,
  avatar,
  username,
  owner,
  shareId,
  caption,
}: Props) {
  const numReposts = 5;

  const { price, isError } = usePostPrice(shareId);

  return (
    <div className="w-full space-y-2">
      <div className="flex select-none items-center justify-between">
        <div className="w-2/3">
          {username ? (
            <Link
              href={`/@${username}`}
              className="flex w-fit items-center space-x-2 pr-2"
            >
              <Avatar src={avatar} uniqueKey={username} size={32} />
              <span className="text-sm font-bold">{username}</span>
            </Link>
          ) : (
            <div className="flex items-center space-x-2">
              <Avatar src={avatar} uniqueKey={owner} size={32} />
              <span className="truncate text-sm font-bold">{owner}</span>
            </div>
          )}
        </div>

        {price ? (
          <div className="text-sm text-slate-400">{price} ETH</div>
        ) : isError ? (
          <div className="text-sm text-slate-400">???</div>
        ) : null}
      </div>

      {url && (
        <Image
          src={url}
          alt="Post image"
          width={0}
          height={0}
          sizes="517px"
          draggable={false}
          priority
          className="h-auto max-h-[1000px] w-full rounded-lg object-contain"
        />
      )}

      <h3 className="text-sm text-slate-400">{caption}</h3>

      <div className="flex items-center justify-between">
        <div className="w-full"></div>

        <div className="flex items-center justify-end space-x-1">
          <button
            title="Repost"
            className="group flex items-center space-x-0.5 rounded-full px-1 transition hover:text-sky-300"
          >
            {numReposts ? <span className="text-sm">{numReposts}</span> : null}
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-2xl text-slate-400 transition group-hover:bg-slate-700 group-hover:text-sky-300 group-active:bg-slate-600">
              <BiRepost />
            </span>
          </button>

          <button className="h-8 space-x-1 rounded-full border border-slate-500 px-4 transition hover:border-slate-400 hover:bg-slate-700 active:bg-slate-600">
            Trade
          </button>
        </div>
      </div>
    </div>
  );
}
