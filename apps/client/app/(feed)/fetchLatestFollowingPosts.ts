"use server";

import { z } from "zod";

import { db } from "@/lib/db";
import { Post } from "@/lib/fetchPost";
import { getAvatarUrl } from "@/lib/getAvatarUrl";
import { getSession } from "@/lib/auth/getSession";
import { inArray, desc } from "drizzle-orm";
import { FEED_PAGE_SIZE } from "./constants";
import { content } from "@/lib/db/schema";

// TODO: add reposts

const FetchLatestSchema = z.object({
  page: z.number().int().min(0),
  start: z.number().int().min(0).optional(),
});

type FetchLatestArgs = z.infer<typeof FetchLatestSchema>;

export async function fetchLatestFollowingPosts(
  _args: FetchLatestArgs,
): Promise<Post[]> {
  const session = await getSession();
  if (!session) {
    // TODO: prompt sign in
    return [];
  }

  const clientAddress = session.user.address;
  const following = await db.query.userFollowing.findMany({
    where: (row, { eq }) => eq(row.address, clientAddress),
  });

  if (!following) {
    return [];
  }

  const followingAddresses = following.map((row) =>
    row.following.toLowerCase(),
  );

  try {
    const args = FetchLatestSchema.parse(_args);

    let page = args.page;
    let offset = 0;

    if (args.start) {
      const latestShare = await db.query.content.findFirst({
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

    let data: any = await db
      .select()
      .from(content)
      .orderBy(desc(content.shareId))
      .where(inArray(content.owner, followingAddresses));
    if (!data) {
      return [];
    }

    // need also get owner username and avatar

    const ownerInfo = await db.query.user.findMany({
      columns: {
        address: true,
        avatarId: true,
        username: true,
      },
      where: (row, { inArray }) => inArray(row.address, followingAddresses),
    });
    if (!ownerInfo) {
      return [];
    }

    for (const row of data) {
      const owner = ownerInfo.find(
        (info) => info.address.toLowerCase() === row.owner.toLowerCase(),
      );
      console.log("owner", owner);
      if (!owner) {
        continue;
      }

      row.owner = {
        address: owner.address,
        avatar: getAvatarUrl(owner.avatarId),
        username: owner.username,
      };
    }

    return data.map((row: any) => ({
      createdAt: row.createdAt.toISOString(),
      description: row.description ?? "",
      owner: row.owner,
      shareId: row.shareId,
      url: row.url,
    }));
  } catch (e) {
    console.error(e);
    return [];
  }
}
