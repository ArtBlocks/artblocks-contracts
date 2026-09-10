# Deployments: GenArt721CoreV3_Engine_Flex Implementation v3.2.10

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
    V3FlexLib: "0x00000000Db6f2EBe627260e411E6c973B7c48A62",
  },
};
```

## Results:

salt: `0x00df4e8d293d57718aac0b18cbfbe128c5d484ef7a478182561e84f05622000e`
Deploys to address: `0x000000000132CFBeC18C143aB0AaD021B1fDEA13`

### Deployment transactions:

- sepolia: https://sepolia.etherscan.io/tx/0xa9fe25c2d1aa2772095953d12b96b388cb9019e34cec1f05db3d60cfaef37fc1
- arbitrum: https://arbiscan.io//tx/0xf93fc34593e35347213f03637264da7c3395f283a9ad1fa39c5b2dd74fcab994
- base: https://basescan.org/tx/0x5dfd81b964d4196c40c8200487621e8ac06a1145cb14b12b6199aefeeff5ce1d
- mainnet: https://etherscan.io/tx/0x5d26ef340f4c30ff86aece429fe7fba7a4fa0bdcbf6f690655cdee0d26b59a31
