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

salt: `0x0000000000000000000000000000000000000000272b21ae06bf831a5a1d0040`
Deploys to address: `0x00000000b1A9D462777c9Ef2a700476069AfF57A`

### Deployment transactions:

- sepolia staging: https://sepolia.etherscan.io/tx/0x51fa880231c3a4695e5009206f20a646c09387753bb26d4aae3e5a355d1ef059
