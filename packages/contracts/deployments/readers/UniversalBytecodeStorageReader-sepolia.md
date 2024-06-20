# Deployments: UniversalBytecodeStorageReader

## Description

The keyless create2 factory was used to deterministically deploy the UniversalBytecodeStorageReader, permissioned to Art Blocks owned multisignature wallet `0x62DC3F6C7Bf5FA8A834E6B97dee3daB082873600`.

_Note: The contract is intentionally deployed to different addresses on different networks/environments, to securely deploy from multisig and minimize the chance of spoofing on future networks._

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "UniversalBytecodeStorageReader",
  args: [
    "0x62DC3F6C7Bf5FA8A834E6B97dee3daB082873600", // owner
  ],
  libraries: {},
};
```

> note: follow-on action taken to set the active versioned reader contract to `0x00000000163FA16098800B2B2e4A5F96949F413b`

## Results:

salt: `0x62dc3f6c7bf5fa8a834e6b97dee3dab082873600374a86fbfb8e7ed5f8010020`
Deployed to address: `0x000000069EbaecF0d656897bA5527f2145560086`

### Deployment transaction:

- https://sepolia.etherscan.io/tx/0x76588a492c2039d93090ffdd3089873393a638924c01823ba5d93bcff3fb8270
