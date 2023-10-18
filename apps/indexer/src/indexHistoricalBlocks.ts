import { trade } from "db";
import { desc } from "drizzle-orm";
import { ethers } from "ethers";

import { db } from "./DB";
import { insertShare } from "./insertShare";
import { insertTrade } from "./insertTrade";
import { msgDiscord } from "./msgDiscord";

export async function indexHistoricalBlocks(
  provider: ethers.providers.WebSocketProvider,
  contract: ethers.Contract,
) {
  console.log("Indexing historical blocks...");

  // Last indexed block number can be found via the hash of the latest trade in the db
  const tx = await db.select().from(trade).orderBy(desc(trade.id)).limit(1);
  const lastTrade = tx[0];

  if (!lastTrade) {
    console.log("No trades found in db. Skipping historical indexing.");
    return;
  }

  const receipt = await provider.getTransaction(lastTrade.hash);

  if (receipt.blockNumber === undefined) {
    console.log("No new trades found.");
    return;
  }

  const reInitBlockNumber = receipt.blockNumber + 1;

  if (!contract.filters.Trade) {
    throw new Error("Trade filter not found");
  }

  if (!contract.filters.ShareCreated) {
    throw new Error("ShareCreated filter not found");
  }

  // Get all trades since last indexed block
  const tradeFilter = contract.filters.Trade();
  const newShareFilter = contract.filters.ShareCreated();

  const tradeEvents = await contract.queryFilter(
    tradeFilter,
    reInitBlockNumber,
  );
  const shareEvents = await contract.queryFilter(
    newShareFilter,
    reInitBlockNumber,
  );

  if (tradeEvents.length === 0 && shareEvents.length === 0) {
    console.log("No new trades found.");
    return;
  }

  console.log("Found", tradeEvents.length, "new trades.");
  console.log("Found", shareEvents.length, "new shares.");

  const tradeInserts = tradeEvents.map(async (event) => {
    try {
      await insertTrade(event);
    } catch (e) {
      console.log("Error inserting trade", e);
      msgDiscord("Error inserting trade");
    }
  });

  const shareInserts = shareEvents.map(async (event) => {
    try {
      await insertShare(event);
    } catch (e) {
      console.log("Error inserting share", e);
      msgDiscord("Error inserting share");
    }
  });

  await Promise.all(tradeInserts);
  await Promise.all(shareInserts);

  console.log("Finished indexing historical blocks.");
}
