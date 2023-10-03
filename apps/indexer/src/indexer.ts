import { Worker } from "worker_threads";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { ethers } from "ethers";
import { nanoidLowercase } from "./nanoid";
import CurveABI from "./abi/Curved.json" assert { type: "json" };
import { db } from "./DB";
import { trade, post, pendingPost, nftPost } from "db";
const { WS_URL, CONTRACT_ADDRESS } = process.env;

config();

export class Indexer {
  private accountingWorker: Worker;
  private provider: ethers.providers.WebSocketProvider;
  private curve: ethers.Contract;

  constructor() {
    this.accountingWorker = new Worker(
      new URL("./workers/user_accounting.js", import.meta.url),
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
        blockNumber: event.blockNumber,
        blockHash: event.blockHash,
        transactionIndex: event.transactionIndex,
        removed: event.removed,
        address: event.address,
        data: event.data,
        topics: event.topics,
        transactionHash: event.transactionHash,
        logIndex: event.logIndex,
        event: event.event,
        eventSignature: event.eventSignature,
        args: event.args.map((arg: any) => {
          return arg._isBigNumber ? arg.toString() : arg;
        }),
      };

      this.accountingWorker.postMessage(workerEvent); // TODO: once this works, move inside ShareCreated event to check for pending content

      // ! disabled while testing workers
      // switch (event.event) {
      //   case "ShareCreated": {
      //     this.handleShareCreated(event); // enter initial trade in db
      //     break;
      //   }
      //   case "Trade": {
      //     this.handleTrade(event); // enter trade in db
      //     break;
      //   }
      // }
    });
  }

  handleTrade = async (event: any) => {
    const entry = {
      shareId: event.args[0].toNumber(),
      side: event.args[1].toNumber(),
      trader: event.args[2].toLowerCase(),
      owner: event.args[3].toLowerCase(),
      amount: event.args[4].toNumber(),
      price: event.args[5].toString(),
      supply: event.args[6].toNumber(),
      hash: event.transactionHash,
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
        price: 0,
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
