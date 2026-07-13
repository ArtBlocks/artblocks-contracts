# Deployments: SeaDropXArtBlocksShim (mainnet) - DDUST

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy a SeaDropXArtBlocksShim contract to mainnet.
The shim is used to bridge between SeaDrop and ArtBlocks for a project, 0x0D08b807fec2E80dD40EDBC4137E4542dc9c45Bc-2

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "SeaDropXArtBlocksShim",
  args: [
    "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b", // minterFilter_
    "0x00005EA00Ac477B1030CE78506496e8C2dE24bf5", // allowedSeaDrop_
    "0x0D08b807fec2E80dD40EDBC4137E4542dc9c45Bc", // genArt721Core_
    2, // projectId_
  ],
  libraries: {},
};
```

## Results:

salt: `0x0000000000000000000000000000000000000000000000000000000000000000`
Deploys to address: `0x2957E11E2Acd231894308C8fA44A4e8132db93ed`

### Deployment transactions:

- https://etherscan.io/tx/0x71349b15fd1f0b63d40398eef6a3f454c6b9d3e2aa7e91e528d337886131e2df
