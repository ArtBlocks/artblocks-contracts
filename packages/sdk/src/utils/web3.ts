import { Abi } from "abitype";
import { WalletClient, Hex, PublicClient } from "viem";

export async function submitTransaction({
  publicClient,
  walletClient,
  address,
  abi,
  functionName,
  args,
  onUserAccepted,
}: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  address: Hex;
  abi: Abi;
  functionName: string;
  args: (string | number)[];
  onUserAccepted?: () => void;
}) {
  if (!walletClient.account) {
    throw Error("No account selected");
  }

  const hash = await walletClient.writeContract({
    address,
    abi,
    functionName,
    args,
    account: walletClient.account,
    chain: walletClient.chain,
  });

  onUserAccepted?.();

  if (hash) {
    // If the transaction reverts this will throw an error
    const { status, blockHash } = await publicClient.waitForTransactionReceipt({
      hash,
    });

    if (status !== "success") {
      throw new Error("Transaction reverted");
    }

    return { hash, blockHash };
  } else {
    throw new Error("Cannot retrieve transaction hash");
  }
}
