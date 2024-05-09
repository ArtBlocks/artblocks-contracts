# Deployments: BytecodeStorageV2

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the BytecodeStorageV2 contract to any network.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName:
    "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader",
  args: [],
  libraries: {},
};
```

## Results:

Deploys to address: `0x000000000016A5A5ff2FA7799C4BEe89bA59B74e`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0x5a337f7308e08c6ddb60eb9dae13526e09dcf69a777db228ea235bae8f63a75a
