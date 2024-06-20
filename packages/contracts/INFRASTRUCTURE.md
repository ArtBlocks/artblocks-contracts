# Infrastructure Documentation

## Overview

Art Blocks has deployed infrastructure on different networks that support our smart contracts

## Unpermissioned deployments (all networks, latest)

The following contracts are deployed to all Art Blocks supported networks and are not permissioned. They also may be safely deployed by any wallet on any network, thanks to the use of the [keyless create2 factory system of contracts](./README.md#keyless-create2-factory).

| Contract/Library                                     | Address                                      |
| ---------------------------------------------------- | -------------------------------------------- |
| Library: BytecodeStorageV2:BytecodeStorageReader     | `0x000000000016A5A5ff2FA7799C4BEe89bA59B74e` |
| BytecodeStorageReaderContractV2                      | `0x00000000163FA16098800B2B2e4A5F96949F413b` |
| V3FlexLib (used v3.2.5 - current)                    | `0x00000000Db6f2EBe627260e411E6c973B7c48A62` |
| SplitProviderV0                                      | `0x0000000004B100B47f061968a387c82702AFe946` |
| Implementation: GenArt721CoreV3_Engine (v3.2.4)      | `0x00000000559cA3F3f1279C0ec121c302ed010457` |
| Implementation: GenArt721CoreV3_Engine_Flex (v3.2.5) | `0x000000008DD9A7CD3f4A267A88082d4a1E2f6553` |

## Permissioned deployments

The following diagrams show the deployment of permissioned infrastructure contracts on Art Blocks supported networks. These contracts are permissioned to be deployed by specific wallets and are used to deploy and index the core contracts.

_Note: these are the most recent set of deployments, and the addresses may change in the future._

### Mainnet

```mermaid
---
title: Mainnet setup
---
erDiagram
    DeployerMultisig ||--|| EngineFactory : owns
    EngineFactory ||--|| CoreRegistry : owns
    EngineFactory ||--|| UniversalBytecodeStorageReader : initializes-cores-with
    DeployerMultisig {
        addr _0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA
    }
    EngineFactory {
        addr _0x000000004058B5159ABB5a3Dd8cf775A7519E75F
    }
    CoreRegistry {
        addr _0x2eE7B9bB2E038bE7323A119701A191c030A61ec6
    }
    UniversalBytecodeStorageReader {
        addr _0x000000000000A791ABed33872C44a3D215a3743B
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
    EngineFactory ||--|| UniversalBytecodeStorageReader : initializes-cores-with
    DeployerMultisig {
        addr _0xD3bE6e30D901fa2e2Fd7f3Ebd23189f5376a4f9D
    }
    EngineFactory {
        addr _0x000000007566E6566771d28E91bD465bEE8426a5
    }
    CoreRegistry {
        addr _0x5D8EFdc20272CD3E24a27DfE7F25795a107c99a2
    }
    UniversalBytecodeStorageReader {
        addr _0x000000005795aA93c8E5De234Ff0DE0000C98946
    }
```

### Base

```mermaid
---
title: Base setup
---
erDiagram
    DeployerMultisig ||--|| EngineFactory : owns
    EngineFactory ||--|| CoreRegistry : owns
    EngineFactory ||--|| UniversalBytecodeStorageReader : initializes-cores-with
    DeployerMultisig {
        addr _base:0x62F8fa18C079C20743F45E74925F80658c68f7b3
    }
    EngineFactory {
        addr _0x00000BA55cae9d000000b156875D91854124fd7e
    }
    CoreRegistry {
        addr _0x0xe2bC24f74ed326CA4deB75753942731A566ebC83
    }
    UniversalBytecodeStorageReader {
        addr _0x00000000000E85B0806ABB37B6C9d80A7100A0C5
    }
```

### Sepolia (artist staging)

```mermaid
---
title: Sepolia (artist staging) setup
---
erDiagram
    DeployerMultisig ||--|| EngineFactory : owns
    EngineFactory ||--|| CoreRegistry : owns
    EngineFactory ||--|| UniversalBytecodeStorageReader : initializes-cores-with
    DeployerMultisig {
        addr _0x62DC3F6C7Bf5FA8A834E6B97dee3daB082873600
    }
    EngineFactory {
        addr _0x0000A9AA9b00F46c009f15b3F68122e1878D7d18
    }
    CoreRegistry {
        addr _0xdAe755c2944Ec125a0D8D5CB082c22837593441a
    }
    UniversalBytecodeStorageReader {
        addr _0x000000069EbaecF0d656897bA5527f2145560086
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
    EngineFactory ||--|| UniversalBytecodeStorageReader : initializes-cores-with
    DeployerMultisig {
        addr _0xbaD99DdBa319639e0e9FB2E42935BfE5b2a1B6a8
    }
    EngineFactory {
        addr _0x000000C969c34e95C9b9F24ea7bD597Af554a1c2
    }
    CoreRegistry {
        addr _0xfeA4f2f4E45c255ceE626a1A994BB214039c2B9A
    }
    UniversalBytecodeStorageReader {
        addr _0x000000069EbaecF0d656897bA5527f2145560086
    }
```

## Unpermissioned deployments, deprecated (all networks)

The following contracts were deployed to all Art Blocks supported networks and are not permissioned, but have been deprecated in favor of more recent versions.

They are included here for reference purposes.

| Contract/Library                                     | Address                                      |
| ---------------------------------------------------- | -------------------------------------------- |
| V3FlexLib (used v3.2.1 - v3.2.3)                     | `0x0000000006FD94B22fb33164322019750E854f96` |
| Implementation: GenArt721CoreV3_Engine (v3.2.2)      | `0x000000F74f006CE6480042f001c45c928D1Ae6E7` |
| Implementation: GenArt721CoreV3_Engine_Flex (v3.2.3) | `0x0066009B13b8DfDabbE07800ee00004b008257D9` |
| Implementation: GenArt721CoreV3_Engine (v3.2.0)      | `0x00000000AEf91971cc6251936Ec6568B23b55342` |
| Implementation: GenArt721CoreV3_Engine_Flex (v3.2.1) | `0x00000000af817dFBc2b3006E365D2eFef1953334` |

## Permissioned deployments, deprecated (all networks)

The following contracts were deployed by Art Blocks on various production networks and were permissioned, but have been deprecated in favor of more recent updates.

They are included here for reference purposes.

| Contract/Library (network:Contract)     | Address                                      |
| --------------------------------------- | -------------------------------------------- |
| mainnet:EngineFactory (v3.2.2, v3.2.3)  | `0x000000AB1a0786eE8c71516d9AbB8a36fbdDb7CB` |
| arbitrum:EngineFactory (v3.2.2, v3.2.3) | `0x000000da9D51CC51a50Dc296246075859b13ab0B` |
| mainnet:EngineFactory (v3.2.0, v3.2.1)  | `0x00000000F82E4e6D5AB22D63050FCb2bF15eE95d` |
| arbitrum:EngineFactory (v3.2.0, v3.2.1) | `0x000000bbAA3E36b60C06A92430D8956459c2Fd51` |
