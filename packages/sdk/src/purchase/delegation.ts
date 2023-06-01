import { ethers, Signer, providers } from "ethers";

import { IDelegationRegistry } from "../generated/contracts/IDelegationRegistry";
import { IDelegationRegistry__factory } from "../generated/contracts/factories/IDelegationRegistry__factory";

/**
 * Define the registry for delegating a hot wallet to mint/claim airdrops on behalf of a vault wallet
 * @see https://delegate.cash/
 */
export const DELEGATION_REGISTRY = "0x00000000000076a84fef008cdabe6409d2fe638b";

/**
 * @summary Get the delegation registry contract.
 * @description This function is used to get the delegation registry contract
 * so that we can call the getDelegationsByDelegate function to determine if
 * the user has delegated to a vault.
 * @param contractAddress the address of the delegation registry contract
 * @param signerOrProvider ethers signer or provider
 * @returns the delegation registry contract interface
 */
export const getDelegationRegistryContract = (
  contractAddress: string,
  signerOrProvider: Signer | providers.Provider
): IDelegationRegistry => {
  return IDelegationRegistry__factory.connect(
    contractAddress,
    signerOrProvider
  );
};

/**
 * @summary Get the vaults for which the user is a delegate.
 * @description This function is used to retrieve the vaults for which the user is a delegate. If
 * the user has delegated to a vault, then the user will be able to mint
 * allowlisted projects from that vault.
 * @param provider ethers provider to use for the contract call
 * @param account the current user's wallet address
 * @returns array of vault addresses for which the user is a delegate
 */
export async function getDelegateVaults(
  provider: ethers.providers.Provider,
  account: string
): Promise<string[]> {
  const contract = getDelegationRegistryContract(DELEGATION_REGISTRY, provider);
  const userDelegatedVault = await contract.getDelegationsByDelegate(account);
  return userDelegatedVault.map((vault) => vault.vault);
}
