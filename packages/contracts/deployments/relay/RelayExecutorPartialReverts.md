# Deployment: RelayExecutorPartialReverts

## Description

RelayExecutorPartialReverts is a variant of
[RelayExecutor](./RelayExecutor.md) where each bundle in a batch-of-batches
executes independently. A failing bundle reverts only its own state changes;
all other bundles continue executing.

It overrides `_executeBatchOfBatches` to wrap each sub-batch `execute()` in a
`try/catch`, creating an isolated EVM call frame per bundle. Successful bundles
emit `BundleExecuted()` (inherited); failed bundles emit
`BundleFailed(uint256 bundleIndex, bytes reason)` from the parent frame.

Key properties:

- **Stateless** -- no storage, no initialization, no upgrade concerns.
- **Independent bundles** -- a failing bundle reverts only its own state and
  logs. Other bundles are unaffected.
- **BundleFailed event** -- emitted for each failed bundle with the revert
  reason, serving as a log delimiter alongside `BundleExecuted`.
- **Authorization** -- `_executeBatchOfBatches` enforces
  `require(msg.sender == address(this))` before dispatching sub-batches via
  external self-calls. This is necessary because the `try this.execute()`
  pattern would otherwise launder `msg.sender` in the child frame.
- **ERC-1271** -- inherits `isValidSignature` from RelayExecutor.

Receipt log layout for a batch with 3 bundles (bundle 1 fails):

```
[logA, logB, BundleExecuted, BundleFailed, logF, BundleExecuted]
 └── bundle 0 ──────────────┘ └─ bundle 1 ┘ └── bundle 2 ────┘
```

## Deployment Method

The keyless CREATE2 factory at
`0x0000000000ffe8b47b3e2130213b802212439497` was used to permissionlessly
deploy RelayExecutorPartialReverts to a deterministic address across all
chains. Anyone can verify or redeploy using the same initcode and salt.

## Deployment Inputs

No constructor arguments, no linked libraries.

```typescript
{
  contractName: "RelayExecutorPartialReverts",
  args: [],
  libraries: {},
}
```

- **Initcode Hash:** `0x374b8431e6f90627b0a45cc8b2dff8b5291b218bee3927f20d4e3cd6419f1998`
- **Salt:** `0x00000000000000000000000000000000000000001f330b1b8ad57a61f61c00e0`
- **Deployed Address:** `0x00000000000f75216F9A9F23d82c287AA2446bF9`

## Deployments

| Chain            | Chain ID   | Address | Transaction |
|------------------|------------|---------|-------------|
| Sepolia          | 11155111   | [0x00000000000f75216F9A9F23d82c287AA2446bF9](https://sepolia.etherscan.io/address/0x00000000000f75216F9A9F23d82c287AA2446bF9) | [0x470e3c07...](https://sepolia.etherscan.io/tx/0x470e3c0752a8ab406bd7f028c0b31b0d20f19ba3113a0f193712e9f73cf81e6f) |
| Ethereum Mainnet | 1          | [0x00000000000f75216F9A9F23d82c287AA2446bF9](https://etherscan.io/address/0x00000000000f75216F9A9F23d82c287AA2446bF9) | [0x33650d6b...](https://etherscan.io/tx/0x33650d6b35eee1fe2261ed4949342c4b92d52bce93f3a0ef5d00fe0a971c060f) |
| Arbitrum One     | 42161      | [0x00000000000f75216F9A9F23d82c287AA2446bF9](https://arbiscan.io/address/0x00000000000f75216F9A9F23d82c287AA2446bF9) | [0x995dbbe6...](https://arbiscan.io/tx/0x995dbbe6bd3b9fab77114a7e77be45a1a3155dc13184072127ab7b9419fd6814) |
| Base             | 8453       | [0x00000000000f75216F9A9F23d82c287AA2446bF9](https://basescan.org/address/0x00000000000f75216F9A9F23d82c287AA2446bF9) | [0x6ec00ec3...](https://basescan.org/tx/0x6ec00ec30c51ec53387bd5bd7264f5f86740c7be5687b2763dae954d7f9d2179) |

Same address on every chain, verified via the immutable CREATE2 factory.
