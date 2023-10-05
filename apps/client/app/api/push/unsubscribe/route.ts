import { pushNotifications } from "db";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const address = session.user.address.toLowerCase();

  try {
    await db
      .delete(pushNotifications)
      .where(eq(pushNotifications.address, address));
  } catch (e) {
    console.log("Error while unsubscribing", e);
    return NextResponse.json({ error: "Internal server error", status: 500 });
  }

  return NextResponse.json({ status: 200 });
}
