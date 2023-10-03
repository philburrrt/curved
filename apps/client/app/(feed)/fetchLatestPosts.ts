"use server";

import { z } from "zod";

import { db } from "@/lib/db";
import { Post } from "@/lib/fetchPost";
import { getAvatarUrl } from "@/lib/getAvatarUrl";

import { FEED_PAGE_SIZE } from "./constants";

const FetchLatestSchema = z.object({
  page: z.number().int().min(0),
  start: z.number().int().min(0).optional(),
});

type FetchLatestArgs = z.infer<typeof FetchLatestSchema>;

export async function fetchLatestPosts(
  _args: FetchLatestArgs,
): Promise<Post[]> {
  try {
    const args = FetchLatestSchema.parse(_args);

    let page = args.page;
    let offset = 0;

    if (args.start) {
      const latestShare = await db.query.post.findFirst({
        columns: {
          shareId: true,
        },
        orderBy: (row, { desc }) => [desc(row.shareId)],
      });

      if (!latestShare) {
        return [];
      }

      // latestShare is page 0, calculate what page we will find start on
      if (latestShare.shareId > args.start) {
        const diff = latestShare.shareId - args.start;
        page = Math.floor(diff / FEED_PAGE_SIZE);
        offset = diff % FEED_PAGE_SIZE;
      }
    }

    const data = await db.query.post.findMany({
      columns: {
        caption: true,
        createdAt: true,
        owner: true,
        shareId: true,
        url: true,
      },
      limit: FEED_PAGE_SIZE,
      offset: page * FEED_PAGE_SIZE + offset,
      orderBy: (row, { desc }) => [desc(row.shareId)],
      with: {
        owner: {
          columns: {
            avatarId: true,
            username: true,
          },
        },
      },
    });

    if (!data) {
      return [];
    }

    return data.map((row) => ({
      caption: row.caption ?? "",
      createdAt: row.createdAt.toISOString(),
      owner: {
        address: row.owner,
        avatar: getAvatarUrl(row.owner.avatarId),
        username: row.owner.username,
      },
      shareId: row.shareId,
      url: row.url,
    }));
  } catch (e) {
    console.error(e);
    return [];
  }
}
