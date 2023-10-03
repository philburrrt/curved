// worker.js
import { userBalances } from "db";
import { and, eq } from "drizzle-orm";
import PQueue from "p-queue";
import { parentPort } from "worker_threads";

import { db } from "../DB";

if (!parentPort) {
  throw new Error("No parentPort");
}

// receives trade and sharecreaed event
// if sharecreated, add 1 to creators share balance in userBalances table
// if trade, check to see if there is a balance of that shareId in userBalances table
// if there is, .update() the balance. if not .insert() the balance

const queue = new PQueue({ concurrency: 1 });

const handleMessage = async (event: any) => {
  const eventType = event.event;
  if (eventType === "ShareCreated") {
    const owner = event.args[0];
    const shareId = event.args[1];

    try {
      await db.insert(userBalances).values({
        address: owner.toLowerCase(),
        balance: 1,
        shareId,
      });
    } catch (e) {
      console.error("error inserting creator balance", e);
    }
  } else if (eventType === "Trade") {
    const shareId = event.args[0];
    const side = event.args[1];
    const trader = event.args[2];
    const amount = parseInt(event.args[4]);

    const trade = {
      amount: side === "0" ? amount : -amount,
      from: trader.toLowerCase(),
    };

    let existingBalance;
    try {
      existingBalance = await db
        .select()
        .from(userBalances)
        .where(
          and(
            eq(userBalances.address, trade.from),
            eq(userBalances.shareId, shareId),
          ),
        );
    } catch (e) {
      console.error("error querying existing balance", e);
    }

    if (!existingBalance)
      return console.log("[user_accounting] error querying existing balance");

    if (existingBalance.length === 0) {
      try {
        await db.insert(userBalances).values({
          address: trade.from.toLowerCase(),
          balance: trade.amount,
          shareId,
        });

        return;
      } catch (e) {
        console.error("error inserting balance", e);
      }
    }

    const balance = existingBalance[0]?.balance;
    if (!balance)
      return console.log("[user_accounting] error querying existing balance");

    if (balance + trade.amount === 0) {
      await db
        .delete(userBalances)
        .where(
          and(
            eq(userBalances.address, trade.from),
            eq(userBalances.shareId, shareId),
          ),
        );
      return;
    }

    try {
      await db
        .update(userBalances)
        .set({ balance: balance + trade.amount })
        .where(
          and(
            eq(userBalances.address, trade.from),
            eq(userBalances.shareId, shareId),
          ),
        );
    } catch (e) {
      console.error("error updating balance", e);
    }
  }
};

parentPort.on("message", async (event: any) => {
  queue.add(() => handleMessage(event));
});
