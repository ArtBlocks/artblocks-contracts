# Deployments: GenArt721CoreV3_Engine_Flex Implementation v3.3.1

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the GenArt721CoreV3_Engine_Flex implementation contract to any network.

Adds per-project transfer hooks. Cloned by EngineFactoryV0 v005.

`V3FlexLib` is the existing v3.2-era deployment, reused deliberately: its source is unchanged in v3.3, and compiling it at the commit that deployed it and at the v3.3 commit produces runtime bytecode identical for all 6,136 executable bytes — the two differ only inside the trailing CBOR metadata.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "GenArt721CoreV3_Engine_Flex",
  args: [],
  libraries: {
    "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
      "0x000000000016A5A5ff2FA7799C4BEe89bA59B74e",
    V3EngineLib: "0x000000001d81F6Ed8c3646293bD485Cef06416db",
    V3TransferHookLib: "0x0000000020458d4C18397517bA13E43B54Baa56C",
    V3FlexLib: "0x00000000Db6f2EBe627260e411E6c973B7c48A62",
  },
};
```

## Results:

salt: `0x0000000000000000000000000000000000000000620e2b0a53b438d8ea200040`
Deploys to address: `0x00000000824067A9E7fcB6CB084eCcd8f3Cb8399`

### Deployment transactions:

- arbitrum: https://arbiscan.io/tx/0xda0cbeec3ad911c677c36b17407c1f590f22ed38c76d229fbf1d73298a8144b6
- base: https://basescan.org/tx/0xc83d15f67697b32205cc3d1dbaf08916d336ebcab3298c74ff91012cbc3ad835
- sepolia: https://sepolia.etherscan.io/tx/0x0e47b70be9b6bf805e968dedfce323181dea1273f79fd781f24af22c41de8ccd
- mainnet: https://etherscan.io/tx/0xb4009001b65b873c73a7610d897b5e3f365a7f0e02c1f299741ad8926b10964d
- shape: https://shapescan.xyz/tx/0xdef280ecfe982e804a22f7d2949fae3222a7031bd293b0aa6b247a17691c1994
