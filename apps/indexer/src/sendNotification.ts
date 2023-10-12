const webpush = require("web-push");
import { pushNotifications } from "db";
import { eq } from "drizzle-orm";

import { db } from "./DB";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

export interface Message {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

export const sendNotification = async (address: string, msg: Message) => {
  const subscription = await db.query.pushNotifications.findMany({
    where: eq(pushNotifications.address, address),
  });
  if (!subscription || subscription.length === 0) return;
  for (const sub of subscription) {
    const entry = {
      endpoint: sub.endpoint,
      expirationTime: sub.expirationTime,
      keys: {
        auth: sub.auth,
        p256dh: sub.p256dh,
      },
    };
    const payload = JSON.stringify(msg);
    console.log(`sending notification to ${subscription.length} devices`);
    await webpush.sendNotification(entry, payload);
  }
};
