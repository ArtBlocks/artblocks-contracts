# Deployments: EngineFactoryV0, v003

## Description

The keyless create2 factory was used to deterministically deploy the EngineFactoryV0

_Note: The EngineFactoryV0 is intentionally deployed to different addresses on different networks/environments, due to unique constructor args._

The following were the inputs used to get initcode for deployment, via `scripts/get-init-code.ts`:

```typescript
const inputs: T_Inputs = {
  contractName: "EngineFactoryV0",
  args: [
    "0x00000000559cA3F3f1279C0ec121c302ed010457", // engine
    "0x000000008DD9A7CD3f4A267A88082d4a1E2f6553", // flex
    "0xfeA4f2f4E45c255ceE626a1A994BB214039c2B9A", // core registry
    "0xbaD99DdBa319639e0e9FB2E42935BfE5b2a1B6a8", // owner of this factory
    "https://token.dev.artblocks.io/11155111/", // token uri host + chain id
    "0x000000069EbaecF0d656897bA5527f2145560086", // universal bytecode storage reader
  ],
  libraries: {},
};
```

## Results:

salt: `0x00df4e8d293d57718aac0b18cbfbe128c5d484effdafe85c744d537db8120000`
Deployed to address: `0x0000000765f79939e1Abb63C266cE983bd5eF5c0`

### Deployment transaction:

- https://sepolia.etherscan.io/tx/0x6f89279cdbc1e0c976cce125c92f0cde7807bfe842322f29ca261b19d09e3824
