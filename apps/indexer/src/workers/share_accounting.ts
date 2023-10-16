// worker.js
import { shareData } from "db";
import { and, eq } from "drizzle-orm";
import PQueue from "p-queue";
import { parentPort } from "worker_threads";
import { msgDiscord } from "../msgDiscord";

import { db } from "../DB";

if (!parentPort) {
  throw new Error("No parentPort");
}

const queue = new PQueue({ concurrency: 1 });

const handleMessage = async (event: any) => {
  if (event.event !== "Trade") return;
  const shareId = event.args[0];
  const price = event.args[5];

  let data;
  try {
    data = await db.query.shareData.findFirst({
      where: (row, { eq }) => eq(row.shareId, shareId),
    });
  } catch (e) {
    console.error("error querying existing share data", e);
    msgDiscord(`error querying existing share data for shareId ${shareId}`);
  }

  if (!data) {
    try {
      await db.insert(shareData).values({
        shareId,
        volume: price,
      });
    } catch (e) {
      console.error("error inserting share data", e);
      msgDiscord(`error inserting share data for shareId ${shareId}`);
    }
  }

  if (data?.volume && data?.volume.toString() !== "0") {
    const newVolume = data.volume + BigInt(price);
    try {
      await db
        .update(shareData)
        .set({
          volume: newVolume,
        })
        .where(and(eq(shareData.shareId, shareId)));
    } catch (e) {
      console.error("error updating share data", e);
      msgDiscord(`error updating share data for shareId ${shareId}`);
    }
  }
};

parentPort.on("message", async (event: any) => {
  queue.add(() => handleMessage(event));
});

console.log(`Worker ${process.pid} started (share_accounting)`);
