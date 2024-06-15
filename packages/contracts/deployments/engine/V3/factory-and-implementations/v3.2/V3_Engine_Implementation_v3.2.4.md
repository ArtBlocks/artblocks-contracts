# Deployments: GenArt721CoreV3_Engine Implementation v3.2.4

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

salt: `0x0000000000000000000000000000000000000000d1393b85168df7e026030040`
Deploys to address: `0x00000000559cA3F3f1279C0ec121c302ed010457`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/
- mainnet: https://etherscan.io/
- Arbitrum: https://arbiscan.io/
