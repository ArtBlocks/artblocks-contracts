# Deployments: SeaDropXArtBlocksShim (mainnet) - DDUST

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy a SeaDropXArtBlocksShim contract to mainnet.
The shim is used to bridge between SeaDrop and ArtBlocks for a project, 0x00000053a75735169ad44f6760c11f3d3d3b3544-0

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "SeaDropXArtBlocksShim",
  args: [
    "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b",
    "0x00005EA00Ac477B1030CE78506496e8C2dE24bf5",
    "0x00000053a75735169ad44f6760c11f3d3d3b3544",
    0,
  ],
  libraries: {},
};
```

## Results:

salt: `0x00000000000000000000000000000000000000009489090746dcae62c2080040`
Deploys to address: `0x000000006cEF893052437484DCAF7Ba12AA6d884`

### Deployment transactions:

- https://etherscan.io/tx/0xd92b3a4a15e5d6deb0964f00b5799c9eca23da9e3ce09f023fcd170762334a5c
