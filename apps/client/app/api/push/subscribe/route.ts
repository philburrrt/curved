import { pushNotifications } from "db";
import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  const msg = await request.json();
  const { subscription, deviceId } = msg;

  const { endpoint, expirationTime, keys } = subscription;
  const { p256dh, auth } = keys;
  const address = session.user.address.toLowerCase();

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Invalid subscription", status: 400 });
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
        auth,
        endpoint,
        expirationTime,
        p256dh,
        deviceId,
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
        auth,
        endpoint,
        expirationTime,
        p256dh,
      });
      return NextResponse.json({ status: 200 });
    }
  } catch (e) {
    console.log("Error while subscribing", e);
    return NextResponse.json({ error: "Internal server error", status: 500 });
  }
}
