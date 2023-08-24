# Minter Suite Documentation

## Overview

The Art Blocks Minter Suite is a collection of smart contracts that enable Artists using V3 core contracts to distribute tokens from their projects to collectors.

## New, Shared Minter Suite

A diagram of the new, shared minter suite is shown below. The shared minter suite is a collection of contracts that are able to be used across many Art Blocks Flagship and Engine contracts.

![minter-suite-diagram](./images/minter-suite-v2.png)

## Legacy Minter Suite

A diagram of the legacy minter suite is shown below. The legacy minter suite is a collection of contracts that may be used by a single Art Blocks Flagship or V3 Engine/Engine Flex contract.

![minter-suite-diagram](./images/minter-suite-v1.png)

## MinterFilter Suite Compatibility Chart

The following table shows which Minters and MinterFilters are compatible with different Art Blocks and Art Blocks Engine Core contracts.

| Core Contract Version                          | Minter Filter  | Recommended Minters                                                                                                                                                                       |
| :--------------------------------------------- | :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1, V1_PRTNR                                   | MinterFilterV0 | MinterSetPriceV1<br>MinterSetPriceERC20V1<br>MinterDAExpV1<br>MinterDALinV1<br>MinterMerkleV0<br>MinterHolderV0                                                                           |
| V2 (PBAB)                                      | -              | (various PBAB minters)                                                                                                                                                                    |
| V3, V3_Explorations, V3_Engine, V3_Engine_Flex | MinterFilterV1 | MinterSetPriceV4<br>MinterSetPriceERC20V4<br>MinterMerkleV5<br>MinterHolderV4<br>MinterDALinV4<br>MinterDAExpV4<br>MinterDAExpSettlementV2<br>MinterPolyptychV0\*                         |
| V3, V3_Explorations, V3_Engine, V3_Engine_Flex | MinterFilterV2 | MinterSetPriceV5<br>MinterSetPriceERC20V5<br>MinterSetPriceMerkleV5<br>MinterSetPriceHolderV4<br>MinterDALinV5<br>MinterDAExpV5<br>MinterDAExpSettlementV3<br>MinterSetPricePolyptychV5\* |

> \*only compatible with Engine/Engine Flex contracts

## Flagship

### Active Flagship Minting Contract(s)

These are the smart contracts that receive funds, and split them between the artist(s) and the platform. Artists receive funds directly from these contracts.

#### MinterSetPrice (Set Price)

