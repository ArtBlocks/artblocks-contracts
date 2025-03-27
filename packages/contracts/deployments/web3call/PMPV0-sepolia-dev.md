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
Deploys to address: `0x59e6F582C4671d5aBDB0F1787Fa9bEE347BB5667`

### Deployment transactions:

- sepolia dev: https://sepolia.etherscan.io/tx/0xabaa60a6d2c3a57411638739f81f46615de76a2cc933caf3806a1710b7c12c0b
