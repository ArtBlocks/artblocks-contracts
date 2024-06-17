# Deployments: UniversalBytecodeStorageReader

## Description

The keyless create2 factory was used to deterministically deploy the UniversalBytecodeStorageReader, permissioned to Art Blocks owned multisignature wallet `0xD3bE6e30D901fa2e2Fd7f3Ebd23189f5376a4f9D`.

_Note: The contract is intentionally deployed to different addresses on different networks/environments, to securely deploy from multisig and minimize the chance of spoofing on future networks._

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "UniversalBytecodeStorageReader",
  args: [
    "0xD3bE6e30D901fa2e2Fd7f3Ebd23189f5376a4f9D", // owner of this factory
  ],
  libraries: {},
};
```

> note: follow-on action taken to set the active versioned reader contract to `0x00000000163FA16098800B2B2e4A5F96949F413b`

## Results:

salt: `0xd3be6e30d901fa2e2fd7f3ebd23189f5376a4f9d92e5f42991d7f0d4c76e00c0`
Deployed to address: `0x000000005795aA93c8E5De234Ff0DE0000C98946`

### Deployment transaction:

- https://arbiscan.io/tx/0x40ea9564ec29a323870bc437277c4e35735910e908f093f1cf9cb0c4e36154b7
