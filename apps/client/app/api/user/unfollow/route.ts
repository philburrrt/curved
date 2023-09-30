import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { userFollowing } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

/*
  try {
    await fetch(`/api/user/follow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ addrToUnfollow: userAddress }),
    });
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
*/

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { addrToUnfollow } = body;

  if (!addrToUnfollow) {
    return new Response("Bad Request", { status: 400 });
  }

  const clientAddress = session.user.address;
  if (clientAddress === addrToUnfollow) {
    return new Response("Bad Request", { status: 400 });
  }

  try {
    await db
      .delete(userFollowing)
      .where(
        eq(userFollowing.address, clientAddress) &&
          eq(userFollowing.following, addrToUnfollow),
      );
  } catch (e) {
    console.error(e);
    return new Response("Internal Server Error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