- V0 (deprecated): [0x1DEC9E52f1320F7Deb29cBCd7B7d67f3dF785142](https://etherscan.io/address/0x1DEC9E52f1320F7Deb29cBCd7B7d67f3dF785142#code)
- V1: [0x934cdc04C434b8dBf3E1265F4f198D70566f7355](https://etherscan.io/address/0x934cdc04C434b8dBf3E1265F4f198D70566f7355#code)
- V2: [0x7B7917e083CeA6d9f6a3060a7330c1072fcb4e40](https://etherscan.io/address/0x7B7917e083CeA6d9f6a3060a7330c1072fcb4e40#code)
- V3: N/A, never used in prod.
- V4: [0x234B25288011081817B5cC199C3754269cCb76D2](https://etherscan.io/address/0x234B25288011081817B5cC199C3754269cCb76D2#code)
- V5: TBD, shared minter suite not yet deployed on mainnet

#### MinterSetPriceERC20 (Set Price with ERC20)

- V0 (deprecated): [0x48742D38a0809135EFd643c1150BfC13768C3907](https://etherscan.io/address/0x48742D38a0809135EFd643c1150BfC13768C3907#code)
- V1: [0x0BbB93c5d118D1dee49e96BCAdc161403f4F8612](https://etherscan.io/address/0x0BbB93c5d118D1dee49e96BCAdc161403f4F8612#code)
- V2: [0xe4c6EeF13649e9C4Ad8ae8A9C7fA9A7F26B4287a](https://etherscan.io/address/0xe4c6EeF13649e9C4Ad8ae8A9C7fA9A7F26B4287a#code)
- V3: N/A, never used in prod.
- V4: [0x9fEcd2FbC6D890fB93632DcE9b1a01c4090A7E2d](https://etherscan.io/address/0x9fEcd2FbC6D890fB93632DcE9b1a01c4090A7E2d#code)
- V5: TBD, shared minter suite not yet deployed on mainnet

#### MinterDALin (Linear Dutch Auction)

- V0 (deprecated): [0xd219f61Bb5A3ffDeCB4362610977F1dAB3930eE2](https://etherscan.io/address/0xd219f61Bb5A3ffDeCB4362610977F1dAB3930eE2#code)
- V1: [0x32710950B014c2D29EA24f480Dd02c7e4610663b](https://etherscan.io/address/0x32710950B014c2D29EA24f480Dd02c7e4610663b#code)
- V2: [0xdaa6D1e224f4B9f7c4f1368C362C4333A8e385A6](https://etherscan.io/address/0xdaa6D1e224f4B9f7c4f1368C362C4333A8e385A6#code)
- V3: N/A, never used in prod.
- V4: [0x419501DD208BFf237e3E32C40D074065e12DfF4d](https://etherscan.io/address/0x419501DD208BFf237e3E32C40D074065e12DfF4d#code)
- V5: TBD, shared minter suite not yet deployed on mainnet

#### MinterDAExp (Exponential Decay Dutch Auction)

- V0 (deprecated): [0xFc74fD0f2c7EaD04f1E5E9fd82Aef55620710D7C](https://etherscan.io/address/0xFc74fD0f2c7EaD04f1E5E9fd82Aef55620710D7C#code)
- V1: [0xD94C7060808f3c876824E57e685702f3834D2e13](https://etherscan.io/address/0xD94C7060808f3c876824E57e685702f3834D2e13#code)
- V2: [0x706d6C6ef700a3c1C3a727f0c46492492E0A72b5](https://etherscan.io/address/0x706d6C6ef700a3c1C3a727f0c46492492E0A72b5#code)
- V3: N/A, never used in prod.
- V4: [0x47e2df2723238f913741Cc6b1963e76fdfD19B94](https://etherscan.io/address/0x47e2df2723238f913741Cc6b1963e76fdfD19B94#code)
- V5: TBD, shared minter suite not yet deployed on mainnet

#### MinterDAExpSettlement (Expotential Decay Last Price Dutch Auction)

- V0: N/A, never used in prod.
- V1: [0xfdE58c821D1c226b4a45c22904de20b114EDe7E7](https://etherscan.io/address/0xfdE58c821D1c226b4a45c22904de20b114EDe7E7#code)
- V3: TBD, shared minter suite not yet deployed on mainnet

#### MinterMerkle (Address Allowlist)

- V0: N/A, never used in prod.
- V1: [0xae5A48D22Cd069c4d72dDe204A7fB4B302e614af](https://etherscan.io/address/0xae5A48D22Cd069c4d72dDe204A7fB4B302e614af)
- V2: [0x6Ff3c104Ca9b4860D27079aFfF18701c4A532A4d](https://etherscan.io/address/0x6Ff3c104Ca9b4860D27079aFfF18701c4A532A4d)
- V3: N/A, never used in prod.
- V4: N/A, never used in prod.
- V5: [0xB8Bd1D2836C466DB149f665F777928bEE267304d](https://etherscan.io/address/0xB8Bd1D2836C466DB149f665F777928bEE267304d#code)
- V5: TBD, shared minter suite not yet deployed on mainnet

#### Minter Holder (Token Holder)

- V5: TBD, shared minter suite not yet deployed on mainnet

### Other Flagship Minter Contracts

Legacy minting contract for flagship V0 core: [0x47e312d99c09ce61a866c83cbbbbed5a4b9d33e7](https://etherscan.io/address/0x47e312d99c09ce61a866c83cbbbbed5a4b9d33e7).

MinterFilterV0 for flagship V1 core: [0x4aafCE293b9B0faD169c78049A81e400f518E199](https://etherscan.io/address/0x4aafCE293b9B0faD169c78049A81e400f518E199#code).

MinterFilterV1 for flagship V3 core: [0x092B8F64e713d66b38522978BCf4649db14b931E](https://etherscan.io/address/0x092B8F64e713d66b38522978BCf4649db14b931E).

MinterFilterV2 for flagship V3 core: TBD, shared minter suite not yet deployed on mainnet

## Art Blocks Engine

### Engine Minter Contracts

For deployed Art Blocks Engine minter contracts that have not yet migrated to the new minter suite, see the minters included in each partner's deployment details in the `/deployments/engine/[V2|V3]/<engine-partner>/` directories.

We encourage our Engine partners with V3 core contracts to migrate to use the shared minter suite, which uses the same minters as the Art Blocks flagship contract. However, some partners may choose to continue to use their existing minters or custom minters outside of the shared minter suite. In that case, see the minters included in each partner's deployment details in the `/deployments/engine/[V2|V3]/<engine-partner>/` directories.
