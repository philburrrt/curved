import { BiRepost } from "react-icons/bi";

import { Repost } from "@/src/types/post";

import { PostCard } from "./PostCard";
import { PostTopBar } from "./PostTopBar";
import { RepostButton } from "./RepostButton";

interface Props {
  post: Repost;
  disableActions?: boolean;
  disableLink?: boolean;
}

export function RepostCard({ post, disableActions, disableLink }: Props) {
  return (
    <div className="w-full space-y-2">
      <div className="flex items-center space-x-2">
        <PostTopBar owner={post.owner} disableLink={disableLink} />
        <BiRepost className="text-lg text-slate-400" />
        <span className="text-sm text-slate-400">
          {post.data.repost?.owner.username ?? post.data.repost?.owner.address}
        </span>
      </div>

      {post.data.repost ? (
        <div className="px-8 py-2">
          <PostCard
            post={post.data.repost}
            disableActions
            disableLink={disableLink}
          />
        </div>
      ) : null}

      <h3 className="px-2 text-sm text-slate-400 md:px-0">
        {post.data.caption}
      </h3>

      {disableActions ? null : (
        <div className="flex items-center justify-end space-x-1 px-2 md:px-0">
          <RepostButton post={post} />
        </div>
      )}
    </div>
  );
}
