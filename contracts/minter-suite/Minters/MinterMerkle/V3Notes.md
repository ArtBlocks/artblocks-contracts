## TODOs for MinterMerkleV3

- Emit event when assigning DELEGATION_REGISTRY_ADDRESS to enable off-chain indexing
  - This was a constant in the original, original version of MerkleMinterV2, so indexing is not possible on that minter (a constant or call to the contract must be used on the frontend)
