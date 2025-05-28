# Deployments: SeaDropXArtBlocksShim (base) - dev test

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy a SeaDropXArtBlocksShim contract to base.
The shim is used to bridge between SeaDrop and ArtBlocks for an internal dev test project, 0x0061b590A42433392bC76B3F3FE1404A5DF449c9-0

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "SeaDropXArtBlocksShim",
  args: [
    "0x1E615ee4C7AC89B525d48AeedF01d76E4e06a2d5",
    "0x00005EA00Ac477B1030CE78506496e8C2dE24bf5",
    "0x0061b590A42433392bC76B3F3FE1404A5DF449c9",
    0,
  ],
  libraries: {},
};
```

## Results:

salt: `0x0000000000000000000000000000000000000000b6494a03a1067d855d1500c0`
Deploys to address: `0x00000007BA9882869f702a2f219aa279f30434aE`

### Deployment transactions:

- base: https://basescan.org/tx/0x70d7777e54779fcd82731daddde825a4328b8af8496f4198353bfb761d6f7198
