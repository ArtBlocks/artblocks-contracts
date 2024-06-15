# Deployments: UniversalBytecodeStorageReader

## Description

The keyless create2 factory was used to deterministically deploy the UniversalBytecodeStorageReader, permissioned to Art Blocks owned multisignature wallet `0xbaD99DdBa319639e0e9FB2E42935BfE5b2a1B6a8`.

_Note: The contract is intentionally deployed to different addresses on different networks/environments, to securely deploy from multisig and minimize the chance of spoofing on future networks._

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "UniversalBytecodeStorageReader",
  args: [
    "0xbaD99DdBa319639e0e9FB2E42935BfE5b2a1B6a8", // owner of this factory
  ],
  libraries: {},
};
```

> note: follow-on action taken to set the active versioned reader contract.

## Results:

salt: `0xbad99ddba319639e0e9fb2e42935bfe5b2a1b6a871970b8ac50cf9b938010010`
Deployed to address: `0x00000084BB74DbD7A45fC08Dc5f7c986BbFD0a66`

### Deployment transaction:

- https://sepolia.etherscan.io/tx/
