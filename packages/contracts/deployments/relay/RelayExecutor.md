# Deployment: RelayExecutor

## Description

RelayExecutor is a stateless EIP-7702 delegation target for batched EVM call
execution. EOAs delegate their code to this contract, enabling seamless
multicall via a relay. It extends Solady's ERC7821 (the same base as
[BEBE](https://github.com/vectorized/bebe)) with a `BundleExecuted` event
emitted after each sub-batch, allowing the relay to reliably attribute logs to
individual queue items by slicing the receipt between consecutive events.

Key properties:

- **Stateless** -- no storage, no initialization, no upgrade concerns.
- **ERC-1271** -- `isValidSignature` performs `ecrecover` against `address(this)`
  (the EOA under delegation), so contracts that check for code before calling
  `ecrecover` continue to work.
- **Batch-of-batches** -- leverages `_executeBatchOfBatches` from ERC7821
  as-is. Each relay queue item is encoded as its own sub-batch; the override
  emits one `BundleExecuted()` per sub-batch.
- **Authorization** -- only `msg.sender == address(this)` can call `execute()`,
  enforced by the base ERC7821. Under EIP-7702, the EOA signs the transaction
  so this holds naturally.

## Deployment Method

The keyless CREATE2 factory at
`0x0000000000ffe8b47b3e2130213b802212439497` was used to permissionlessly
deploy RelayExecutor to a deterministic address across all chains. Anyone can
verify or redeploy using the same initcode and salt.

## Deployment Inputs

No constructor arguments, no linked libraries.

```typescript
{
  contractName: "RelayExecutor",
  args: [],
  libraries: {},
}
```

- **Initcode Hash:** `0x14b0507e0f1514257addc718397620b3d5d90c486668cabcde18f1e0d0609d1c`
- **Salt:** `0x0000000000000000000000000000000000000000b319f1595abc75884a1b0070`
- **Deployed Address:** `0x00000000E5B4F98664E466418C7cdBF6745843c4`

## Deployments

| Chain            | Chain ID   | Address | Transaction |
|------------------|------------|---------|-------------|
| Sepolia          | 11155111   | [0x00000000E5B4F98664E466418C7cdBF6745843c4](https://sepolia.etherscan.io/address/0x00000000E5B4F98664E466418C7cdBF6745843c4) | [0x0824b0c8...](https://sepolia.etherscan.io/tx/0x0824b0c8ba10f17b4893c354856e2f9de41985d7bb0c3a26692ff33305c823b4) |
| Ethereum Mainnet | 1          | [0x00000000E5B4F98664E466418C7cdBF6745843c4](https://etherscan.io/address/0x00000000E5B4F98664E466418C7cdBF6745843c4) | [0xce920bb8...](https://etherscan.io/tx/0xce920bb8ff382bbe0b16733d70dd7bcf118478d6a4ae3ba3bbd65992d45f8b47) |
| Arbitrum One     | 42161      | [0x00000000E5B4F98664E466418C7cdBF6745843c4](https://arbiscan.io/address/0x00000000E5B4F98664E466418C7cdBF6745843c4) | [0x1ceb3577...](https://arbiscan.io/tx/0x1ceb357736ffdb9ef08608ed74a813cf47ce14062e50ac13cb7ce8cb2f29983a) |
| Base             | 8453       | [0x00000000E5B4F98664E466418C7cdBF6745843c4](https://basescan.org/address/0x00000000E5B4F98664E466418C7cdBF6745843c4) | [0x6ea40421...](https://basescan.org/tx/0x6ea4042f17bf42eae26cac54d1b8a23fc7112ba761c313b16b43aa2695cbe512) |

Same address on every chain, verified via the immutable CREATE2 factory.
