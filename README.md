# Art Blocks Smart Contracts

[![CircleCI](https://circleci.com/gh/ArtBlocks/artblocks-contracts/tree/main.svg?style=svg&circle-token=757a2689792bc9c126834396d6fa47e8f023bc2d)](https://circleci.com/gh/ArtBlocks/artblocks-contracts/tree/main)

[![Coverage Status](https://coveralls.io/repos/github/ArtBlocks/artblocks-contracts/badge.svg?branch=main)](https://coveralls.io/github/ArtBlocks/artblocks-contracts?branch=main)

## License

The Art Blocks `artblocks-contracts` repo is open source software licensed under the GNU Lesser General Public License v3.0. For full license text, please see our [LICENSE](https://github.com/ArtBlocks/artblocks-contracts/blob/main/LICENSE) declaration file.

## Initial Setup

### install packages

`yarn`

### set up your environment

Create a `.env` file by duplicating `.env.example` and populating all variables.

### compile

`yarn compile`

### generate typescript contract bindings

`yarn generate:typechain`

### run the tests

`yarn test`

### generate coverage report

`yarn coverage`

### generate docs

`yarn docgen`

(docs for `main` are served at https://artblocks.github.io/artblocks-contracts/#/)

### format your source code

`yarn format`

## Deployments

Deployment script templates are located in the `./scripts` directory. To run a deployment script `deploy.ts`:

> IMPORTANT - many scripts rely on typechain-generated factories, so ensure you have run `yarn generate:typechain` before running any deployment scripts.

```
yarn hardhat run --network <your-network> scripts/deploy.ts
```

where `<your network>` is any network configured in `hardhat.config.js`.
For additional deployment details, see hardhat docs: [https://hardhat.org/guides/deploying.html](https://hardhat.org/guides/deploying.html)

## Deployed Contract Details

### Core Contract Versions

This is the Smart contract that controls the artwork created by the artist. No financial transactions occur on this Smart contract.

Core contracts use the versioning schema below:

|     Description      | Version  | Project Range | Mainnet Address                                                                                                                                                                                     |
| :------------------: | :------: | :-----------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|      AB Core V0      |    V0    |      0-2      | `0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a`                                                                                                                                                        |
|      AB Core V1      |    V1    |     3-373     | `0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270`                                                                                                                                                        |
|      PBAB Cores      | V2_PBAB  |   All PBAB    | Various - see PBAB+Collabs directory [DEPLOYMENTS.md files](https://github.com/search?q=repo%3AArtBlocks%2Fartblocks-contracts+extension%3Amd+filename%3ADEPLOYMENTS&type=Code&ref=advsearch&l=&l=) |
|     PRTNR Cores      | V2_PRTNR |   All PRTNR   | Various - see PBAB+Collabs directory [DEPLOYMENTS.md files](https://github.com/search?q=repo%3AArtBlocks%2Fartblocks-contracts+extension%3Amd+filename%3ADEPLOYMENTS&type=Code&ref=advsearch&l=&l=) |
| AB Core V3 (current) |    V3    |     374+      | `0x99a9B7c1116f9ceEB1652de04d5969CcE509B069`                                                                                                                                                        |

> AB Core V3 [changelog here](./contracts/V3_CHANGELOG.md), and [performance metrics here](./contracts/V3_Performance.md).

### MinterFilter Suite Compatibility Chart

The following table shows which Minters and MinterFilters are compatible with which Core contracts.

- **Note:** while the whole end-to-end MinterFilter+FilteredMinter architecture is likely not the ideal fit for PBAB partners due to the infrastructure complexity required for partners integrating with it, any of the individual minters from within the minter suite can readily be adapted to work with PBAB core contracts–if you are a PBAB partner and there is a minter in the suite that this would be appealing for, please contact your account manager!

| Core Contract Version(s) | Minter Filter  | Recommended Minters                                                                                                                                 | Deprecated Minters                                                          |
| ------------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| V0                       | -              | (legacy minter)                                                                                                                                     | -                                                                           |
| V1, V1_PRTNR             | MinterFilterV0 | MinterSetPriceV1<br>MinterSetPriceERC20V1<br>MinterDAExpV1<br>MinterDALinV1<br>MinterMerkleV0<br>MinterHolderV0                                     | MinterSetPriceV0<br>MinterSetPriceERC20V0<br>MinterDAExpV0<br>MinterDALinV0 |
| V2 (PBAB)                | -              | (various PBAB minters)                                                                                                                              | -                                                                           |
| V3, V3_Explorations      | MinterFilterV1 | MinterSetPriceV2<br>MinterSetPriceERC20V2<br>MinterDAExpV2<br>MinterDALinV2<br>MinterMerkleV2<br>MinterMerkleV3<br>MinterHolderV1<br>MinterHolderV2 | -                                                                           |

### Active Minting Contract(s)

These are the smart contracts that receive funds, and split them between the artist(s) and the platform. Artists receive funds directly from these contracts.

#### MinterSetPrice (Set Price)

- V0 (deprecated): [0x1DEC9E52f1320F7Deb29cBCd7B7d67f3dF785142](https://etherscan.io/address/0x1DEC9E52f1320F7Deb29cBCd7B7d67f3dF785142#code)
- V1: [0x934cdc04C434b8dBf3E1265F4f198D70566f7355](https://etherscan.io/address/0x934cdc04C434b8dBf3E1265F4f198D70566f7355#code)
- V2: [0x7B7917e083CeA6d9f6a3060a7330c1072fcb4e40](https://etherscan.io/address/0x7B7917e083CeA6d9f6a3060a7330c1072fcb4e40#code)

#### MinterSetPriceERC20 (Set Price with ERC20)

- V0 (deprecated): [0x48742D38a0809135EFd643c1150BfC13768C3907](https://etherscan.io/address/0x48742D38a0809135EFd643c1150BfC13768C3907#code)
- V1: [0x0BbB93c5d118D1dee49e96BCAdc161403f4F8612](https://etherscan.io/address/0x0BbB93c5d118D1dee49e96BCAdc161403f4F8612#code)
- V2: [0xe4c6EeF13649e9C4Ad8ae8A9C7fA9A7F26B4287a](https://etherscan.io/address/0xe4c6EeF13649e9C4Ad8ae8A9C7fA9A7F26B4287a#code)

#### MinterDALin (Linear Dutch Auction)

- V0 (deprecated): [0xd219f61Bb5A3ffDeCB4362610977F1dAB3930eE2](https://etherscan.io/address/0xd219f61Bb5A3ffDeCB4362610977F1dAB3930eE2#code)
- V1: [0x32710950B014c2D29EA24f480Dd02c7e4610663b](https://etherscan.io/address/0x32710950B014c2D29EA24f480Dd02c7e4610663b#code)
- V2: [0xdaa6D1e224f4B9f7c4f1368C362C4333A8e385A6](https://etherscan.io/address/0xdaa6D1e224f4B9f7c4f1368C362C4333A8e385A6#code)

#### MinterDAExp (Exponential Decay Dutch Auction)

- V0 (deprecated): [0xFc74fD0f2c7EaD04f1E5E9fd82Aef55620710D7C](https://etherscan.io/address/0xFc74fD0f2c7EaD04f1E5E9fd82Aef55620710D7C#code)
- V1: [0xD94C7060808f3c876824E57e685702f3834D2e13](https://etherscan.io/address/0xD94C7060808f3c876824E57e685702f3834D2e13#code)
- V2: [0x706d6C6ef700a3c1C3a727f0c46492492E0A72b5](https://etherscan.io/address/0x706d6C6ef700a3c1C3a727f0c46492492E0A72b5#code)

#### MinterMerkle (Address Allowlist)

- V1: [0xae5A48D22Cd069c4d72dDe204A7fB4B302e614af](https://etherscan.io/address/0xae5A48D22Cd069c4d72dDe204A7fB4B302e614af)
- V2: [0x6Ff3c104Ca9b4860D27079aFfF18701c4A532A4d](https://etherscan.io/address/0x6Ff3c104Ca9b4860D27079aFfF18701c4A532A4d)

#### Minter Holder (Token Holder)

- V1: [0xa198E22C32879f4214a37eB3051525bD9aff9145](https://etherscan.io/address/0xa198E22C32879f4214a37eB3051525bD9aff9145)

### Other Minter Contracts

MinterFilterV0 for flagship V1 core: [0x4aafCE293b9B0faD169c78049A81e400f518E199](https://etherscan.io/address/0x4aafCE293b9B0faD169c78049A81e400f518E199#code).

MinterFilterV1 for flagship V3 core: [0x092B8F64e713d66b38522978BCf4649db14b931E](https://etherscan.io/address/0x092B8F64e713d66b38522978BCf4649db14b931E).

Legacy minting contract for flagship V0 core: [0x47e312d99c09ce61a866c83cbbbbed5a4b9d33e7](https://etherscan.io/address/0x47e312d99c09ce61a866c83cbbbbed5a4b9d33e7).

For deployed Engine/Partner/Explorations minting contracts, see PBAB directory [DEPLOYMENTS.md files](https://github.com/search?q=repo%3AArtBlocks%2Fartblocks-contracts+extension%3Amd+filename%3Adeployments&type=Code&ref=advsearch&l=&l=).

### Shared Randomizers

- Goerli: https://goerli.etherscan.io/address/0xec5dae4b11213290b2dbe5295093f75920bd2982#code
- Ropsten: https://ropsten.etherscan.io/address/0x7ba972189ED3C527847170453fC108707F62755a#code
- Rinkeby: https://rinkeby.etherscan.io/address/0x3b30d421a6dA95694EaaE09971424F15Eb375269#code
- Kovan: https://kovan.etherscan.io/address/0x3b30d421a6dA95694EaaE09971424F15Eb375269#code
- Mainnet: https://etherscan.io/address/0x088098f7438773182b703625c4128aff85fcffc4#code

### Testnet Contracts

The following represent the current set of flagship core contracts deployed on the Goerli testnet, and their active Minter Filters:

- Art Blocks Artist Staging (Goerli):

  - V1 Core (deprecated): https://goerli.etherscan.io/address/0xDa62f67BE7194775A75BE91CBF9FEeDcC5776D4b
  - V3 Core: https://goerli.etherscan.io/address/0xB614C578062a62714c927CD8193F0b8Bfb90055C

- Art Blocks Dev (Goerli):
  - V1 Core (deprecated): https://goerli.etherscan.io/address/0x1Bf03F29c4FEFFFe4eE26704aaA31d85c026aCE6
  - V3 Core: https://goerli.etherscan.io/address/0xF396C180bb2f92EE28535D23F5224A5b9425ceca

> For deployed PBAB/PRTNR core contracts, see PBAB+Collabs directory DEPLOYMENTS.md files.

## Contract Documentation

Documentation for contracts us deployed via GitHub pages at: https://artblocks.github.io/artblocks-contracts/

Documentation for contracts may also be generated via `yarn docgen`. Most Art Blocks contracts use [NatSpec](https://docs.soliditylang.org/en/v0.8.9/natspec-format.html#documentation-example) comments to automatically enrich generated documentation. Some contracts use [dynamic expressions](https://docs.soliditylang.org/en/v0.8.9/natspec-format.html#dynamic-expressions) to improve user experience.

## Royalty Registry

Art Blocks supports lookups of all mainnet flagship, partnership, and PBAB tokens on Manifold's [Royalty Registry](https://royaltyregistry.xyz/lookup). This enables on-chain royalty lookups for all Art Blocks NFTs, and allows for the creation of royalty streams for artists and other creators.

For core contracts V3+, Art Blocks core contracts are designed to integrate directly with Manifold's [Royalty Registry](https://royaltyregistry.xyz/lookup). Aside from an artist and the platform defining royalty percentages/basis-points and addresses on the V3+ core contracts, no additional steps are required to register a token with the Royalty Registry.

Prior to the V3 core contract, royalty registry override contracts are needed to properly integrate with the Royalty Registry. These contracts delegate all permissions to the core contracts. The following Royalty Registry override contracts are deployed at:

- **mainnet (AB deployed):**

  - AB Flagship + Partner (PRTNR) royalty override: https://etherscan.io/address/0x7b5369c24a47a72ecf932bf6974f506dde4d5eb1#code
  - PBAB royalty override: https://etherscan.io/address/0x31e1cc72e6f9e27c2ecbb500d978de1691173f5f#code

- **mainnet (RR deployed):**
  - RoyaltyRegistry: https://etherscan.io/address/0xad2184fb5dbcfc05d8f056542fb25b04fa32a95d#code
  - RoyaltyEngineV1: https://etherscan.io/address/0x0385603ab55642cb4dd5de3ae9e306809991804f#code

### Configuring PBAB Royalty Override (REQUIRED)

Upon deploying a PBAB contract, the following steps must be taken:

> Tasks denoted by (scripted) are included in `scripts/1_reference_pbab_suite_deployer.ts`, and scripted for newly deployed PBAB projects as of 03/2022.

- **(scripted), REQUIRED** Set the royalty lookup address on the royalty registry for the newly deployed contract
  - Go to the [Royalty Registry](https://royaltyregistry.xyz/lookup) and call the following function on the Royalty Registry smart contract:
    - `setRoyaltyLookupAddress(<new_PBAB_coreAddr>, <PBAB_royaltyOverrideContract>)`
- **(scripted), REQUIRED** Set Platform royalty payment address for the new core contract in PBAB royalty override contract
  > note: This step is optional in the PBAB deployer script in case platform royalty payment address is not known at time of deployment, but must be completed before royalty lookups will work
  - `admin` of the PBAB core contract must call the following function on the PBAB royalty override contract:
    - `updatePlatformRoyaltyAddressForContract(<new_PBAB_coreAddr>, <platformRoyaltyPaymentAddress>)`

Additionally, the following settings may be configured/changed by a PBAB core contract's `admin` at any time:

- **Change Royalty Percentages**
  - `renderProvider` or `platform` Royalty [BPS](https://www.investopedia.com/terms/b/basispoint.asp) may be changed from default values of 2.5% to any value. This can be configured by a PBAB core contract's `admin` via the PBAB override contract's functions `updateRenderProviderBpsForContract` and `updatePlatformBpsForContract`.
- **Change Platform Royalty Payment Address**
  - The address to receive platform royalty payments may be updated by a PBAB core contract's admin via the PBAB override contract's function `updatePlatformRoyaltyAddressForContract`.
- **Change Render Provider Royalty Payment Address**
  - The address to receive render provider royalty payments is delegated to the token core contract, and defined as the public variable `renderProviderAddress`.

### Configuring Art Blocks Flagship **OR** Partner (PRTNR) Royalty Override (REQUIRED)

Upon deploying a new Art Blocks flagship core contract or Partner (PRTNR) core contract, the following steps must be taken (NOT scripted):

- **REQUIRED** Set the royalty lookup address on the royalty registry for the newly deployed contract
  - Go to the [Royalty Registry](https://royaltyregistry.xyz/lookup) to call the following function on the Royalty Registry smart contract:
    - `setRoyaltyLookupAddress(<new_coreAddr>, <ArtBlocks_royaltyOverrideContract>)`
- **REQUIRED** Set Art Blocks royalty payment address for the new core contract in the royalty override contract
  - `admin` of core contract must call:
    - `updateArtblocksRoyaltyAddressForContract(<new_coreAddr>, <ArtBlocksRoyaltyPaymentAddress>)`

Additionally, the following settings may be configured/changed by a core contract's `admin` at any time:

- **Change Art Blocks Royalty Percentage**
  - Royalty [BPS](https://www.investopedia.com/terms/b/basispoint.asp) may be changed from default values of 2.5% to any value less than or equal to the default (cannot be increased above default). This can be configured by a core contract's `admin` via the override contract's function `updateArtblocksBpsForContract`.
- **Change Art Blocks Royalty Payment Address**
  - The address to receive Art Blocks royalty payments may be updated by a core contract's admin via the royalty override contract's function `updateArtblocksRoyaltyAddressForContract`.

## Running Gas Reports for Solidity Methods & Deployments

Your `.env` file should contain a `COINMARKETCAP_API_KEY` param in order to calculate ethereum gas costs. The key value can be found in the Engineering team's shared 1Password acccount. Additionally, you'll need to add the following object within the `module.exports` key in hardhat.config.ts:

```
  gasReporter: {
    currency: "USD",
    gasPrice: 100,
    enabled: true,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY
  }
```

After this config is finished, you'll notice a `usd (avg)` column in the auto-generated table that's printed when you run unit tests with `yarn test`.
(note: gasPrice is a variable param that reflects the gwei/gas cost of a tx)

## Old contracts/addresses:

- **Primary Sales and Minting Contract (no longer in use) [0x059edd72cd353df5106d2b9cc5ab83a52287ac3a](https://etherscan.io/address/0x059edd72cd353df5106d2b9cc5ab83a52287ac3a)**
  - This is the original Art Blocks smart contract which had a built in minter. This contract represents only projects 0 (Chromie Squiggle), 1 (Genesis), 2 (Construction Token) and handled both control of the NFTs and the purchase transactions. This smart contract received funds and automatically split them between the artist and the platform.
- Secondary Sales Receiving and Sending Address (no longer in use) [0x8e9398907d036e904fff116132ff2be459592277](https://etherscan.io/address/0x8e9398907d036e904fff116132ff2be459592277)
  - This address received secondary market royalties from https://opensea.io until July 29th 2021. These royalties were subsequently distributed to artists directly from this address. After July 29th the secondary royalty address was changes to the current one on the first page of this doc.
- Primary Sales Minting Contracts (no longer in use) –
  - [0x091dcd914fCEB1d47423e532955d1E62d1b2dAEf](https://etherscan.io/address/0x091dcd914fCEB1d47423e532955d1E62d1b2dAEf)
  - [0x1Db80B860081AF41Bc0ceb3c877F8AcA8379F869](https://etherscan.io/address/0x1Db80B860081AF41Bc0ceb3c877F8AcA8379F869)
  - [0xAA6EBab3Bf3Ce561305bd53E4BD3B3945920B176](https://etherscan.io/address/0xAA6EBab3Bf3Ce561305bd53E4BD3B3945920B176)
  - [0x0E8BD86663e3c2418900178e96E14c51B2859957](https://etherscan.io/address/0x0E8BD86663e3c2418900178e96E14c51B2859957)
  - These are the Smart contract that received funds from primary sales and split them between the artist(s) and the platform. Artists received funds directly from this contract.These minter contracts are no longer in use.

## Contributing

All code must pass all tests and be formatted with prettier before being merged into the main branch. To run the tests, run `yarn test`. To format the code, run `yarn format`. For additional information about our testing philosophy at Art Blocks, please see our [Testing Philosophy](./test/README.md) document.

## Useful References

[evm.codes](https://www.evm.codes/) - An interactive guide to EVM op-code costs.
