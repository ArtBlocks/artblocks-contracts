# Deployments: PMPV0 (base)

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the PMPV0 contract to base.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "PMPV0",
  args: ["0x00000000000000447e69651d841bd8d104bed493"],
  libraries: {},
};
```

## Results:

salt: `0x00000000000000000000000000000000000000008214b0affa812076ab2000e0`
Deploys to address: `0x000000001AC1998e4A97d207915889f2B9Ced8e2`

### Deployment transactions:

- base: https://basescan.org/tx/0x6acac721619a76844aa31c22b6df888354db642509c2e17d1b1bc943364d6087
