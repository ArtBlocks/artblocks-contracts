# Deployments: GenArt721CoreV3_Engine_Flex Implementation v3.2.3

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
    V3FlexLib: "0x0000000006FD94B22fb33164322019750E854f96",
  },
};
```

## Results:

Deploys to address: `0x0066009B13b8DfDabbE07800ee00004b008257D9`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0xfaa236661085359b86c59d9c67e644212dc2303c36a6056a9ccb68315f6f726c
- mainnet: https://etherscan.io/tx/0x7d26151967aa32bd11e06a29f8289563b0a6ca180619d9f81b58d951fda8b178
- Arbitrum sepolia: https://sepolia.arbiscan.io/tx/0x287e6a2b90c2f088628ebe5878b7d396084c822efecb06a8d6434f4c3047acf6
- Arbitrum: https://arbiscan.io/tx/0x4b7ca5ba37cc81e007e5c795165378329f6e0189c1fd4811278b8f000cb4e101
