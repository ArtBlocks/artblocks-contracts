# Deployments: UniversalBytecodeStorageReader

## Description

The keyless create2 factory was used to deterministically deploy the UniversalBytecodeStorageReader, permissioned to Art Blocks owned multisignature wallet `0xD3bE6e30D901fa2e2Fd7f3Ebd23189f5376a4f9D`.

_Note: The contract is intentionally deployed to different addresses on different networks/environments, to securely deploy from multisig and minimize the chance of spoofing on future networks._

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "UniversalBytecodeStorageReader",
  args: [
    "0x7B42382faf5663FdE726E36976C4EDE5A546623a", // owner of this factory
  ],
  libraries: {},
};
```

> note: follow-on action taken to set the active versioned reader contract.

## Results:

salt: `0xd3be6e30d901fa2e2fd7f3ebd23189f5376a4f9dee54ba1422f144eb6b0700e0`
Deployed to address: `0x00000000be7e0ff547F64F604E7c4200D868213c`

### Deployment transaction:

- https://
