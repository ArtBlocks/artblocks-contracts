# Deployments: LiftHooks (mainnet)

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the LiftHooks contract.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

network: mainnet

```typescript
const inputs: T_Inputs = {
  contractName: "LiftHooks",
  args: [
    "0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a", // squiggleGenArtV0Address
    "0x9b917686DD68B68A780cB8Bf70aF46617A7b3f80", // relicContractAddress
  ],
  libraries: {},
};
```

## Results:

salt: `0x0000000000000000000000000000000000000000e1e207a8182d0995550400f8`
Deploys to address: `0x0000000abddc3c7c0de8072c47e65699e0f75bb9`

### Deployment transactions:

- mainnet: https://etherscan.io/tx/0xd849cd31ea1a50fe8520ad391cbd174078b78e174bb14e29b5cc3aa061ac943f
