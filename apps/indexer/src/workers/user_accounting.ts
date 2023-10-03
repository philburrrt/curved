// worker.js
import { parentPort } from "worker_threads";
import { db } from "../DB";
import { userBalances, trade } from "db";
import { eq, and } from "drizzle-orm";

// receives trade and sharecreaed event
// if sharecreated, add 1 to creators share balance in userBalances table
// if trade, check to see if there is a balance of that shareId in userBalances table
// if there is, .update() the balance. if not .insert() the balance

parentPort!.on("message", async (event: any) => {
  const eventType = event.event;
  if (eventType === "ShareCreated") {
    const owner = event.args[0];
    const shareId = event.args[1];

    try {
      await db.insert(userBalances).values({
        address: owner.toLowerCase(),
        shareId,
        balance: 1,
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
      from: trader.toLowerCase(),
      amount: side === "0" ? amount : -amount,
    };

    console.log("[user_accounting] processing trade", trade);

    // ! bug: this returns the owner balance even if querying the trader. seems like the `where` clause is incorrect
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

    console.log("[user_accounting] existing balance", existingBalance);

    if (!existingBalance)
      return console.log("[user_accounting] error querying existing balance");

    if (existingBalance.length === 0) {
      try {
        await db.insert(userBalances).values({
          address: trade.from.toLowerCase(),
          shareId,
          balance: trade.amount,
        });

        return;
      } catch (e) {
        console.error("error inserting balance", e);
      }
    }

    const balance = existingBalance[0]?.balance;
    if (!balance)
      return console.log("[user_accounting] error querying existing balance");
    console.log(
      "[user_accounting] updating balance",
      trade.from.slice(0, 6),
      balance,
      trade.amount,
    );

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
});
