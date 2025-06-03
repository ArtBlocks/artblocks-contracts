# Deployments: PMPV0 (sepolia dev)

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the PMPV0 contract to sepolia dev.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "PMPV0",
  args: ["0x00000000000000447e69651d841bd8d104bed493"],
  libraries: {},
};
```

## Results:

salt: `0x0000000000000000000000000000000000000000000000000000000000000000`
Deploys to address: `0x62ADA51D5B4b3fc90d9B20904521e7Ef6690b189`

### Deployment transactions:

- sepolia dev: https://sepolia.etherscan.io/tx/0x090839de9156986a27a8e0abf9df82c1a363a4d4d57e73c21188376041217cfc
