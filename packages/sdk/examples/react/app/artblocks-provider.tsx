"use client";

import * as React from "react";
import { useAuth } from "./(auth)/auth-provider";
import ArtBlocksSDK from "@artblocks/sdk";
import { usePublicClient } from "wagmi";
import { createContext } from "react";

const ArtBlocksContext = createContext<ArtBlocksSDK | null>(null);

interface ArtblocksProviderProps {
  children: React.ReactNode;
}

export function ArtBlocksProvider({ children }: ArtblocksProviderProps) {
  const { jwt } = useAuth();
  const publicClient = usePublicClient();

  const abSdk = React.useMemo(() => {
    if (!publicClient) {
      return null;
    }

    return new ArtBlocksSDK({
      publicClient,
      jwt,
      graphqlEndpoint: process.env.NEXT_PUBLIC_GRAPHQL_API_ENDPOINT as string,
    });
  }, [publicClient, jwt]);

  return (
    <ArtBlocksContext.Provider value={abSdk}>
      {children}
    </ArtBlocksContext.Provider>
  );
}

export function useArtBlocksSdk() {
  const context = React.useContext(ArtBlocksContext);

  if (context === undefined) {
    throw new Error("useArtblocksSdk must be used within an ArtblocksProvider");
  }

  return context;
}
