# Deployments: SeaDropXArtBlocksShim (mainnet) - Maya Spirits Ofrenda Project

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy a SeaDropXArtBlocksShim contract to mainnet.
The shim is used to bridge between SeaDrop and ArtBlocks for a project, 0x00002491b000aa008756652c87cc92d87e896f0f-0

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "SeaDropXArtBlocksShim",
  args: [
    "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b",
    "0x00005EA00Ac477B1030CE78506496e8C2dE24bf5",
    "0x00002491b000aa008756652c87cc92d87e896f0f",
    0,
  ],
  libraries: {},
};
```

## Results:

Deploys to address: `0xbe64e7da669064dee3c1519f2ef8982e34e47dbb`

### Deployment transactions:

- https://etherscan.io/tx/0xff90b35e3b54e1c10cd8b9024bfe00832f8c9f172f8560cb5357ca6297659d67
