import Link from "next/link";

import { Post } from "@/src/types/post";

import Avatar from "./Avatar";

interface Props {
  owner: Post["owner"];
  disableLink?: boolean;
}

export function PostTopBar({ owner, disableLink }: Props) {
  if (owner.username) {
    if (disableLink) {
      return (
        <div className="flex items-center space-x-2">
          <Avatar src={owner.avatar} uniqueKey={owner.username} size={32} />
          <span className="text-sm font-bold">{owner.username}</span>
        </div>
      );
    }

    return (
      <Link
        href={`/@${owner.username}`}
        className="flex w-fit items-center space-x-2 hover:underline"
      >
        <Avatar src={owner.avatar} uniqueKey={owner.username} size={32} />
        <span className="text-sm font-bold">{owner.username}</span>
      </Link>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Avatar src={owner.avatar} uniqueKey={owner.address} size={32} />
      <span className="truncate text-sm font-bold">{owner.address}</span>
    </div>
  );
}
