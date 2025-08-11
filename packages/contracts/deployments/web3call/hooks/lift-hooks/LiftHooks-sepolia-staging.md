# Deployments: LiftHooks (sepolia staging)

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the LiftHooks contract.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

network: sepolia staging

```typescript
const inputs: T_Inputs = {
  contractName: "LiftHooks",
  args: [
    "0x7716614Ef9137Ef72b6F3704c4C496dAe34305aD", // squiggleGenArtV0Address [testnet mock]
    "0xED1249f6B1C7eE7a13DBbcA3f1777EfDca4af481", // relicContractAddress [testnet mock]
  ],
  libraries: {},
};
```

## Results:

salt: `0x0000000000000000000000000000000000000000000000000000000000000000`
Deploys to address: `0x00`

### Deployment transactions:

- sepolia staging: https://sepolia.etherscan.io/tx/0x135bc445141cd89c2a42b7818bc0eb2cf0d7a917eb705e363f5fe27870eefb4b
