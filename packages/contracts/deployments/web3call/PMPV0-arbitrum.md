# Deployments: PMPV0 (arbitrum)

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the PMPV0 contract to arbitrum.

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

- arbitrum: https://arbiscan.io/tx/0xafa2cc069bc7cbab7d96709c220bfdee5125c6f603e2fff89a6554638f139165
