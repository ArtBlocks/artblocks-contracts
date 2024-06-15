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
    "0xfeA4f2f4E45c255ceE626a1A994BB214039c2B9A", // core registry
    "0xbaD99DdBa319639e0e9FB2E42935BfE5b2a1B6a8", // owner of this factory
    "https://token.sepolia.artblocks.io/", // token uri host
    "0x00000084BB74DbD7A45fC08Dc5f7c986BbFD0a66", // universal bytecode storage reader
  ],
  libraries: {},
};
```

## Results:

salt: `0x00df4e8d293d57718aac0b18cbfbe128c5d484ef47d8471ab07c3a3a4f000040`
Deployed to address: `0x000000D8f75497A9b1e51299f35942049C86a1Bd`

### Deployment transaction:

- https://sepolia.etherscan.io/tx/
