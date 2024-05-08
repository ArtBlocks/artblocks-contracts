# Deployments: GenArt721CoreV3_Engine_Flex Implementation

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the GenArt721CoreV3_Engine_Flex implementation contract to any network.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "GenArt721CoreV3_Engine_Flex",
  args: [],
  libraries: {
    "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
      "0x000000000016A5A5ff2FA7799C4BEe89bA59B74e",
    V3FlexLib: "0x0000000006FD94B22fb33164322019750E854f96",
  },
};
```

## Results:

Deploys to address: `0x00000000B33F6D5cA8222c87EAc99D206A99E17E`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0xc518f505b4af8420db3804cf72409596ac1c7e0f2cf16e28ffd22a0969f5257a
