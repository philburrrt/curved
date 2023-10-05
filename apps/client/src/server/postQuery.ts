import { nftPost, post, repost, user } from "db";
import { and, eq, like } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";

import { db } from "@/lib/db";
import { getAvatarUrl } from "@/lib/getAvatarUrl";
import { Post, PostType, Repost } from "@/src/types/post";

const repostPost = alias(post, "repostPost");
const repostUser = alias(user, "repostUser");
const repostRepost = alias(repost, "repostRepost");
const repostNftPost = alias(nftPost, "repostNftPost");
const repostNftPostPost = alias(post, "repostNftPostPost");
const repostNftPostUser = alias(user, "repostNftPostUser");

export const postQuery = (tx = db) =>
  tx
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
        ownerAddress: repostUser.address,
        ownerAvatarId: repostUser.avatarId,
        ownerUsername: repostUser.username,
        repostCaption: repostRepost.caption,
        type: repostPost.type,
      },
      repostCaption: repost.caption,
      repostNft: {
        caption: repostNftPost.caption,
        createdAt: repostNftPostPost.createdAt,
        id: repostNftPostPost.publicId,
        ownerAddress: repostNftPostUser.address,
        ownerAvatarId: repostNftPostUser.avatarId,
        ownerUsername: repostNftPostUser.username,
        shareId: repostNftPost.shareId,
        url: repostNftPost.url,
      },
      type: post.type,
    })
    .from(post)
    .leftJoin(user, like(post.owner, user.address))
    .leftJoin(
      nftPost,
      and(eq(post.type, "post"), eq(post.publicId, nftPost.postId)),
    )
    .leftJoin(
      repost,
      and(eq(post.type, "repost"), eq(post.publicId, repost.postId)),
    )
    .leftJoin(repostNftPost, eq(repost.referenceShareId, repostNftPost.shareId))
    .leftJoin(
      repostNftPostPost,
      eq(repostNftPost.postId, repostNftPostPost.publicId),
    )
    .leftJoin(
      repostNftPostUser,
      like(repostNftPostPost.owner, repostNftPostUser.address),
    )
    .leftJoin(repostPost, and(eq(repost.referencePostId, repostPost.publicId)))
    .leftJoin(repostUser, like(repostPost.owner, repostUser.address))
    .leftJoin(repostRepost, eq(repostPost.publicId, repostRepost.postId));

export type PostQueryResponse = Awaited<ReturnType<typeof postQuery>>;
export type PostQueryRow = PostQueryResponse[0];

export function formatPostQuery(data: PostQueryResponse): Post[] {
  return data
    .map((row) => formatPostQueryRow(row))
    .filter((post): post is Post => post !== null);
}

export function formatPostQueryRow(row: PostQueryRow): Post | null {
  switch (row.type) {
    case "post": {
      if (!row.nftShareId || !row.nftUrl) {
        console.error("Invalid post", row);
        return null;
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
        repostCount: 0,
        type: PostType.Post,
      };
    }
    case "repost": {
      if (
        !row.repostNft.createdAt ||
        !row.repostNft.id ||
        !row.repostNft.ownerAddress
      ) {
        console.error("Invalid repost", row);
        return null;
      }

      const nftPost = formatPostQueryRow({
        createdAt: row.repostNft.createdAt,
        id: row.repostNft.id,
        nftCaption: row.repostNft.caption,
        nftShareId: row.repostNft.shareId,
        nftUrl: row.repostNft.url,
        ownerAddress: row.repostNft.ownerAddress,
        ownerAvatarId: row.repostNft.ownerAvatarId,
        ownerUsername: row.repostNft.ownerUsername,
        repost: {
          createdAt: null,
          id: null,
          ownerAddress: null,
          ownerAvatarId: null,
          ownerUsername: null,
          repostCaption: null,
          type: null,
        },
        repostCaption: row.repostNft.caption,
        repostNft: {
          caption: null,
          createdAt: null,
          id: null,
          ownerAddress: null,
          ownerAvatarId: null,
          ownerUsername: null,
          shareId: null,
          url: null,
        },
        type: "post",
      });

      let baseRepost: Post | null = null;

      // If there is a repost of a repost,
      // add the nft post to the reposted repost's repost
      if (
        row.repost.createdAt &&
        row.repost.id &&
        row.repost.ownerAddress &&
        row.repost.type
      ) {
        baseRepost = formatPostQueryRow({
          createdAt: row.repost.createdAt,
          id: row.repost.id,
          nftCaption: null,
          nftShareId: null,
          nftUrl: null,
          ownerAddress: row.repost.ownerAddress,
          ownerAvatarId: row.repost.ownerAvatarId,
          ownerUsername: row.repost.ownerUsername,
          repost: {
            createdAt: null,
            id: null,
            ownerAddress: null,
            ownerAvatarId: null,
            ownerUsername: null,
            repostCaption: null,
            type: null,
          },
          repostCaption: row.repost.repostCaption,
          repostNft: {
            caption: row.repostNft.caption,
            createdAt: row.repostNft.createdAt,
            id: row.repostNft.id,
            ownerAddress: row.repostNft.ownerAddress,
            ownerAvatarId: row.repostNft.ownerAvatarId,
            ownerUsername: row.repostNft.ownerUsername,
            shareId: row.repostNft.shareId,
            url: row.repostNft.url,
          },
          type: row.repost.type,
        });
      }

      const repostPost = baseRepost
        ? ({
            ...baseRepost,
            data: {
              ...baseRepost.data,
              repost: nftPost,
            },
          } as Repost)
        : null;

      return {
        createdAt: row.createdAt.toISOString(),
        data: {
          caption: row.repostCaption,
          repost: repostPost ?? nftPost,
        },
        id: row.id,
        owner: {
          address: row.ownerAddress,
          avatar: getAvatarUrl(row.ownerAvatarId),
          username: row.ownerUsername,
        },
        repostCount: 0,
        type: PostType.Repost,
      };
    }
  }
}
