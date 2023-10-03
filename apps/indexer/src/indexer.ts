import { nftPost, pendingPost, post, trade } from "db";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { ethers } from "ethers";
import { Worker } from "worker_threads";

import CurveABI from "./abi/Curved.json" assert { type: "json" };
import { db } from "./DB";
import { nanoidLowercase } from "./nanoid";
const { WS_URL, CONTRACT_ADDRESS } = process.env;

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
    this.shareWorker = new Worker(
      new URL("./workers/share_accounting.js", import.meta.url),
    );
    this.provider = new ethers.providers.WebSocketProvider(WS_URL ?? "");
    this.curve = new ethers.Contract(
      CONTRACT_ADDRESS ?? "",
      CurveABI.abi,
      this.provider,
    );
    this.start();
  }

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

      switch (event.event) {
        case "ShareCreated": {
          this.handleShareCreated(event); // enter initial trade in db
          this.userWorker.postMessage(workerEvent);

          break;
        }
        case "Trade": {
          this.handleTrade(event); // enter trade in db
          break;
        }
      }

      this.shareWorker.postMessage(workerEvent);
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
        where: (row, { eq }) => eq(row.owner, owner),
      });

      if (!pending) {
        console.log("No pending content found. Ignoring onchain event.");
        // TODO: Add share + uri to content table
        return;
      }

      await db.transaction(async (tx) => {
        const publicId = nanoidLowercase();

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
      });

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

      await db.insert(trade).values(tradeEntry);
    } catch (e) {
      console.error(e);
    }
  };
}
