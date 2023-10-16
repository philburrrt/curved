import { Indexer } from "./indexer";

const indexer = new Indexer();
const main = async () => {
  await indexer.indexHistoricalBlocks();
  indexer.start();
};

main();
