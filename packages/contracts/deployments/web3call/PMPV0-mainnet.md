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

salt: `0x0000000000000000000000000000000000000000272b21ae06bf831a5a1d0040`
Deploys to address: `0x00000000b1A9D462777c9Ef2a700476069AfF57A`

### Deployment transactions:

- mainnet: https://etherscan.io/tx/0x9dc34c82f610a244c0032a64b3a27ac11fd547e473d39ffcd37acedbf7555bf9
