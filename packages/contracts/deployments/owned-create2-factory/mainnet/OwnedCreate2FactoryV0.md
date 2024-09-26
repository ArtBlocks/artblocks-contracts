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

- https://etherscan.io/tx/0x5157bf60406f10bfdbf381e5c1873319393657b9ed2fc4df8384df258e68ec13
