# Deployments: GenArt721RoyaltyOverrideSplits

## Description

The immutable CREATE2 factory was used to deterministically deploy the
`GenArt721RoyaltyOverrideSplits` contract on Ethereum mainnet.

This contract is a Royalty Registry override that maps each
`(core contract, project)` pair to a royalty configuration consisting of a
splitter address and a BPS value. All configuration is managed by a single
`Ownable` owner. It implements `IArtblocksRoyaltyOverride` and is intended
to replace the legacy `GenArt721RoyaltyOverride` shim
(`0x7B5369c24a47A72eCF932bf6974f506dDE4D5Eb1`) for the flagship core contracts.

### Key design decisions

- **No on-chain core contract dependency**: Project IDs are derived from token
  IDs via `ABHelpers.tokenIdToProjectId()` (`tokenId / 1,000,000`), so the
  contract works across V0, V1, and V3 core contracts without calling into them.
- **Admin-only configuration**: A single `Ownable` owner can set or remove
  royalty configs per `(coreContract, projectId)` pair.
- **Storage-packed config**: Each `RoyaltyConfig` struct packs an `address`
  (20 bytes) and `uint16 bps` (2 bytes) into a single storage slot.
- **Revert on unconfigured**: `getRoyalties` reverts if no splitter is
  configured for the queried project, causing the Royalty Registry to fall
  through to other lookup methods.

### Constructor args

```typescript
const inputs = {
  contractName: "GenArt721RoyaltyOverrideSplits",
  args: ["0xCF00eC2B327BCfA2bee2D8A5Aee0A7671d08A283"], // owner (Art Blocks multisig)
  libraries: {},
};
```

## Results

- **Chain:** Ethereum Mainnet (1)
- **Address:** [`0xF45a3Ee084a56d6A985B8Ba355E27D58398970ff`](https://etherscan.io/address/0xF45a3Ee084a56d6A985B8Ba355E27D58398970ff)
- **Salt:** `0x0000000000000000000000000000000000000000000000000000000000000000`
- **Initcode Hash:** `0xadc20ec9257355a77e0e81dd885e7b2a896d83fc1d6c2b9041787bef366e79f2`
- **Factory:** Immutable CREATE2 Factory (`0x0000000000ffe8b47b3e2130213b802212439497`)

### Deployment transaction

- https://etherscan.io/tx/0xfcd6bd5e7c90591500671eb1997c321a9a458699d240fc83bb454ac2ee79e1f8

## Follow-on transactions

See the full migration plan at
[`deployments/flagship/V3/mainnet/RoyaltyOverrideSplits-Migration/MIGRATION_PLAN.md`](../flagship/V3/mainnet/RoyaltyOverrideSplits-Migration/MIGRATION_PLAN.md)
for the complete sequence of configuration and Royalty Registry integration
steps.

### Target core contracts

| Core | Address | Registry Action |
|------|---------|-----------------|
| V0 Flagship | `0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a` | `setRoyaltyLookupAddress` called by V0 admin EOA |
| V1 Flagship | `0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270` | `setRoyaltyLookupAddress` called by V1 admin EOA |
| V3 Flagship | `0x99a9B7c1116f9ceEB1652de04d5969CcE509B069` | `setRoyaltyLookupAddress` called via `AdminACLV0RoyaltyRegistry` |

### Related deployments

- **AdminACLV0RoyaltyRegistry:** [`0xa102DF42e9cAa7a7A2aa8b104Bdc8425B6B23632`](https://etherscan.io/address/0xa102DF42e9cAa7a7A2aa8b104Bdc8425B6B23632) — required for V3 core Royalty Registry integration
- **Royalty Registry Proxy:** `0xaD2184FB5DBcfC05d8f056542fB25b04fa32A95D`
- **Previous shim (being replaced):** `0x7B5369c24a47A72eCF932bf6974f506dDE4D5Eb1`
