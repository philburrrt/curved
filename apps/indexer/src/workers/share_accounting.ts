// worker.js
import { parentPort } from "worker_threads";
import { db } from "../DB";
import { shareData } from "db";
import { eq, and } from "drizzle-orm";
import PQueue from "p-queue";

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
  }

  if (!data) {
    try {
      await db.insert(shareData).values({
        shareId,
        volume: price,
      });
    } catch (e) {
      console.error("error inserting share data", e);
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
    }
  }
};

parentPort!.on("message", async (event: any) => {
  queue.add(() => handleMessage(event));
});
