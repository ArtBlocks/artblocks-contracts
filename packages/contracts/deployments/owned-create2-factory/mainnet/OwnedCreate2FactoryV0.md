# Deployments: OwnedCreate2FactoryV0

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the OwnedCreate2FactoryV0 contract.

This was for mainnet environment.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "OwnedCreate2FactoryV0",
  args: ["0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA"], // admin's deployer multisig
  libraries: {},
};
```

## Results:

Deploys to address: `0x000000AB6881DbbBD231dB99D69134FEA2385Bf8`

### Deployment transactions:

- etherscan_tbd
