"use client";

import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { Chain, Config, configureChains, createConfig } from "wagmi";
import { goerli } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";

import { env } from "@/lib/env.mjs";

// const localhost = {
//   id: 9_999,
//   name: "Localhost",
//   nativeCurrency: {
//     decimals: 18,
//     name: "Ether",
//     symbol: "ETH",
//   },
//   network: "localhost",
//   rpcUrls: {
//     default: {
//       http: [env.NEXT_PUBLIC_RPC_URL],
//     },
//     public: { http: [env.NEXT_PUBLIC_RPC_URL] },
//   },
// };

const projectId = "e8f82c27482f4422f45df38f1e3c9ddc";

export const {
  chains,
  publicClient,
}: {
  chains: Chain[];
  publicClient: any;
} = configureChains(
  [...(env.NEXT_PUBLIC_NODE_ENV === "development" ? [goerli] : [goerli])],
  [publicProvider()],
);

const needsInjectedWalletFallback =
  typeof window !== "undefined" &&
  window.ethereum &&
  !window.ethereum.isMetaMask &&
  !window.ethereum.isCoinbaseWallet;

const connectors = connectorsForWallets([
  {
    groupName: "Popular",
    wallets: [
      metaMaskWallet({ chains, projectId }),
      rainbowWallet({ chains, projectId }),
      coinbaseWallet({ appName: "yuyu.social", chains }),
    ],
  },
  {
    groupName: "Other",
    wallets: [
      walletConnectWallet({ chains, projectId }),
      ...(needsInjectedWalletFallback ? [injectedWallet({ chains })] : []),
    ],
  },
]);

export const config: Config = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});
