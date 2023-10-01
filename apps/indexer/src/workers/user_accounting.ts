// worker.js
import { parentPort } from "worker_threads";
import { db } from "../DB";
import { userBalances } from "../schema";
import { eq } from "drizzle-orm";

parentPort!.on("message", (event: any) => {
  console.log("User received event");

  if (event.event === "ShareCreated") {
    handleShareCreated(event);
  }

  if (event.event === "Trade") {
    handleTrade(event);
  }
});

export const handleShareCreated = async (event: any) => {
  console.log("handling share created");
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
  console.log("handling trade");
  const shareId = event.args[0];
  const side = event.args[1];
  const trader = event.args[2];
  const amount = event.args[4];

  // add `amount` to the trader's balance of this share if side is 0
  // add - `amount` to the trader's balance of this share if side is 1

  const shareState = await db.query.userBalances.findFirst({
    columns: {
      balance: true,
    },
    where: (row, { eq }) => eq(row.shareId, shareId) && eq(row.address, trader),
  });

  console.log(`share state ${trader}`, shareState);

  if (!shareState) {
    await db.insert(userBalances).values({
      address: trader.toLowerCase(),
      shareId,
      balance: amount,
    });
    return;
  } else {
    const newBalance =
      side === 0 ? shareState.balance + amount : shareState.balance - amount;

    console.log("user new balance", newBalance);

    // TODO: why is this trying to insert a new row?
    await db
      .update(userBalances)
      .set({
        balance: newBalance,
      })
      .where(
        eq(userBalances.shareId, shareId) && eq(userBalances.address, trader),
      );
  }
};
