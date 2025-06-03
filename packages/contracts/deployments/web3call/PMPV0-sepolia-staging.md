# Deployments: PMPV0 (sepolia staging)

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the PMPV0 contract to sepolia staging.

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

- sepolia staging: https://sepolia.etherscan.io/tx/0x307bbd8e772c77d442bed60d2e6560b4de9d539e2a35f418d7f9a6ffd985c566
