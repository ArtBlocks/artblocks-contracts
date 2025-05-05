# Deployments: PMPV0 (mainnet)

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the PMPV0 contract to mainnet.

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

- mainnet: https://etherscan.io/tx/0x43acde046ef28333de8ab9ad7c74e815ffe4256d8a0d606f8b57350608ef2747
