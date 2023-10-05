const webpush = require("web-push");
import { db } from "@/lib/db";
import { pushNotifications } from "db";
import { eq } from "drizzle-orm";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

interface Message {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

export const sendNotification = async (address: string, msg: Message) => {
  const subscription = await db.query.pushNotifications.findFirst({
    where: eq(pushNotifications.address, address),
  });
  if (!subscription) return;
  const sub = {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    keys: {
      auth: subscription.auth,
      p256dh: subscription.p256dh,
    },
  };
  const payload = JSON.stringify(msg);
  await webpush.sendNotification(sub, payload);
};
