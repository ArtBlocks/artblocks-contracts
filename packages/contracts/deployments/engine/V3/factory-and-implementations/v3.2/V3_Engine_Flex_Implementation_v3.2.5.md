# Deployments: GenArt721CoreV3_Engine_Flex Implementation v3.2.5

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the GenArt721CoreV3_Engine_Flex implementation contract to any network.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "GenArt721CoreV3_Engine_Flex",
  args: [],
  libraries: {
    "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
      "0x000000000016A5A5ff2FA7799C4BEe89bA59B74e",
    V3FlexLib: "0x00000000Db6f2EBe627260e411E6c973B7c48A62",
  },
};
```

## Results:

salt: `0x0000000000000000000000000000000000000000dd2c761f2bc8be2f6c2300d0`
Deploys to address: `0x000000008DD9A7CD3f4A267A88082d4a1E2f6553`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/
- mainnet: https://etherscan.io/tx/
- Arbitrum: https://arbiscan.io/tx/
