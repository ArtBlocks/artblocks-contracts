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
- mainnet: https://etherscan.io/tx/0xb505921f7b90e779aa9b35b0a2ef95a83c88b62874fbd19ad493b98cece3dc17
- Arbitrum sepolia: https://sepolia.arbiscan.io/tx/0x509069fd2e603e997c9a9f619370f9e749d67e8d7646d04bd3959236bba06b0b
- Arbitrum: https://arbiscan.io/tx/0x4cbcad1be43b90368f0fdd5fde5d51826739b40321b91ab3eb0da5fb1902a205
