# Deployments: V3FlexLib

This deployment of V3FlexLib is used on core contracts v3.2.4 and on.

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the V3FlexLib contract to any network.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "V3FlexLib",
  args: [],
  libraries: {},
};
```

## Results:

salt: `0x0000000000000000000000000000000000000000b96a6dc40db095bb78d30098`
Deploys to address: `0x00000000Db6f2EBe627260e411E6c973B7c48A62`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/
- mainnet: https://etherscan.io/
- Arbitrum: https://arbiscan.io/
