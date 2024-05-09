# Deployments: GenArt721CoreV3_Engine Implementation

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the GenArt721CoreV3_Engine implementation contract to any network.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "GenArt721CoreV3_Engine",
  args: [],
  libraries: {
    "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
      "0x000000000016A5A5ff2FA7799C4BEe89bA59B74e",
  },
};
```

## Results:

Deploys to address: `0x00000000AEf91971cc6251936Ec6568B23b55342`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0x86e568cb79df0290040fd7b0f0a104c9a113891de4e5dda418d2d7e6927b1188
