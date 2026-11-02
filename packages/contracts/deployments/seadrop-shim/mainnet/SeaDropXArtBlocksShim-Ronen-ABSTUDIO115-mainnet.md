# Deployments: SeaDropXArtBlocksShim (mainnet) - Ronen / Art Blocks Studio | 115

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy a SeaDropXArtBlocksShim contract to mainnet.
The shim is used to bridge between SeaDrop and ArtBlocks for project `0x0000000eB0B2a84710E4d7F1ff4BF6C54b73A143-0` (Ronen / ABSTUDIO_115).

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "SeaDropXArtBlocksShim",
  args: [
    "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b", // minter filter (mainnet)
    "0x00005EA00Ac477B1030CE78506496e8C2dE24bf5", // allowed SeaDrop (mainnet)
    "0x0000000eB0B2a84710E4d7F1ff4BF6C54b73A143", // core contract
    0, // project ID
  ],
  libraries: {},
};
```

**Initcode hash:** ``

## Results:

salt: `0x0000000000000000000000000000000000000000000000000000000000000000`
Deploys to address: `0xF28cC9eD266159C316ea71964ec37e99a93f9236`

### Deployment transactions:

- https://etherscan.io/tx/0xea72f42511e3c5f46d35fd0f93c2374841f548a3dd5a6a8ae28b0e76a19ae938
