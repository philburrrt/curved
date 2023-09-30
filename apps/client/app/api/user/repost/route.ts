import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db";
import { repost } from "@/lib/db/schema";

/*
  try {
    await fetch(`/api/user/repost`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ shareId, repostId, quote }),
    });
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
*/

export async function POST(request: NextRequest) {
  console.log("New follow request, getting session");
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  const author = session.user.address;
  const body = await request.json();
  const { shareId, repostId, quote } = body;
  if (!shareId && !repostId) {
    return new Response("Bad Request", { status: 400 });
  }

  try {
    await db.insert(repost).values({
      author,
      referenceShareId: shareId,
      referenceRepost: repostId || null,
      quote: quote || null,
    });
  } catch (e) {
    console.log(e);
    return new Response("Bad Request", { status: 400 });
  }

  return new Response("OK", { status: 200 });
}
