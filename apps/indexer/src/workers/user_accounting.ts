// worker.js
import { parentPort } from "worker_threads";

parentPort!.on("message", async (event: any) => {
  // Your logic here for each transaction hash
  parentPort!.postMessage(`User worker received ${event.event}`);
});
