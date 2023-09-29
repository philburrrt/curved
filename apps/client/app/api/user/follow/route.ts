import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db";
import { AuthSchema } from "@/lib/auth/types";

/*
example req

  const res = await fetch("/api/user/follow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userAddress,
    }),
  });
  if (!res.ok) {
    throw new Error("Failed to follow");
  }

*/

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  // const address = session.user.address;

  // const parsedInput = AuthSchema.safeParse(await request.json());

  // console.log("parsedInput", parsedInput);

  NextResponse.json({ success: true });
}
