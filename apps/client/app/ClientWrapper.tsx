"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiConfig } from "wagmi";

import AuthProvider from "./AuthProvider";
import { NotificationWrapper } from "./NotificationWrapper";
import { RainbowKitAuthProvider } from "./RainbowkitAuthProvider";
import { chains, config } from "./wagmi";

const theme = darkTheme({
  accentColor: "#7dd3fc",
  accentColorForeground: "#000000",
  borderRadius: "large",
  fontStack: "system",
  overlayBlur: "small",
});

interface Props {
  children: React.ReactNode;
}

export default function ClientWrapper({ children }: Props) {
  return (
    <WagmiConfig config={config}>
      <AuthProvider>
        <RainbowKitAuthProvider>
          <RainbowKitProvider theme={theme} chains={chains}>
            <NotificationWrapper>{children}</NotificationWrapper>
          </RainbowKitProvider>
        </RainbowKitAuthProvider>
      </AuthProvider>
    </WagmiConfig>
  );
}
