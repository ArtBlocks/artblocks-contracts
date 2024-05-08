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

Deploys to address: `0x00000000BB846ED9fb50fF001C6cD03012fC4485`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0x89dcc5fabc2b20d7def22e1c9662745f967ff59c8016cb5f02d7b5c00699b2b8
