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

- sepolia: https://sepolia.etherscan.io/tx/0xd92ad866254d2a79ce62f842367c73e2697ce58e82a6d8b1784634ff21bc65df
- arbitrum: https://arbiscan.io/tx/0x530d1a0aa4a00a4defad3d7aaab0a143cb55ef7145c8db68dd7a0d2cecd1c39e
- mainnet: https://etherscan.io/tx/0x64a64ce425e8d61bb627daffd791b60de275d46d0d9457716eb6f80e7244f135
