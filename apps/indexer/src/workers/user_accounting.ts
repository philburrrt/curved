// worker.js
import { parentPort } from "worker_threads";
import { db } from "../DB";
import { user, userBalances } from "../schema";
import { eq } from "drizzle-orm";

parentPort!.on("message", async (event: any) => {
  if (event.event === "ShareCreated") {
    await handleShareCreated(event);
  }

  if (event.event === "Trade") {
    await handleTrade(event);
  }
});

export const handleShareCreated = async (event: any) => {
  console.log("[user_acc_thread] handling share created");
  const creator = event.args[0];
  const shareId = event.args[1];
  // add 1 to the creator's balance of this share

  await db.insert(userBalances).values({
    address: creator.toLowerCase(),
    shareId,
    balance: 1,
  });
};

export const handleTrade = async (event: any) => {
  const shareId = event.args[0];
  const side = event.args[1];
  const trader = event.args[2].toLowerCase().slice(0, 10);
  const amount = event.args[4];

  console.log("[user_acc_thread] handling trade", {
    shareId,
    side,
    trader,
    amount,
  });

  // add `amount` to the trader's balance of this share if side is 0
  // add - `amount` to the trader's balance of this share if side is 1

  const status = await db.query.userBalances.findFirst({
    where: (row) => eq(row.address, trader) && eq(row.shareId, shareId),
  });

  console.log("status: ", status, trader.slice(0, 10));
  if (!status) {
    console.log("inserting new user balance for trader: ", trader.slice(0, 10));
    try {
      await db.insert(userBalances).values({
        address: trader.toLowerCase(),
        shareId,
        balance: amount,
      });
    } catch (e) {
      console.log("error inserting new user balance: ", e);
    }
    return;
  }

  const newBalance =
    side === 0 ? status.balance + amount : status.balance - amount;

  console.log("updating user balance for trader: ", trader.slice(0, 10));

  await db
    .update(userBalances)
    .set({ balance: newBalance })
    .where(
      eq(userBalances.address, trader) && eq(userBalances.shareId, shareId),
    );

  let balance;
};
