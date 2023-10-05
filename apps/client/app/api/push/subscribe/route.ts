import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pushNotifications } from "db";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/getSession";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  const subscription = await request.json();

  const { endpoint, expirationTime, keys } = subscription;
  const { p256dh, auth } = keys;
  const address = session.user.address.toLowerCase();

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ status: 400, error: "Invalid subscription" });
  }

  try {
    console.log("Checking if subscription already exists");
    const existing = await db.query.pushNotifications.findFirst({
      where: (row, { eq }) => eq(row.address, address),
    });
    if (!existing) {
      console.log("Subscription does not exist, creating new one");
      await db.insert(pushNotifications).values({
        address,
        endpoint,
        expirationTime,
        p256dh,
        auth,
      });
      return NextResponse.json({ status: 200 });
    } else {
      console.log("Subscription already exists, checking if it has changed");
      if (
        existing.endpoint === endpoint &&
        existing.expirationTime === expirationTime &&
        existing.p256dh === p256dh &&
        existing.auth === auth
      ) {
        console.log("Subscription has not changed");
        return NextResponse.json({ status: 200 });
      }
      console.log("Subscription has changed, updating");
      await db.update(pushNotifications).set({
        address,
        endpoint,
        expirationTime,
        p256dh,
        auth,
      });
      return NextResponse.json({ status: 200 });
    }
  } catch (e) {
    console.log("Error while subscribing", e);
    return NextResponse.json({ status: 500, error: "Internal server error" });
  }
}
