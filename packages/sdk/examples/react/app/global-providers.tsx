"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
  connectorsForWallets,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import { goerli } from "wagmi/chains";
import { jsonRpcProvider } from "@wagmi/core/providers/jsonRpc";
import { metaMaskWallet } from "@rainbow-me/rainbowkit/wallets";
import { AuthProvider } from "@/app/(auth)/auth-provider";
import { ArtBlocksProvider } from "./artblocks-provider";

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [goerli],
  [
    jsonRpcProvider({
      rpc: () => {
        return {
          http: process.env.NEXT_PUBLIC_JSON_RPC_PROVIDER_URL ?? "",
        };
      },
    }),
  ]
);

const connectors = connectorsForWallets([
  {
    groupName: "Popular",
    wallets: [
      metaMaskWallet({ chains, projectId: "977614ad6bd0cacaf715f99cc23eb789" }),
    ],
  },
]);

const wagmiConfig = createConfig({
  autoConnect: false,
  connectors,
  publicClient,
  webSocketPublicClient,
});

export default function GlobalProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <AuthProvider>
        <RainbowKitProvider chains={chains}>
          <ArtBlocksProvider>{children}</ArtBlocksProvider>
        </RainbowKitProvider>
      </AuthProvider>
    </WagmiConfig>
  );
}
