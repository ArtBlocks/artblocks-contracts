# Deployments: V3FlexLib

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the V3FlexLib contract to any network.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "V3FlexLib",
  args: [],
  libraries: {
    "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
      "0x000000000016A5A5ff2FA7799C4BEe89bA59B74e",
  },
};
```

## Results:

Deploys to address: `0x0000000006FD94B22fb33164322019750E854f96`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0x4eafa9747094284e595084ee7f8d128b4960db2d2880ef66b3576f584e3da0cc
- Arbitrum sepolia: https://sepolia.arbiscan.io/tx/0x7a50ace2530a8e13ba3cfc89b4593cfa03f50b54a6f659575d631d01acb1c2c5
