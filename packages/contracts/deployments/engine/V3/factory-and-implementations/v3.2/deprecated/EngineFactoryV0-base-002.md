# Deployments: EngineFactoryV0

## Description

The keyless create2 factory was used to deterministically deploy the EngineFactoryV0, permissioned to deployer wallet 0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef.

_Note: The EngineFactoryV0 is intentionally deployed to different addresses on different networks/environments, due to unique constructor args._

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "EngineFactoryV0",
  args: [
    "0x00000000559cA3F3f1279C0ec121c302ed010457", // engine
    "0x000000008DD9A7CD3f4A267A88082d4a1E2f6553", // flex
    "0xe2bC24f74ed326CA4deB75753942731A566ebC83", // core registry
    "0x62F8fa18C079C20743F45E74925F80658c68f7b3", // owner of this factory
    "https://token.base.artblocks.io/", // token uri host
    "0x00000000000E85B0806ABB37B6C9d80A7100A0C5", // universal bytecode storage reader
  ],
  libraries: {},
};
```

## Results:

salt: `0x00df4e8d293d57718aac0b18cbfbe128c5d484ef2ac180c78e2740254f110000`
Deployed to address: `0x00000BA55cae9d000000b156875D91854124fd7e`

### Deployment transaction:

- https://basescan.org/tx/0x73edeeac901b5bcde8753bcf92da14fabdc80d19a9cef97685248f1c8fa09b72
