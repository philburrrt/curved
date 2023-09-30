import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db";
import { repost } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/*
  try {
    await fetch(`/api/user/unrepost`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ repostId }),
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
  const { repostId } = body;

  try {
    await db.delete(repost).where(eq(repost.id, repostId));
  } catch (e) {
    console.log(e);
    return new Response("Bad Request", { status: 400 });
  }

  return new Response("OK", { status: 200 });
}
