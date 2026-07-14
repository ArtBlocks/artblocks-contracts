# Deployments: EngineFactoryV0, v004 (Shape)

## Description

Permissioned CREATE2 deploy on Shape mainnet (chain ID 360). Factory owner = Shape Deployer Safe.

```typescript
// scripts/get-init-code.ts
const inputs: T_Inputs = {
  contractName: "EngineFactoryV0",
  args: [
    "0x00000000f10424506961445f935ec76579e0769F", // engine impl
    "0x000000000132CFBeC18C143aB0AaD021B1fDEA13", // flex impl
    "0x440E1B5A98332BcA7564DbffA4146f976CE75397", // core registry
    "0x279c2BEE983b73ba4035Ef5c8aD059CF2d0DB848", // Deployer Safe — factory owner
    "https://token.artblocks.io/360/",
    "0x25eFD6E38Bd12f97C997696eEE07f5d587CE1FdA", // universal bytecode storage reader
  ],
  libraries: {},
};
```

## Results

| Field | Value |
| ----- | ----- |
| Deployer (msg.sender) | `0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef` (deployer EOA) |
| Salt | `0x00df4e8d293d57718aac0b18cbfbe128c5d484ef000000000000000000000000` |
| Initcode hash | `0xe86440a386ccfee6f71eef20963d342d65c103a2a9ba70162b4a7cc8ecd0bacd` |
| Address | `0x69Ee773e7DC7386581aFAAacd345113e34238806` |
| CREATE2 factory | `0x0000000000ffe8b47b3e2130213b802212439497` |
| Verified | https://shapescan.xyz/address/0x69Ee773e7DC7386581aFAAacd345113e34238806#code |

### Deployment transaction

- https://shapescan.xyz/tx/0x1a2cc8f0e3f43a455a863d446dedb91065f2ab3ad0d309c7b4b7f53e68205e8d
