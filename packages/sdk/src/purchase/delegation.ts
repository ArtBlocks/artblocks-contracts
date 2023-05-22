import { ethers, Signer, providers } from "ethers";

import { IDelegationRegistry } from "../contracts/IDelegationRegistry";
import { IDelegationRegistry__factory } from "../contracts/factories/IDelegationRegistry__factory";

/**
 * Define the registry for delegating a hot wallet to mint/claim airdrops on behalf of a vault wallet
 * @see https://delegate.cash/
 */
export const DELEGATION_REGISTRY = "0x00000000000076a84fef008cdabe6409d2fe638b";

/**
 * @summary Error thrown when a user is a delegate on behalf of multiple vaults.
 * @description Currently, only a single vault can be delegated to at a time.
 * This error is thrown when a user has delegated to multiple vaults, and provides
 * an easy way for SDK consumers to catch this error and display a helpful message
 * to the user.
 */
export class MultipleDelegationsError extends Error {
  constructor() {
    super(
      "Delegating multiple vaults is not currently supported. You may run into errors when minting allowlisted projects."
    );
    this.name = "MultipleDelegationsError";
  }
}

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
 * @summary Get the vault that the user has delegated to.
 * @description This function is used to determine if the user has delegated to a vault. If
 * the user has delegated to a vault, then the user will be able to mint
 * allowlisted projects from that vault. Currently, only a single vault
 * can be delegated for any single wallet at a time.
 * @param provider ethers provider to use for the contract call
 * @param account the current user's wallet address
 * @returns the single vault address that the user has delegated to
 */
export async function getDelegateVault(
  provider: ethers.providers.Provider,
  account: string
): Promise<string | undefined> {
  const contract = getDelegationRegistryContract(DELEGATION_REGISTRY, provider);
  const userDelegatedVault = await contract.getDelegationsByDelegate(account);

  if (userDelegatedVault.length > 1) {
    throw new MultipleDelegationsError();
  } else {
    return userDelegatedVault[0]?.vault;
  }
}
