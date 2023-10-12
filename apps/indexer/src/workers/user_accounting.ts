// worker.js
import { nftPost, userBalances } from "db";
import { and, eq } from "drizzle-orm";
import { utils } from "ethers";
import PQueue from "p-queue";
import { parentPort } from "worker_threads";
import { sendNotification, Message } from "../sendNotification";

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
    const owner = event.args[0].toLowerCase();
    const shareId = event.args[1];

    try {
      await db.insert(userBalances).values({
        address: owner,
        balance: 1,
        shareId,
      });
    } catch (e) {
      console.error("error inserting creator balance", e);
    }
  } else if (eventType === "Trade") {
    const shareId = event.args[0];
    const side = event.args[1];
    const trader = event.args[2].toLowerCase();
    const amount = parseInt(event.args[4]);

    if (side === "0") {
      const owner = event.args[3].toLowerCase();
      const price = utils.formatUnits(event.args[5]);
      handleNotification({ amount, owner, price, shareId, trader });
    }

    const trade = {
      amount: side === "0" ? amount : -amount,
      from: trader,
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

const handleNotification = async (event: any) => {
  const { shareId, trader, amount, owner, price } = event;
  const postId = await db
    .select({
      postId: nftPost.postId,
    })
    .from(nftPost)
    .where(eq(nftPost.shareId, shareId));

  const msg: Message = {
    body: `${trader.slice(
      0,
      6,
    )} purchased ${amount} shares of your post for ${price} ETH`,
    title: `Someone purchased your share!`,
    url: `https://yuyu.social/post/${postId}`,
  };

  sendNotification(owner, msg);

  console.log("postId", postId);
};

export const formatUnits = (value: bigint, decimals = 2) => {
  const ethValue = utils.formatEther(value);
  const formatted = Number(ethValue).toFixed(decimals);
  return formatted;
};

parentPort.on("message", async (event: any) => {
  queue.add(() => handleMessage(event));
});

console.log(`Worker ${process.pid} started (user_accounting)`);
