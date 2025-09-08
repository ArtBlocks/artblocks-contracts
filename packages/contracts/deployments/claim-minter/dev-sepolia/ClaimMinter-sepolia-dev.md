# Deployments: ClaimMinter (sepolia dev)

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the ClaimMinter contract to sepolia dev.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "ClaimMinter",
  args: [
    "0x29e9f09244497503f304FA549d50eFC751D818d2",
    "0x4a6d2e4a18e194317025d7a995c705aab58d3485",
    "0x62ADA51D5B4b3fc90d9B20904521e7Ef6690b189",
    "0x410084bbEefF6f34D20e2067A453f6e673De720E",
    12,
    500,
  ],
  libraries: {},
};
```

## Results:

salt: `0x0000000000000000000000000000000000000000000000000000000000000000`
Deploys to address: `0xcfd951EcDa71F18890C9c07e76ada0079269a048`

### Deployment transactions: `0x4852fb7c612b243a90a617643f4db8b0ba6c4e674bb4de58c4d97a05a755e0eb`

- sepolia dev:
  https://sepolia.etherscan.io/address/0xcfd951EcDa71F18890C9c07e76ada0079269a048#code
