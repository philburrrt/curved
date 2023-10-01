import { Worker } from "worker_threads";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { ethers } from "ethers";

import CurveABI from "./abi/Curved.json" assert { type: "json" };
import { db } from "./DB";
import { content, pendingContent, trades } from "./schema";
const { WS_URL, CONTRACT_ADDRESS } = process.env;

config();

export class Indexer {
  private accountingWorker: Worker;
  private shareWorker: Worker;
  private provider: ethers.providers.WebSocketProvider;
  private curve: ethers.Contract;

  constructor() {
    this.accountingWorker = new Worker(
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
    this.accountingWorker.on("message", (event) => {
      console.log("Worker received", event);
    });
  }

  public async start() {
    this.curve.on("*", async (event) => {
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

      switch (event.event) {
        case "ShareCreated": {
          // this.handleShareCreated(event);  // enter initial trade in db
          this.accountingWorker.postMessage(workerEvent);
          break;
        }
        case "Trade": {
          // this.handleTrade(event); // enter trade in db
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
    await db.insert(trades).values(entry);
  };

  handleShareCreated = async (event: any) => {
    const owner = event.args[0];
    const shareId = event.args[1].toNumber();

    try {
      const pending = await db.query.pendingContent.findFirst({
        where: (row, { eq }) => eq(row.owner, owner),
      });

      if (!pending) {
        console.log("No pending content found. Ignoring onchain event.");
        // TODO: Add share + uri to content table
        return;
      }

      console.log(
        `Inserting ${owner} and ${shareId} into content table`,
        pending,
      );

      await db.insert(content).values({
        description: pending.description,
        owner,
        shareId,
        url: pending.url,
      });

      console.log("Deleting pending content");

      await db.delete(pendingContent).where(eq(pendingContent.owner, owner));

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

      await db.insert(trades).values(tradeEntry);
    } catch (e) {
      console.error(e);
    }
  };
}
