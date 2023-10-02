import dotenv from "dotenv";
dotenv.config();
const { LOCAL_CURVED_ADDRESS, LOCAL_PRIVATE_KEY } = process.env;
console.log("LOCAL_CURVED_ADDRESS: ", LOCAL_CURVED_ADDRESS);
console.log("LOCAL_PRIVATE_KEY: ", LOCAL_PRIVATE_KEY);
import { Wallet, ethers } from "ethers";
import { CURVED_ABI } from "../abi/CurvedAbi.js";
import assert from "assert";
import { getReason } from "../utils.js";

const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
const wallet = new ethers.Wallet(LOCAL_PRIVATE_KEY, provider);
const curved = new ethers.Contract(LOCAL_CURVED_ADDRESS, CURVED_ABI, wallet);

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
    const contractInstance = new ethers.Contract(
      LOCAL_CURVED_ADDRESS,
      CURVED_ABI,
      new Wallet(users[0].privateKey, provider),
    );
    const cost = await contractInstance.getBuyPriceAfterFee(0, 2);
    const tx = await contractInstance.buyShare(0, 2, {
      value: cost,
    });
    await tx.wait();
    console.log("2 shares purchased");
  } catch (e) {
    console.log(e.message);
    console.log("reason: ", getReason(e.message));
    process.exit(1);
  }
};

const testSellShare = async () => {
  try {
    const contractInstance = new ethers.Contract(
      LOCAL_CURVED_ADDRESS,
      CURVED_ABI,
      new Wallet(users[0].privateKey, provider),
    );
    const tx = await contractInstance.sellShare(0, 1);
    await tx.wait();
    console.log("1 shares sold", users[0].address);
  } catch (e) {
    console.log(e.message);
    console.log("reason: ", getReason(e.message));
    process.exit(1);
  }
};

(async () => {
  await setup();
  await testCreateShare();
  await testPurchaseShare();
  await testSellShare();
})();
