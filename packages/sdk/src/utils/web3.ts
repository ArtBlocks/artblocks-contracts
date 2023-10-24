import { Abi } from "abitype";
import { WalletClient, Hex, PublicClient } from "viem";

export async function submitTransaction({
  publicClient,
  walletClient,
  address,
  abi,
  functionName,
  args,
  onSimulationSuccess,
  onUserAccepted,
}: {
  publicClient: PublicClient;
  walletClient: WalletClient;
  address: Hex;
  abi: Abi;
  functionName: string;
  args: (string | number)[];
  onSimulationSuccess?: () => void;
  onUserAccepted?: () => void;
}) {
  if (!walletClient.account) {
    throw Error("No account selected");
  }

  try {
    const { request } = await publicClient.simulateContract({
      address,
      abi,
      functionName,
      args,
      account: walletClient.account,
      chain: walletClient.chain,
    });

    onSimulationSuccess?.();

    const hash = await walletClient.writeContract(request);

    onUserAccepted?.();

    if (hash) {
      // If the transaction reverts this will throw an error
      const { status, blockHash } =
        await publicClient.waitForTransactionReceipt({
          hash,
        });

      if (status !== "success") {
        throw new Error("Transaction reverted");
      }

      return { hash, blockHash };
    } else {
      throw new Error("Cannot retrieve transaction hash");
    }
  } catch (e) {
    if (
      e &&
      typeof e === "object" &&
      "shortMessage" in e &&
      typeof e.shortMessage === "string"
    ) {
      throw new Error(e.shortMessage);
    }

    throw e;
  }
}
