# Deployments: GenArt721CoreV3_Engine Implementation v3.2.2

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the GenArt721CoreV3_Engine implementation contract to any network.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "GenArt721CoreV3_Engine",
  args: [],
  libraries: {
    "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
      "0x000000000016A5A5ff2FA7799C4BEe89bA59B74e",
  },
};
```

## Results:

Deploys to address: `0x000000F74f006CE6480042f001c45c928D1Ae6E7`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0xe5542cfe41dbef8a403a25f49b2472857711d36d4d012df720a102cfea7600b9
- mainnet: https://etherscan.io/tx/0xc6f3f6477f6d51396b9ccdf0e3bb66b574072dc339df8024dec4eafb7283ad73
- Arbitrum sepolia: https://sepolia.arbiscan.io/tx/0x79445ef37fce698f7b80d2a5088420f8181dc4d267c0eb14ca13bf90f12cd812
- Arbitrum: https://arbiscan.io/tx/0xdb0cdfd5be994788dc960782de44e26bc8014ef7867f488cc6b0dec8453c4b75
