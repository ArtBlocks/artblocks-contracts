# Deployments: V3FlexLib

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the V3FlexLib contract to any network.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "V3FlexLib",
  args: [],
  libraries: {
    "contracts/libs/v0.8.x/BytecodeStorageV1.sol:BytecodeStorageReader":
      "0x7497909537cE00fDda93c12d5083D8647C593c67",
  },
};
```

salt: `0x0000000000000000000000000000000000000000a24117da9a039388b1030080`

## Results:

Deploys to address: `0x0000000F6F896C1dA9164621a29C3d941E020efa`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0x58d0d719f0f362d26ad906fd6baaaefd132d7ca3f9bc9762a70c6218a1bd8441
