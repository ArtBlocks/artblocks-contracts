import { Abi } from "abitype";
import get from "lodash/get";
import { WalletClient, Hex, PublicClient } from "viem";

/**
 * Constructs an array of arguments for a web3 transaction call from given form values and explicit parameters.
 *
 * It accepts a list of parameter names expected by the contract function (`schemaArgs`),
 * a set of form values (`formValues`), and additional explicit parameters such as `projectIndex`
 * and `coreContractAddress` that are not present in the form values but required by the transaction.
 * The function maps the `schemaArgs` to their corresponding values in `formValues`, appending
 * `projectIndex` and `coreContractAddress` as needed to construct a properly ordered argument array.
 *
 * @param schemaArgs - Names of arguments as expected by the contract function.
 * @param formValues - The current values of the form fields.
 * @param projectIndex - An identifier for the project, passed explicitly.
 * @param coreContractAddress - The contract address, passed explicitly.
 * @returns An ordered array of arguments for the web3 transaction.
 */
export function mapFormValuesToArgs(
  schemaArgs: string[],
  formValues: Record<string, any>,
  projectIndex: number,
  coreContractAddress: string
): (string | number)[] {
  return schemaArgs.reduce<(string | number)[]>((acc, arg) => {
    if (arg === "projectIndex") {
      return acc.concat(projectIndex);
    }

    if (arg === "coreContractAddress") {
      return acc.concat(coreContractAddress);
    }

    // Concat the value in an array so that array values are not flattened
    return acc.concat([get(formValues, arg)]);
  }, []);
}

/**
 * Submits a blockchain transaction through a wallet client after simulating the transaction
 * with a public client. It validates the account selection, simulates the transaction,
 * and upon successful simulation and user acceptance, sends the transaction to the blockchain.
 *
 * @param publicClient - An instance of PublicClient to simulate the transaction.
 * @param walletClient - An instance of WalletClient to send the transaction from the user's account.
 * @param address - The contract address on the blockchain.
 * @param abi - The contract's Application Binary Interface.
 * @param functionName - The contract function to call.
 * @param args - The arguments to pass to the contract function.
 * @param onSimulationSuccess - Optional callback invoked after a successful simulation.
 * @param onUserAccepted - Optional callback invoked when the user has accepted the transaction.
 * @returns An object containing the transaction hash and the block hash if the transaction is successful.
 * @throws Error with a descriptive message if the transaction fails at any stage.
 */
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
