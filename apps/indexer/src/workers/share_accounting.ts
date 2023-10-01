// worker.js
import { parentPort } from "worker_threads";
import { db } from "../DB";

parentPort!.on("message", async (event: any) => {
  // Your logic here for each transaction hash
  parentPort!.postMessage(`Share worker received ${event.event}`);
});
