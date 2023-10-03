// worker.js
import { parentPort } from "worker_threads";
import { db } from "../DB";
import { userBalances, trade } from "db";
import { eq } from "drizzle-orm";

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
      shareId,
      side,
    };

    console.log("[user_accounting] processing trade", trade);

    const existingBalance = await db.query.userBalances.findFirst({
      columns: {
        balance: true,
      },
      where: (row, { eq }) =>
        eq(row.address, trade.from) && eq(row.shareId, shareId),
    });

    if (!existingBalance?.balance) {
      console.log(
        "[user_accounting] no existing balance",
        trade.from.slice(0, 6),
        shareId,
      );
      await db.insert(userBalances).values({
        address: trade.from,
        shareId,
        balance: trade.amount,
      });
    } else {
      console.log(
        "[user_accounting] existing balance. updating",
        existingBalance,
        trade.from.slice(0, 6),
        shareId,
      );
      await db
        .update(userBalances)
        .set({
          balance: existingBalance.balance + trade.amount,
        })
        .where(
          eq(userBalances.address, trade.from) &&
            eq(userBalances.shareId, shareId),
        );
    }
  }
});
