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

salt: `0x000000000000000000000000000000000000000014b73856439f10a45d0d00a0`

## Results:

Deploys to address: `0x00000000C3690146FbC2f880560a083Fad95e834`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0x0e991b125e350022c63d5b1fc5fb53f394f8bb755a2b1701e89ca279be4fec25
