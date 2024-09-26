# Deployments: OwnedCreate2FactoryV0

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the OwnedCreate2FactoryV0 contract.

This was for the dev environment.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "OwnedCreate2FactoryV0",
  args: ["0xbaD99DdBa319639e0e9FB2E42935BfE5b2a1B6a8"], // dev admin's multisig
  libraries: {},
};
```

## Results:

Deploys to address: `0x000000099A93fdD2259Fff75DDfd76ce5B688e12`

### Deployment transactions:

- https://sepolia.etherscan.io/tx/0x1b17ab23553a02c178a6015233eda70b0786f8027e164867a23346d43cd60b84
