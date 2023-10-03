// worker.js
import { parentPort } from "worker_threads";
import { db } from "../DB";
import { userBalances, trade } from "db";
import { eq, and } from "drizzle-orm";
import PQueue from "p-queue";

// receives trade and sharecreaed event
// if sharecreated, add 1 to creators share balance in userBalances table
// if trade, check to see if there is a balance of that shareId in userBalances table
// if there is, .update() the balance. if not .insert() the balance

const queue = new PQueue({ concurrency: 1 });

const handleMessage = async (event: any) => {};

parentPort!.on("message", async (event: any) => {
  queue.add(() => handleMessage(event));
});
