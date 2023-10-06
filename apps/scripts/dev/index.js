import dotenv from "dotenv";
import { ethers } from "ethers";
import { FARM_ABI } from "../abi/farm.js";
import { CURVED_ABI } from "../abi/CurvedAbi.js";
import assert from "assert";
import { getReason } from "../utils.js";

dotenv.config();
const { LOCAL_CURVE_ADDRESS, LOCAL_PRIVATE_KEY } = process.env;

console.log("LOCAL_CURVE_ADDRESS", LOCAL_CURVE_ADDRESS);
console.log("LOCAL_PRIVATE_KEY", LOCAL_PRIVATE_KEY);

const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
const wallet = new ethers.Wallet(LOCAL_PRIVATE_KEY, provider);
const farm = new ethers.Contract(LOCAL_CURVE_ADDRESS, FARM_ABI, wallet);

const setup = async () => {
  // Ensure that the owner is the wallet address
  const owner = await farm.owner();
  const walletAddress = wallet.address;
  assert.equal(owner, walletAddress, "Owner is not the wallet address");
};

const testCreateShares = async () => {
  try {
    const tx = await farm.createShares(wallet.address, 1, {
      value: ethers.utils.parseEther("0"),
    });
    await tx.wait();
    console.log("Shares created");
  } catch (e) {
    console.log(getReason(e.message));
    process.exit(1);
  }
};

const proposeFeeChange = async (newFeePercen, proposalString) => {
  // curved.setProtocolFeePercent(_royaltyFeePercent)
  const curved = new ethers.Contract(LOCAL_CURVE_ADDRESS, CURVED_ABI, wallet);
  const setFeeCalldata = curved.interface.encodeFunctionData(
    "setProtocolFeePercent",
    newFeePercen,
  );

  await governor.propose(
    [LOCAL_CURVE_ADDRESS],
    [0],
    [setFeeCalldata],
    proposalString,
  );
};

const testGovernance = async () => {
  /** 
  const tokenAddress = ...;
  const token = await ethers.getContractAt(‘ERC20’, tokenAddress);

  const teamAddress = ...;
  const grantAmount = ...;
  const transferCalldata = token.interface.encodeFunctionData(‘transfer’, [teamAddress, grantAmount]);

  await governor.propose(
    [tokenAddress],
    [0],
    [transferCalldata],
    “Proposal #1: Give grant to team”,
  );

  const descriptionHash = ethers.utils.id(“Proposal #1: Give grant to team”);

  await governor.queue(
    [tokenAddress],
    [0],
    [transferCalldata],
    descriptionHash,
  );

  await governor.execute(
    [tokenAddress],
    [0],
    [transferCalldata],
    descriptionHash,
  );
  */
};

(async () => {
  await setup();
  await testCreateShares();
})();
