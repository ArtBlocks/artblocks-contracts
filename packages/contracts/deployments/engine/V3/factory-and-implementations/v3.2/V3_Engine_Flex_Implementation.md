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

Deploys to address: `0x00000000af817dFBc2b3006E365D2eFef1953334`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0xc37a5127dabb042f425268abf444b5594f8ec4b5d5f2f802f88747a015782da0
- Arbitrum sepolia: https://sepolia.arbiscan.io/tx/0x37cbaaf10a2fccee5871b2b757270ed9d0a710bedc207ceb72397adb1a9955a5
- Arbitrum: https://arbiscan.io/tx/0xab6a3089d758b6196cfd68b6ca88cbf3392004d6cd14b16cfde0cf65e12a3f85
