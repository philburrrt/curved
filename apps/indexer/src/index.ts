import { provider, sharesContract } from "./web3";

import { indexHistoricalBlocks } from "./indexHistoricalBlocks";
import { listenToBlocks } from "./listenToBlocks";
import { msgDiscord } from "./msgDiscord";

try {
  await indexHistoricalBlocks(provider, sharesContract);
  listenToBlocks(sharesContract);
} catch (e) {
  console.error("Error indexing historical blocks", e);
  msgDiscord("Error indexing historical blocks").finally(() => {
    process.exit(1);
  });
}
