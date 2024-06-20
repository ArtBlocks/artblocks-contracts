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

- mainnet: https://etherscan.io/tx/0x0a251401dd0205d9a898f8410409e3b988e04e2b18a6e06419551a239f4559ec

- Arbitrum sepolia: https://sepolia.arbiscan.io/tx/0x123084d29987406106c0cedd5cc80db584322a577b152942882373816e8845de

- Arbitrum mainnet: https://arbiscan.io/tx/0xd85f4fcae3143ba47296cf48986e150c3499747f9d1bbc24f85f02e20d11c36c

- Base: https://basescan.org/tx/0xc54dbe3c38a6898303b9e90deac15a0c4e3bcaf14727025b350f8a696e84eaa7
