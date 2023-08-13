import { Abi } from "abitype";
import { WalletClient, Hex, PublicClient } from "viem";

export async function submitTransaction({
  publicClient,
  walletClient,
  address,
  abi,
  functionName,
  args,
}: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  address: Hex;
  abi: Abi;
  functionName: string;
  args: (string | number)[];
}) {
  if (!walletClient.account) {
    return;
  }

  const hash = await walletClient.writeContract({
    address,
    abi,
    functionName,
    args,
    account: walletClient.account,
    chain: walletClient.chain,
  });

  if (hash) {
    // If the transaction reverts this will throw an error
    const { status } = await publicClient.waitForTransactionReceipt({
      hash,
    });

    if (status !== "success") {
      throw new Error("Transaction reverted");
    }
  } else {
    throw new Error("Cannot retrieve transaction hash");
  }
}
