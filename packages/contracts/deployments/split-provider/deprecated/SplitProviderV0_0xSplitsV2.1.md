# Deployments: SplitProviderV0

_This deployment is using 0xSplits V2.1, due to the mainnet-only USDT issues highlighted in the [0xSplits Blog Post](https://splits.org/blog/warning-mainnet-usdt-cannot-be-distributed-from-immutable-v2-splits/)._

_For consistency across all networks within the Art Blocks system, new SplitProviderV0 contracts were deployed to all networks._

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the SplitProviderV0 contract to any network.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "SplitProviderV0",
  args: [
    "0x5cbA88D55Cec83caD5A105Ad40C8c9aF20bE21d1", // pull split factory, 0xSplits V2.1
  ],
  libraries: {},
};
```

## Results:

Deploys to address: `0x000000000ef75C77F6bd0b2Ee166501FbBDb40c8`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0xe8fbd921a61aab98188e23453fba03e7478edf5aecf83719e69c4c052eb10588
- mainnet: https://etherscan.io/tx/0x0e7ee2a614cbdf916c7bc23d9e39b4d5214194a7de70c6b663ead91efe011d15
- arbitrum: https://arbiscan.io//tx/0x34b83e5894a6ff7c1565b3f9285bc6a24708e966c7f958d78ac3b72243f6c7d8
- base: https://basescan.org/tx/0xf7dcbe9226bd7b66c7624fa55093a4547f48cd14679b8f9b48d1dfeaaeae9c20
