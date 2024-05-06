# Deployments: EngineFactoryV0 [DRAFT - DO NOT USE]

## Description

The keyless create2 factory was used to deterministically and permissionlessly deploy the EngineFactoryV0 contract to any network.

The EngineFactoryV0 requires that the Engine and Engine Flex implementation contracts, along with the CoreRegistryV1 are deployed first and passed to the EngineFactoryV0 constructor.

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

**CoreRegistryV1: Recorded in `deployments/engine-registry/CoreRegistryV1.md`**

Engine implementation:

```typescript
const inputs: T_Inputs = {
  contractName: "GenArt721CoreV3_Engine",
  args: [],
  libraries: {
    "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
      "0x00000000C3690146FbC2f880560a083Fad95e834",
  },
};
```

salt:

Engine Flex implementation:

```typescript
const inputs: T_Inputs = {
  contractName: "GenArt721CoreV3_Engine_Flex",
  args: [],
  libraries: {
    "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
      "0x00000000C3690146FbC2f880560a083Fad95e834",
    V3FlexLib: "0x0000000F6F896C1dA9164621a29C3d941E020efa",
  },
};
```

salt:

Engine Factory:

```typescript
const inputs: T_Inputs = {
  contractName: "EngineFactoryV0",
  args: [
    "TBD: Engine implementation address",
    "TBD: Engine Flex implementation address",
    "TBD: Core registry address",
    "TBD: Multisig address",
  ],
  libraries: {},
};
```

salt:

**After EngineFactoryV0 is deployed run the post-deployment script in `./post-deployment.ts` to finish deployment.**

## Results:

Engine Core implementation deploys to address: `TBD`

Engine Flex Core implementation deploys to address: `TBD`

EngineFactoryV0 deploys to address: `TBD`

### Deployment transactions - Sepolia:

- Engine implementation: TBD
- Engine Flex implementation: TBD
- EngineFactoryV0: TBD
