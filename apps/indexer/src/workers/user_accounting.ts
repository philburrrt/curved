// worker.js
import { parentPort } from "worker_threads";
import { db } from "../DB";
import { userBalances, trade } from "db";

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
    //
  }
});
