# Deployments: SeaDropXArtBlocksShim (mainnet) - Nygilia / Art Blocks Studio | 95

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy a SeaDropXArtBlocksShim contract to mainnet.
The shim is used to bridge between SeaDrop and ArtBlocks for project `0x9615b40941EbcCd5d4f8F03941C85A2fB03E7160-0` (Nygilia / ABSTUDIO_95).

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "SeaDropXArtBlocksShim",
  args: [
    "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b", // minter filter (mainnet)
    "0x00005EA00Ac477B1030CE78506496e8C2dE24bf5", // allowed SeaDrop (mainnet)
    "0x9615b40941ebccd5d4f8f03941c85a2fb03e7160", // core contract
    0, // project ID
  ],
  libraries: {},
};
```

**Initcode hash:** `0x798f881a5ee1e312d91cfe78869393dc693a69ffcc39ea1eddd85628ec6389a7`

## Results:

salt: `0x0000000000000000000000000000000000000000000000000000000000000000`
Deploys to address: `0xeef970B91216Cac51f474f8d1dc2457D8CB16501`

### Deployment transactions:

- https://etherscan.io/tx/0xbe73bcb9b598aea2bdc19ff2fa88e4a59caa465f567a08840710c039af04ee80
