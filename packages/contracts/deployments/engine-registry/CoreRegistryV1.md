# Deployments: CoreRegistryV1 [DRAFT - DO NOT USE]

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the CoreRegistryV1 contract to any network.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "CoreRegistryV1",
  args: [],
  libraries: {},
};
```

salt: ``

## Results:

Deploys to address: `TBD`

### Deployment transactions:

- sepolia: TBD
