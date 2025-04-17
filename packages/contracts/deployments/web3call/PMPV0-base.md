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

salt: `0x0000000000000000000000000000000000000000272b21ae06bf831a5a1d0040`
Deploys to address: `0x00000000b1A9D462777c9Ef2a700476069AfF57A`

### Deployment transactions:

- base: https://basescan.org/tx/0x28a89b04e6e9ec223cf22b4990e3073df084ffb7430464f87c20ac70f3fafc60
