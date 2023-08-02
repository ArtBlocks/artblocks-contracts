"use client";

import * as React from "react";
import { useAuth } from "@/app/(auth)/auth-provider";

import { ConnectButton } from "@rainbow-me/rainbowkit";

type WalletButtonProps = {
  className?: string;
};

const WalletButton = ({ className }: WalletButtonProps): React.ReactElement => {
  const { jwt, loading, signOut } = useAuth();

  return (
    <ConnectButton.Custom>
      {({ openConnectModal, mounted }) => {
        if (!mounted) {
          return null;
        }
        return (
          <button
            onClick={() => {
              if (loading) {
                return;
              }

              if (jwt) {
                signOut();
                return;
              }

              openConnectModal();
            }}
            className={`rounded-sm border border-blue-500 bg-blue-200 px-2 py-1 ${className}`}
          >
            {(() => {
              if (loading) {
                return "loading...";
              }

              if (!jwt) {
                return "connect";
              }

              if (jwt) {
                return "disconnect";
              }
            })()}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
};

export default WalletButton;
