import { MerkleTree } from "merkletreejs";
import { keccak256, solidityKeccak256 } from "ethers/lib/utils";

/**
 * @summary Error thrown when a user is not in the provided allowlist.
 * @description An empty merkle proof is also a valid merkle proof - this
 * error is thrown when a user is not in the provided allowlist for a project,
 * allowing client applications to distinguish between a valid empty merkle
 * proof and a missing allowlist entry.
 */
export class AllowlistEntryDoesNotExist extends Error {
  constructor() {
    super("An allowlist entry does not exist for the provided wallet address.");
    this.name = "AllowlistEntryDoesNotExist";
  }
}

/**
 * @summary Generate a merkle proof for a user.
 * @description This function is used to generate a merkle proof for a user. This proof
 * is used to verify that the user is in the allowlist for a given project.
 * @param addresses the list of addresses in the allowlist
 * @param userAddress the user's wallet address
 * @returns the merkle proof for the user
 */
export const generateUserMerkleProof = (
  addresses: string[],
  userAddress: string
): string[] => {
  if (!addresses.includes(userAddress)) {
    throw new AllowlistEntryDoesNotExist();
  }

  const merkleTree = new MerkleTree(
    addresses.map((addr) => solidityKeccak256(["address"], [addr])),
    keccak256,
    {
      sortPairs: true,
    }
  );

  return merkleTree.getHexProof(solidityKeccak256(["address"], [userAddress]));
};
