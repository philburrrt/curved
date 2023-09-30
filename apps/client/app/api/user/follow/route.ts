import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db";
import { AuthSchema } from "@/lib/auth/types";
import { userFollowing } from "@/lib/db/schema";
import { BiData } from "react-icons/bi";
/*
  try {
    await fetch(`/api/user/follow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ addrToFollow: userAddress }),
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
  const body = await request.json();
  const addrToFollow = body.addrToFollow.toLowerCase();

  if (!addrToFollow) {
    return new Response("Bad Request", { status: 400 });
  }

  const clientAddress = session.user.address.toLowerCase();
  if (clientAddress === addrToFollow) {
    return new Response("Bad Request", { status: 400 });
  }

  try {
    await db.insert(userFollowing).values({
      address: clientAddress,
      following: addrToFollow,
    });
  } catch (e) {
    console.error(e);
    return new Response("Internal Server Error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
