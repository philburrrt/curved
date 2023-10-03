import dotenv from "dotenv";
dotenv.config();
const { CONTRACT_ADDRESS, LOCAL_PRIVATE_KEY } = process.env;
import { ethers } from "ethers";
import { CURVED_ABI } from "../abi/CurvedAbi.js";
import assert from "assert";
import { getReason } from "../utils.js";

const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
const wallet = new ethers.Wallet(LOCAL_PRIVATE_KEY, provider);
const curved = new ethers.Contract(CONTRACT_ADDRESS, CURVED_ABI, wallet);

/*
Flow:

/database
- delete database/dev.sqlite3 if exists
- npm run db init
- npm run logger
- npm run start

/scripts
- terminate anvil if running
- npm run anvil
- npm run deploy
- npm run mockEvents

*/

const users = [];
let userShares = new Array(9).fill(0);

const setup = async () => {
  // Insure that the owner is the wallet address
  const owner = await curved.owner();
  const walletAddress = wallet.address;
  assert.equal(owner, walletAddress, "Owner is not the wallet address");
  const balance = await provider.getBalance(walletAddress);
  console.log("Balance: ", ethers.utils.formatEther(balance));

  // create 10 random users and send them 100 ETH
  for (let i = 0; i < 9; i++) {
    const account = ethers.Wallet.createRandom();
    const user = {
      address: account.address,
      privateKey: account.privateKey,
    };
    await provider.send("anvil_setBalance", [
      user.address,
      "0x100000000000000000000",
    ]);
    users.push(user);
  }
};

const testCreateShare = async () => {
  try {
    const tx = await curved.createShare("ipfs://test");
    await tx.wait();
    console.log("Shares created");
  } catch (e) {
    console.log(e.message);
    console.log("reason: ", getReason(e.message));
    process.exit(1);
  }
};

const testPurchaseShare = async () => {
  try {
    const cost = await curved.getBuyPriceAfterFee(0, 1);
    const tx = await curved.buyShare(0, 1, { value: cost });
    await tx.wait();
    console.log("Shares purchased");
  } catch (e) {
    console.log(e.message);
    console.log("reason: ", getReason(e.message));
    process.exit(1);
  }
};

const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

const testPurchaseManyShares = async () => {
  for (let i = 0; i < users.length; i++) {
    const account = users[i];
    const curvedInstance = new ethers.Contract(
      CONTRACT_ADDRESS,
      CURVED_ABI,
      new ethers.Wallet(account.privateKey, provider),
    );

    const sharesToBuy = getRandomInt(1, 5);
    console.log("sharesToBuy: ", sharesToBuy);
    userShares[i] += sharesToBuy; // Update the user's share count
    console.log("userShares[i]: ", userShares[i]);

    const cost = await curvedInstance.getBuyPriceAfterFee(0, sharesToBuy);
    const tx = await curvedInstance.buyShare(0, sharesToBuy, { value: cost });
    await tx.wait();
    console.log(`User ${i} purchased ${sharesToBuy} shares.`);
  }
};

const testSellManyShares = async () => {
  for (let i = 0; i < users.length; i++) {
    const account = users[i];
    console.log("account: ", account);
    const curvedInstance = new ethers.Contract(
      CONTRACT_ADDRESS,
      CURVED_ABI,
      new ethers.Wallet(account.privateKey, provider),
    );

    const maxSharesToSell = userShares[i]; // Maximum shares a user can sell is what they own
    console.log("maxSharesToSell: ", maxSharesToSell);
    const sharesToSell = getRandomInt(1, maxSharesToSell);
    console.log("sharesToSell: ", sharesToSell);
    userShares[i] -= sharesToSell; // Deduct the shares sold from the user's share count
    console.log("userShares[i]: ", userShares[i]);
    const tx = await curvedInstance.sellShare(0, sharesToSell);
    console.log("tx sent");
    await tx.wait();
    console.log("tx mined");
    console.log(`User ${i} sold ${sharesToSell} shares.`);
  }
};

(async () => {
  await setup();
  await testCreateShare();
  await testPurchaseShare();
  await testPurchaseManyShares();
  await testSellManyShares();
})();
