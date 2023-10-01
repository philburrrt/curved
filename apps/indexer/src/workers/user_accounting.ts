// worker.js
const { parentPort } = require("worker_threads");

parentPort.on("message", async (transactionHash: any) => {
  // Your logic here for each transaction hash
  parentPort.postMessage(`Processed transaction: ${transactionHash}`);
});
