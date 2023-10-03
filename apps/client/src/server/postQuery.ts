import { nftPost, post, repost, user } from "db";
import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";

import { db } from "@/lib/db";
import { getAvatarUrl } from "@/lib/getAvatarUrl";
import { Post, PostType } from "@/src/types/post";

const repostPost = alias(post, "repostPost");
const repostUser = alias(user, "repostUser");
const repostNftPost = alias(nftPost, "repostNftPost");
const repostRepost = alias(repost, "repostRepost");

export const postQuery = db
  .select({
    createdAt: post.createdAt,
    id: post.publicId,
    nftCaption: nftPost.caption,
    nftShareId: nftPost.shareId,
    nftUrl: nftPost.url,
    ownerAddress: post.owner,
    ownerAvatarId: user.avatarId,
    ownerUsername: user.username,
    repost: {
      createdAt: repostPost.createdAt,
      id: repostPost.publicId,
      nftCaption: repostNftPost.caption,
      nftShareId: repostNftPost.shareId,
      nftUrl: repostNftPost.url,
      ownerAddress: repostUser.address,
      ownerAvatarId: repostUser.avatarId,
      ownerUsername: repostUser.username,
      repostCaption: repostRepost.caption,
      repostReference: repostRepost.referencePostId,
      type: repostPost.type,
    },
    repostCaption: repost.caption,
    repostReference: repost.referencePostId,
    type: post.type,
  })
  .from(post)
  .leftJoin(user, eq(post.owner, user.address))
  .leftJoin(
    nftPost,
    and(eq(post.type, "post"), eq(post.publicId, nftPost.postId)),
  )
  .leftJoin(
    repost,
    and(eq(post.type, "repost"), eq(post.publicId, repost.postId)),
  )
  .leftJoin(
    repostPost,
    and(
      eq(post.type, "repost"),
      eq(repost.referencePostId, repostPost.publicId),
    ),
  )
  .leftJoin(
    repostUser,
    and(eq(post.type, "repost"), eq(repostPost.owner, repostUser.address)),
  )
  .leftJoin(
    repostNftPost,
    and(eq(post.type, "repost"), eq(repostPost.publicId, repostNftPost.postId)),
  )
  .leftJoin(
    repostRepost,
    and(eq(post.type, "repost"), eq(repostPost.publicId, repostRepost.postId)),
  );

export function formatPostQuery(data: Awaited<typeof postQuery>): Post[] {
  return data.map((row) => {
    return formatPost(row);
  });
}

type QueryRow = Awaited<typeof postQuery>[0];

function formatPost(row: QueryRow): Post {
  switch (row.type) {
    case "post": {
      if (!row.nftShareId || !row.nftUrl) {
        throw new Error("Invalid post");
      }

      return {
        createdAt: row.createdAt.toISOString(),
        data: {
          caption: row.nftCaption,
          shareId: row.nftShareId,
          url: row.nftUrl,
        },
        id: row.id,
        owner: {
          address: row.ownerAddress,
          avatar: getAvatarUrl(row.ownerAvatarId),
          username: row.ownerUsername,
        },
        type: PostType.Post,
      };
    }
    case "repost": {
      if (!row.repostReference) {
        throw new Error("Invalid repost");
      }

      return {
        createdAt: row.createdAt.toISOString(),
        data: {
          caption: row.repostCaption,
          referencePostId: row.repostReference,
          repost: row.repost ? formatPost(row.repost as QueryRow) : null,
        },
        id: row.id,
        owner: {
          address: row.ownerAddress,
          avatar: getAvatarUrl(row.ownerAvatarId),
          username: row.ownerUsername,
        },
        type: PostType.Repost,
      };
    }
  }
}
