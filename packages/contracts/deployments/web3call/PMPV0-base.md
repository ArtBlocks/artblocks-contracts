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

salt: `0x00000000000000000000000000000000000000005dc61737e34615adc10a0070`
Deploys to address: `0x00000000A78E278b2d2e2935FaeBe19ee9F1FF14`

### Deployment transactions:

- base: https://basescan.org/tx/0x10f14557609490dfe974b923f38dbe2c52fb86e63b857f630e12e182addceaeb
