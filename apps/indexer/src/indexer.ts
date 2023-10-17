import { nftPost, pendingPost, post, trade } from "db";
import { config } from "dotenv";
import { desc, eq } from "drizzle-orm";
import { ethers } from "ethers";
import { Worker } from "worker_threads";

import SharesABI from "./abi/Shares.json" assert { type: "json" };
import { db } from "./DB";
import { msgDiscord } from "./msgDiscord";
import { nanoidLowercase } from "./nanoid";
const { WS_URL, SHARES_ADDRESS, DISCORD_WEBHOOK_URL } = process.env;

config();

export class Indexer {
  private userWorker: Worker;
  private shareWorker: Worker;
  private provider: ethers.providers.WebSocketProvider;
  private curve: ethers.Contract;

  constructor() {
    this.userWorker = new Worker(
      new URL("./workers/user_accounting.js", import.meta.url),
    );
    this.userWorker.on("exit", (code) => {
      console.log(`User worker stopped with exit code ${code}... Restarting`);
      this.userWorker = new Worker(
        new URL("./workers/user_accounting.js", import.meta.url),
      );
    });
    this.shareWorker = new Worker(
      new URL("./workers/share_accounting.js", import.meta.url),
    );
    this.shareWorker.on("exit", (code) => {
      console.log(`Share worker stopped with exit code ${code}... Restarting`);
      this.shareWorker = new Worker(
        new URL("./workers/share_accounting.js", import.meta.url),
      );
    });
    this.provider = new ethers.providers.WebSocketProvider(WS_URL ?? "");
    this.curve = new ethers.Contract(
      SHARES_ADDRESS ?? "",
      SharesABI.abi,
      this.provider,
    );
    console.log(`Indexer listening to ${SHARES_ADDRESS} on ${WS_URL}...`);
  }

  indexHistoricalBlocks = async () => {
    // last indexed block number can be found via the hash of the latest trade in the db
    const tx = await db.select().from(trade).orderBy(desc(trade.id)).limit(1);
    const lastTrade = tx[0];
    console.log("Last trade", lastTrade);
    if (!lastTrade)
      return console.log(
        "No trades found in db. Skipping historical indexing.",
      );
    console.log("Last trade hash", lastTrade.hash);
    const receipt = await this.provider.getTransaction(lastTrade.hash);
    console.log("Last trade block number", receipt.blockNumber);
    if (receipt.blockNumber === undefined)
      return console.log("No new trades found.");
    const reInitBlockNumber = receipt.blockNumber + 1;

    // get all trades since last indexed block
    //@ts-expect-error
    const tradeFilter = this.curve.filters.Trade();
    //@ts-expect-error
    const newShareFilter = this.curve.filters.ShareCreated();
    const tradeEvents = await this.curve.queryFilter(
      tradeFilter,
      reInitBlockNumber,
    );
    const shareEvents = await this.curve.queryFilter(
      newShareFilter,
      reInitBlockNumber,
    );
    if (tradeEvents.length === 0 && shareEvents.length === 0)
      return console.log("No new trades found.");
    console.log("Found", tradeEvents.length, "new trades.");
    console.log("Found", shareEvents.length, "new shares.");
    tradeEvents.forEach((event: any) => {
      this.handleTrade(event);
    });
    shareEvents.forEach((event: any) => {
      this.handleShareCreated(event);
    });
  };

  public start() {
    this.curve.on("*", (event) => {
      console.log("Event", event.event);

      const workerEvent = {
        address: event.address,
        args: event.args.map((arg: any) => {
          return arg._isBigNumber ? arg.toString() : arg;
        }),
        blockHash: event.blockHash,
        blockNumber: event.blockNumber,
        data: event.data,
        event: event.event,
        eventSignature: event.eventSignature,
        logIndex: event.logIndex,
        removed: event.removed,
        topics: event.topics,
        transactionHash: event.transactionHash,
        transactionIndex: event.transactionIndex,
      };

      this.userWorker.postMessage(workerEvent);

      switch (event.event) {
        case "ShareCreated": {
          this.handleShareCreated(event); // enter initial trade in db
          break;
        }
        case "Trade": {
          this.handleTrade(event); // enter trade in db
          this.shareWorker.postMessage(workerEvent);
          break;
        }
      }
    });
  }

  handleTrade = async (event: any) => {
    const entry = {
      amount: event.args[4].toNumber(),
      hash: event.transactionHash,
      owner: event.args[3].toLowerCase(),
      price: event.args[5].toString(),
      shareId: event.args[0].toNumber(),
      side: event.args[1].toNumber(),
      supply: event.args[6].toNumber(),
      trader: event.args[2].toLowerCase(),
    };

    console.log("Inserting trade", entry);
    await db.insert(trade).values(entry);
  };

  handleShareCreated = async (event: any) => {
    const owner = event.args[0];
    const shareId = event.args[1].toNumber();

    try {
      const pending = await db.query.pendingPost.findFirst({
        where: (row, { like }) => like(row.owner, owner),
      });

      if (!pending) {
        console.log("No pending content found. Ignoring onchain event.");
        // TODO: Add share + uri to content table
        return;
      }

      const publicId = nanoidLowercase();

      await db.transaction(async (tx) => {
        console.log(
          "Inserting post",
          { owner, publicId },
          "and deleting pending post",
          pending,
        );

        await tx.insert(post).values({
          owner: owner.toLowerCase(),
          publicId,
          type: "post",
        });

        await tx.insert(nftPost).values({
          caption: pending.caption,
          postId: publicId,
          shareId,
          url: pending.url,
        });

        await tx.delete(pendingPost).where(eq(pendingPost.owner, owner));

        const tradeEntry = {
          amount: 1,
          hash: event.transactionHash,
          owner: owner.toLowerCase(),
          price: BigInt(0),
          shareId: shareId,
          side: 0,
          supply: 1,
          trader: owner.toLowerCase(),
        };

        console.log("Inserting trade", tradeEntry);
        await tx.insert(trade).values(tradeEntry);

        const user = await tx.query.user.findFirst({
          columns: {
            username: true,
          },
          where: (row, { like }) => like(row.address, owner),
        });

        const paths = [`/post/${publicId}`, "/"];

        if (user) {
          paths.push(`/@${user.username}`);
        }

        await Promise.all(
          paths.map(async (path) => {
            const url = `${process.env.DEPLOYED_URL}/api/revalidate?secret=${process.env.REVALIDATE_SECRET}&path=${path}`;
            console.log("Revalidating", url);
            await fetch(url, { method: "POST" });
          }),
        );
      });
    } catch (e: any) {
      console.error(e);
      msgDiscord(`Error creating share: ${e.message}`);
    }
  };
}
