# Deployments: BytecodeStorageReaderContractV2_Web3Call

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the BytecodeStorageReaderV2_Web3Call contract to any network.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "BytecodeStorageReaderContractV2_Web3Call",
  args: [],
  libraries: {
    "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
      "0x000000000016A5A5ff2FA7799C4BEe89bA59B74e",
  },
};
```

## Results:

salt: `0x0000000000000000000000000000000000000000fd73cd4749c72a204b340088
Deploys to address: `0x000000000005e4192e8789423aEC2FA32E4D52a0`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0xb66f8f5d37c2b10aa581aa6b6be6b7cd12247449a0f4247f0e937c19d71f935d
- arbitrum: https://arbiscan.io//tx/0xe0ec1df0d3f9b09f0fc5765113eb7392a9c6f703f88d98772f9720ebbc873188
- base: https://basescan.org/tx/0x7a49781ff8bebac0ea682cd531921b88c9090dc68c922f26455efcd55bec39fe
- mainnet: https://etherscan.io/tx/0x8bf53b6fe9e09e9f483b4bcc0c7bf313e61e2e9ead915d61f1af7ed582825fce
