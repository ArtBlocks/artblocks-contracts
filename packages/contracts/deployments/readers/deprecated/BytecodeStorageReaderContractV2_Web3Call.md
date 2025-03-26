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
- arbitrum: https://arbiscan.io/tx/
- base: https://basescan.org/tx/
- mainnet: https://etherscan.io/tx/
