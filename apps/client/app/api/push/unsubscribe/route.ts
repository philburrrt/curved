import { pushNotifications } from "db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { deviceId } = await request.json();

  console.log(
    `Unsubscribing device ${deviceId} for user ${session.user.username}`,
  );

  try {
    await db
      .delete(pushNotifications)
      .where(eq(pushNotifications.deviceId, deviceId));
  } catch (e) {
    console.log("Error while unsubscribing", e);
    return NextResponse.json({ error: "Internal server error", status: 500 });
  }

  return NextResponse.json({ status: 200 });
}
