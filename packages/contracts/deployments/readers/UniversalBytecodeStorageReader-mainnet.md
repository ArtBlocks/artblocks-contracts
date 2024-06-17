# Deployments: UniversalBytecodeStorageReader

## Description

The keyless create2 factory was used to deterministically deploy the UniversalBytecodeStorageReader, permissioned to Art Blocks owned multisignature wallet `0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA`.

_Note: The contract is intentionally deployed to different addresses on different networks/environments, to securely deploy from multisig and minimize the chance of spoofing on future networks._

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "UniversalBytecodeStorageReader",
  args: [
    "0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA", // owner
  ],
  libraries: {},
};
```

> note: follow-on action taken to set the active versioned reader contract to `0x00000000163FA16098800B2B2e4A5F96949F413b`

## Results:

salt: `0x52119bb73ac8bdbe59af0eedfd4e4ee6887ed2ea216d71223b4b723688fa4a97`
Deployed to address: `0x000000000000A791ABed33872C44a3D215a3743B`

### Deployment transaction:

- https://etherscan.io/tx/0x3d57594ddfd7d5d5066df62207175e8cde0fe7e57d25858dc934e4c06f7a29a3
