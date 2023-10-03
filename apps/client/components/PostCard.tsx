import { Post, PostType } from "@/src/types/post";

import { NftPostCard } from "./NftPostCard";
import { RepostCard } from "./RepostCard";

interface Props {
  post: Post;
  disableActions?: boolean;
  disableLink?: boolean;
}

export function PostCard({ post, disableActions, disableLink }: Props) {
  switch (post.type) {
    case PostType.Post: {
      return (
        <NftPostCard
          post={post}
          disableActions={disableActions}
          disableLink={disableLink}
        />
      );
    }

    case PostType.Repost: {
      return (
        <RepostCard
          post={post}
          disableActions={disableActions}
          disableLink={disableLink}
        />
      );
    }
  }
}
