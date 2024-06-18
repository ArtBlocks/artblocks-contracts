# Deployments: BytecodeStorageReaderContractV2

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the BytecodeStorageReaderV2 contract to any network.

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

- sepolia: https://sepolia.etherscan.io/tx/0xeb5d51a74eea34caaecfef92ee5f2275b4f88f0f0e48084490db2651bc16c010
- arbitrum: https://arbiscan.io/tx/0x6ad73c24e6bb5335b2ea2e1e797918b031b96937c5ace1fdcf7bdd25baf55949
- mainnet: https://etherscan.io/tx/0x4674b6f5788713dc47f0a320279f8207b86a1be833fa0530045097f93662ea83
