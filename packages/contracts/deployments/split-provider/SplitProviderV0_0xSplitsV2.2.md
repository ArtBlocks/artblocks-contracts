# Deployments: SplitProviderV0

_This deployment is using 0xSplits V2.2, due to the v2.1 mainnet-only USDT issues highlighted in the [0xSplits Blog Post](https://splits.org/blog/dont-send-mainnet-usdt-to-immutable-v2-1-splits/)._

Note: This is similar to the same issue found in the 0xSplits V2.1 deployment.

_For consistency across all networks within the Art Blocks system, new SplitProviderV0 contracts were deployed to all networks._

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the SplitProviderV0 contract to any network.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "SplitProviderV0",
  args: [
    "0x6B9118074aB15142d7524E8c4ea8f62A3Bdb98f1", // pull split factory, 0xSplits V2.2
  ],
  libraries: {},
};
```

## Results:

Deploys to address: `0x00000000CE5EEBAB4B5C2d6Cc5E73eaafA634DB3`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0x2ebe28a410dcb1660a2e59fa8b9219261342f65957151c2c5cd22a3347cfe89e
- mainnet: https://etherscan.io/tx/0xeb25c0eacbaef6ad6ba0475ac0449311f2940895ed67d7ae7d7ff2e03268e855
- arbitrum: https://arbiscan.io/tx/0xda964294674aa101a69b40d6e35fae5686178200be9c986d5fbb6c55c938434f
- base: https://basescan.org/tx/0x100cdeea3c1ee760c83cb09a1dda7d1b41e492da03ab628a87cd53ff50435d3c
