import { ethers } from "ethers";
import SharesABI from "./abi/Shares.json" assert { type: "json" };

if (!process.env.WS_URL) {
  throw new Error("WS_URL env variable must be set");
}

if (!process.env.SHARES_ADDRESS) {
  throw new Error("SHARES_ADDRESS env variable must be set");
}

export const provider = new ethers.providers.WebSocketProvider(
  process.env.WS_URL,
);
export const sharesContract = new ethers.Contract(
  process.env.SHARES_ADDRESS,
  SharesABI.abi,
  provider,
);
