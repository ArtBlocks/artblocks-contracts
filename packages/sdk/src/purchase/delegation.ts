import { PublicClient, getContract, Hex } from "viem";
import { IDelegationRegistry } from "../../abis/IDelegationRegistry";
import { DELEGATION_REGISTRY_ADDRESS } from "../utils/addresses";

/**
 * @summary Get the vaults for which the user is a delegate.
 * @description This function is used to retrieve the vaults for which the user is a delegate. If
 * the user has delegated to a vault, then the user will be able to mint
 * allowlisted projects from that vault.
 * @param publicClient to use for the contract call
 * @param account the current user's wallet address
 * @returns array of vault addresses for which the user is a delegate
 */
export async function getDelegateVaults(
  publicClient: PublicClient,
  account: Hex
): Promise<string[]> {
  const contract = getContract({
    abi: IDelegationRegistry,
    address: DELEGATION_REGISTRY_ADDRESS,
    client: {
      public: publicClient,
    },
  });
  const userDelegatedVault = await contract.read.getDelegationsByDelegate([
    account,
  ]);
  return userDelegatedVault.map((vault) => vault.vault);
}
