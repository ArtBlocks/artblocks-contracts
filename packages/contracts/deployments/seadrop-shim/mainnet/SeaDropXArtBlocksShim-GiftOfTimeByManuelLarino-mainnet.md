# Deployments: SeaDropXArtBlocksShim (mainnet) - Gift of Time by Manuel Larino

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy a SeaDropXArtBlocksShim contract to mainnet.
The shim is used to bridge between SeaDrop and ArtBlocks for a project, 0x000000DC68934eD27Fd11E32491cdF6717ACAF21-1 (Gift of Time by Manuel Larino)

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "SeaDropXArtBlocksShim",
  args: [
    "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b", // minterFilter_
    "0x00005EA00Ac477B1030CE78506496e8C2dE24bf5", // allowedSeaDrop_
    "0x000000DC68934eD27Fd11E32491cdF6717ACAF21", // genArt721Core_
    1, // projectId_
  ],
  libraries: {},
};
```

## Results:

salt: `0x0000000000000000000000000000000000000000000000000000000000000000`
Deploys to address: `0x0F4007A244aA34796F44CA013bE906aeb1058b70`

### Deployment transactions:

- https://etherscan.io/tx/0xa04d50caa51d9a43e84e76363ddfb0e6f3faae556bbd292d1411fdfdfce7aa5a
