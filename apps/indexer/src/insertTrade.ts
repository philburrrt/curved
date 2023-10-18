import { trade } from "db";
import { ethers } from "ethers";
import { provider } from "./web3";

import { db } from "./DB";

export async function insertTrade(event: ethers.Event, recursive?: Boolean) {
  const args = event.args;
  if (!args) {
    throw new Error("No args found in event");
  }

  const amount = args[4].toNumber() as number;
  const hash = event.transactionHash;
  const owner = args[3].toLowerCase() as string;
  const price = args[5].toBigInt() as bigint;
  const shareId = args[0].toNumber() as number;
  const side = args[1].toNumber() as number;
  const supply = args[6].toNumber() as number;
  const trader = args[2].toLowerCase() as string;

  // if historical block, need to get accurate timestamp

  let createdAt;
  if (recursive) {
    const block = await provider.getBlock(event.blockNumber);
    if (block && block.timestamp) {
      console.log("Block timestamp", block.timestamp);
      const dateObject = new Date(block.timestamp * 1000);
      createdAt = dateObject;
    }
  }

  await db.insert(trade).values({
    amount,
    hash,
    owner,
    price,
    shareId,
    side,
    supply,
    trader,
    createdAt,
  });
}
