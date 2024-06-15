# Deployments: V3FlexLib

This deployment of V3FlexLib is used on core contracts v3.2.4 and on.

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the V3FlexLib contract to any network.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "BytecodeStorageReaderContractV2",
  args: [],
  libraries: {
    "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
      "0x000000000016A5A5ff2FA7799C4BEe89bA59B74e",
  },
};
```

## Results:

salt: `0x00000000000000000000000000000000000000002a128249c0794bf0401c0028
Deploys to address: `0x00000000163FA16098800B2B2e4A5F96949F413b`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/
- mainnet: https://etherscan.io/
- Arbitrum: https://arbiscan.io/
