// worker.js
import { parentPort } from "worker_threads";
import { db } from "../DB";

parentPort!.on("message", async (event: any) => {
  // Your logic here for each transaction hash
  console.log("User worker received", event);
  parentPort!.postMessage(`User worker received ${event.event}`);
});
