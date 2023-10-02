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

  try {
    await db.insert(userBalances).values({
      address: creator.toLowerCase(),
      shareId,
      balance: 1,
    });
  } catch (e) {
    console.log("error inserting balance", e);
  }
};

/*
  db table is empty
  2 trades get sent here back to back
  first checks to see if exists, it does as intended, then it inserts
  second checks to see if exists, it doesn't. not as intended, then it inserts when it should update
  after running the script again, it recognizes the existing data immediately and works as intended
  seems like the db is not being updated in time for the second trade to see the first trade's insert
*/

export const handleTrade = async (event: any) => {
  const shareId = event.args[0];
  const side = event.args[1];
  const trader = event.args[2].toLowerCase();
  const amount = event.args[4];

  console.log("[user_acc_thread] handling trade", {
    shareId,
    side,
    trader,
    amount,
  });

  // check if trader has shareId in userBalances
  const existing = await db.query.userBalances.findFirst({
    where:
      eq(userBalances.address, trader) && eq(userBalances.shareId, shareId),
  });

  console.log(
    "[user_acc_thread] existing",
    existing,
    trader.slice(0, 6),
    shareId,
  );

  let balance;
  if (existing?.balance) {
    balance = existing.balance + amount;
    try {
      console.log(
        "[user_acc_thread] updating balance",
        trader.slice(0, 6),
        shareId,
      );
      await db
        .update(userBalances)
        .set({ balance })
        .where(
          eq(userBalances.address, trader) && eq(userBalances.shareId, shareId),
        );
    } catch (e) {
      console.log("error updating balance", e);
    }
  } else {
    console.log(
      "[user_acc_thread] inserting balance",
      trader.slice(0, 6),
      shareId,
    );

    try {
      await db.insert(userBalances).values({
        address: trader,
        shareId,
        balance: amount,
      });
    } catch (e) {
      console.log("error inserting balance", e);
    }
  }
};
