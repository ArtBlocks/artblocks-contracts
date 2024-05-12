# Infrastructure Documentation

## Overview

Art Blocks has deployed infrastructure on different networks that support our smart contracts

## Unpermissioned deployments (all networks)

The following contracts are deployed to all Art Blocks supported networks and are not permissioned. They also may be safely deployed by any wallet on any network, thanks to the use of the [keyless create2 factory system of contracts](./README.md#keyless-create2-factory).

Below is a table of the shared minter filter contracts that are deployed on mainnet and testnets. Note that each of these contracts has a function available to enumerate all globally approved minter contracts, `getAllGloballyApprovedMinters()`

| Contract/Library                                     | Address                                      |
| ---------------------------------------------------- | -------------------------------------------- |
| BytecodeStorageV2:BytecodeStorageReader              | `0x000000000016A5A5ff2FA7799C4BEe89bA59B74e` |
| V3FlexLib                                            | `0x0000000006FD94B22fb33164322019750E854f96` |
| SplitProviderV0                                      | `0x0000000004B100B47f061968a387c82702AFe946` |
| Implementation: GenArt721CoreV3_Engine (v3.2.0)      | `0x00000000AEf91971cc6251936Ec6568B23b55342` |
| Implementation: GenArt721CoreV3_Engine_Flex (v3.2.1) | `0x00000000af817dFBc2b3006E365D2eFef1953334` |

## Permissioned deployments

The following diagrams show the deployment of permissioned core-contract-related contracts on Art Blocks supported networks. These contracts are permissioned to be deployed by specific wallets and are used to deploy and index the core contracts.

_Note: these are the most recent set of deployments, and the addresses may change in the future._

### Mainnet

```mermaid
---
title: Mainnet setup
---
erDiagram
    DeployerMultisig ||--|| EngineFactory : owns
    EngineFactory ||--|| CoreRegistry : owns
    DeployerMultisig {
        addr _0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA
    }
    EngineFactory {
        addr _0x00000000F82E4e6D5AB22D63050FCb2bF15eE95d
    }
    CoreRegistry {
        addr _0x2eE7B9bB2E038bE7323A119701A191c030A61ec6
    }
```

### Arbitrum

```mermaid
---
title: Arbitrum setup
---
erDiagram
    DeployerMultisig ||--|| EngineFactory : owns
    EngineFactory ||--|| CoreRegistry : owns
    DeployerMultisig {
        addr _0xD3bE6e30D901fa2e2Fd7f3Ebd23189f5376a4f9D
    }
    EngineFactory {
        addr _0x000000bbAA3E36b60C06A92430D8956459c2Fd51
    }
    CoreRegistry {
        addr _0x5D8EFdc20272CD3E24a27DfE7F25795a107c99a2
    }
```

### Sepolia (artist staging)

```mermaid
---
title: Sepolia (artist staging) setup
---
erDiagram
    DeployerEOA ||--|| EngineFactory : owns
    EngineFactory ||--|| CoreRegistry : owns
    DeployerEOA {
        addr _0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef
    }
    EngineFactory {
        addr _0x000088739C60a490FeE1E20007b61DC500265626
    }
    CoreRegistry {
        addr _0xdAe755c2944Ec125a0D8D5CB082c22837593441a
    }
```

### Arbitrum-Sepolia

```mermaid
---
title: arbitrum-sepolia setup
---
erDiagram
    DeployerEOA ||--|| EngineFactory : owns
    EngineFactory ||--|| CoreRegistry : owns
    DeployerEOA {
        addr _0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef
    }
    EngineFactory {
        addr _0x000000FF72D2bf6A83a21452aD5f80906472AF55
    }
    CoreRegistry {
        addr _0xdAe755c2944Ec125a0D8D5CB082c22837593441a
    }
```

### Sepolia (dev)

```mermaid
---
title: Sepolia (dev) setup
---
erDiagram
    DeployerMultisig ||--|| EngineFactory : owns
    EngineFactory ||--|| CoreRegistry : owns
    DeployerMultisig {
        addr _0xbaD99DdBa319639e0e9FB2E42935BfE5b2a1B6a8
    }
    EngineFactory {
        addr _0x0000B005007298838aCF6589d4342920A9cB002a
    }
    CoreRegistry {
        addr _0xfeA4f2f4E45c255ceE626a1A994BB214039c2B9A
    }
```
