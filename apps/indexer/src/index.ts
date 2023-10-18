import { indexHistoricalBlocks } from "./indexHistoricalBlocks";
import { listenToBlocks } from "./listenToBlocks";
import { msgDiscord } from "./msgDiscord";
import { provider, sharesContract } from "./web3";

try {
  await indexHistoricalBlocks(provider, sharesContract);
  listenToBlocks(sharesContract);
} catch (e) {
  console.error("Error indexing historical blocks", e);
  msgDiscord("Error indexing").finally(() => {
    process.exit(1);
  });
}
