# Deployments: SplitProviderV0

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the SplitProviderV0 contract to any network.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "SplitProviderV0",
  args: [
    "0x80f1B766817D04870f115fEBbcCADF8DBF75E017", // pull split factory, 0xSplits
  ],
  libraries: {},
```

## Results:

Deploys to address: `0x0000000004B100B47f061968a387c82702AFe946`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0x9e665e84a550acf3f4b5810995a3216f2d3fcffb97c609e499008b7a6593b28a
