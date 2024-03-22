import { PublicClient, getContract, Hex } from "viem";
import { IDelegationRegistry } from "../../abis/IDelegationRegistry";

/**
 * Define the registry for delegating a hot wallet to mint/claim airdrops on behalf of a vault wallet
 * @see https://delegate.cash/
 */
export const DELEGATION_REGISTRY = "0x00000000000076a84fef008cdabe6409d2fe638b";

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
    address: DELEGATION_REGISTRY,
    publicClient,
  });
  const userDelegatedVault = await contract.read.getDelegationsByDelegate([
    account,
  ]);
  return userDelegatedVault.map((vault) => vault.vault);
}
