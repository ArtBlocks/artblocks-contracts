# Deployments: UniversalBytecodeStorageReader

## Description

The keyless create2 factory was used to deterministically deploy the UniversalBytecodeStorageReader, permissioned to Art Blocks owned multisignature wallet `0x62F8fa18C079C20743F45E74925F80658c68f7b3`.

_Note: The contract is intentionally deployed to different addresses on different networks/environments, to securely deploy from multisig and minimize the chance of spoofing on future networks._

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "UniversalBytecodeStorageReader",
  args: [
    "0x62F8fa18C079C20743F45E74925F80658c68f7b3", // owner
  ],
  libraries: {},
};
```

> note: follow-on action taken to set the active versioned reader contract to `0x00000000163FA16098800B2B2e4A5F96949F413b`

## Results:

salt: `0x62f8fa18c079c20743f45e74925f80658c68f7b3d81e214bd94ab50721a1f631`
Deployed to address: `0x00000000000E85B0806ABB37B6C9d80A7100A0C5 `

### Deployment transaction:

- https://basescan.org/tx/0x3d09d8f774d6faa817cd6e97d227803fac9a19f0136ab22f0de9693f85145d5c
