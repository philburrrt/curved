// worker.js
import { parentPort } from "worker_threads";
import { db } from "../DB";
import { userBalances } from "../schema";

/*
export const userBalances = mysqlTable(
  "user_balances",
  {
    id: serial("id").primaryKey(),
    address: varchar("address", { length: ETH_ADDRESS_LENGTH }).notNull(),
    shareId: bigint("share_id", { mode: "number" }).notNull(),
    balance: bigint("balance", { mode: "number" }).notNull(), // share balance
    royaltiesEarned: bigint("royalties_earned", { mode: "number" }).notNull(),
  },
  (table) => ({
    addressIndex: uniqueIndex("address").on(table.address),
  }),
*/

// trade events get sent through here to update user share balance

/*
Share worker received {
  blockNumber: 41,
  blockHash: '0xea29126624eaddd8d5b1a00515bbd4a75f71042be3d24278dc3c853ae03d9161',
  transactionIndex: 0,
  removed: false,
  address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  data: '0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000005e92b13db8c172260e356b2486d1d9190a8c71eb000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb922660000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000033590a6584f20000000000000000000000000000000000000000000000000000000000000000017',
  topics: [
    '0x09a786993c2becc8264c2a90ccc09ca6a571883f97635cc26ed418876b3bdb0a'
  ],
  transactionHash: '0xa85d08eb5a3da20cb4919d94a91f42c21bc0cc1df5d25283960db6f79d287045',
  logIndex: 0,
  event: 'Trade',
  eventSignature: 'Trade(uint256,uint256,address,address,uint256,uint256,uint256)',
  args: [
    '0', // shareId 
    '1', // side
    '0x5e92B13DB8C172260e356b2486d1D9190a8C71EB', // trader
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // owner
    '2', // amount
    '231250000000000000', // price (before fees)
    '23' // resulting supply
  ]
}
*/

parentPort!.on("message", async (event: any) => {
  // if the event is `ShareCreated` it will only have 2 args. need to handle that
  // `Trade` events have 7 args
  console.log("User worker received", event);

  let entry;

  if (event.event === "ShareCreated") {
    entry = await handleShareCreated(event);
  }

  if (event.event === "Trade") {
    entry = await handleTrade(event);
  }

  parentPort!.postMessage(`User worker received ${event.event}`);
});

export const handleShareCreated = async (event: any) => {
  const creator = event.args[0];
  const shareId = event.args[1];
  // add 1 to the creator's balance of this share

  db.insert(userBalances).values({
    address: creator.toLowerCase(),
    shareId,
    balance: 1,
  });
};

export const handleTrade = async (event: any) => {
  const shareId = event.args[0];
  const side = event.args[1];
  const trader = event.args[2];
  const amount = event.args[4];

  // add `amount` to the trader's balance of this share if side is 0
  // add - `amount` to the trader's balance of this share if side is 1

  const shareState = await db.query.userBalances.findFirst({
    columns: {
      balance: true,
    },
    where: (row, { eq }) => eq(row.shareId, shareId) && eq(row.address, trader),
  });

  if (!shareState) {
    db.insert(userBalances).values({
      address: trader.toLowerCase(),
      shareId,
      balance: amount,
    });
    return;
  }

  console.log("shareState", shareState);
};

export const insertDb = async (event: any) => {};
