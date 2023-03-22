# Art Blocks Smart Contracts

[![CircleCI](https://circleci.com/gh/ArtBlocks/artblocks-contracts/tree/main.svg?style=svg&circle-token=757a2689792bc9c126834396d6fa47e8f023bc2d)](https://circleci.com/gh/ArtBlocks/artblocks-contracts/tree/main)
[![GitPOAPs](https://public-api.gitpoap.io/v1/repo/ArtBlocks/artblocks-contracts/badge)](https://www.gitpoap.io/gh/ArtBlocks/artblocks-contracts)
[![Coverage Status](https://coveralls.io/repos/github/ArtBlocks/artblocks-contracts/badge.svg?branch=main)](https://coveralls.io/github/ArtBlocks/artblocks-contracts?branch=main)

A collection of smart contracts used by [Art Blocks](https://artblocks.io) for our flagship product, as well as Artblocks Engine products.

This repository is actively used and maintained by the Art Blocks team. We welcome contributions from the community. Please see our [Contributing](#contributing) section more information.

# Initial Setup

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

## Contributing & Design Guidelines

We welcome contributions from the community!

Please read through our [Style Guidelines](./GUIDELINES.md), [Solidity Gotchas](./solidity-gotchas.md), and [Testing Philosophy](./test/README.md) sections before contributing.

In addition to meeting our style guidelines, all code must pass all tests and be formatted with prettier before being merged into the main branch. To run the tests, run `yarn test`. To format the code, run `yarn format`.

# Documentation

Documentation for contracts us deployed via GitHub pages at: https://artblocks.github.io/artblocks-contracts/

Documentation for contracts may also be generated via `yarn docgen`. Most Art Blocks contracts use [NatSpec](https://docs.soliditylang.org/en/v0.8.9/natspec-format.html#documentation-example) comments to automatically enrich generated documentation. Some contracts use [dynamic expressions](https://docs.soliditylang.org/en/v0.8.9/natspec-format.html#dynamic-expressions) to improve user experience.

# Deployments

## Deploying New Contracts

> IMPORTANT - many scripts rely on typechain-generated factories, so ensure you have run `yarn generate:typechain` before running any deployment scripts.

We have two types of deployment scripts: Generic and Specific.

Generic deployment scripts are located in the `./scripts` directory. These scripts are used to deploy contracts that are not specific to a particular deployment. Generic deployment scripts are used to deploy contracts that are used by multiple partners or core contracts, such as the `Art Blocks Engine` contracts, or minters. Generic scripts take an input json file, located in the `/deployents/` directory, and execute the deployment as defined in the input file. In general, there are scripts prepared to run generic deployments for all networks and environments. For example, the following can be used to deploy the `Art Blocks Engine` contracts to the `goerli` test network (note that an input configuration is also required for all generic deployments.):

```bash
yarn deploy:dev:v3-engine
```

Specific deployments are used less frequently, and are located in the `/scripts` directory as well. These scripts are used to deploy contracts that are specific to a particular deployment. They are not easily reusable, and are generally only used once. An example to run a specific deployment is:

```bash
yarn hardhat run --network <your-network> scripts/deploy.ts
```

where `<your network>` is any network configured in `hardhat.config.js`.

For additional deployment details, see hardhat docs: [https://hardhat.org/guides/deploying.html](https://hardhat.org/guides/deploying.html)

## Deployed Contract Details

### Core Contract Versions

This is the Smart contract that controls the artwork created by the artist. No financial transactions occur on this Smart contract.

Core contracts use the versioning schema below:

|        Description        | Version  | Project Range | Mainnet Address                                                                                                                                                                                              |
| :-----------------------: | :------: | :-----------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|        AB Core V0         |    V0    |      0-2      | `0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a`                                                                                                                                                                 |
|        AB Core V1         |    V1    |     3-373     | `0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270`                                                                                                                                                                 |
|     Engine Cores (V2)     | V2_PBAB  |   All PBAB    | Various - see `deployments/engine/` directory [DEPLOYMENTS.md files](https://github.com/search?q=repo%3AArtBlocks%2Fartblocks-contracts+extension%3Amd+filename%3ADEPLOYMENTS&type=Code&ref=advsearch&l=&l=) |
| Engine Partner Cores (V2) | V2_PRTNR |   All PRTNR   | Various - see `deployments/engine/` directory [DEPLOYMENTS.md files](https://github.com/search?q=repo%3AArtBlocks%2Fartblocks-contracts+extension%3Amd+filename%3ADEPLOYMENTS&type=Code&ref=advsearch&l=&l=) |
|   AB Core V3 (current)    |    V3    |     374+      | `0x99a9B7c1116f9ceEB1652de04d5969CcE509B069`                                                                                                                                                                 |

> AB Core V3 [changelog here](./contracts/V3_CHANGELOG.md), and [performance metrics here](./contracts/V3_PERFORMANCE.md).

### Testnet Contracts

The following represents the current set of flagship core contracts deployed on the Goerli testnet, and their active Minter Filters:

- Art Blocks Artist Staging (Goerli):

  - V1 Core (deprecated): https://goerli.etherscan.io/address/0xDa62f67BE7194775A75BE91CBF9FEeDcC5776D4b
  - V3 Core: https://goerli.etherscan.io/address/0xB614C578062a62714c927CD8193F0b8Bfb90055C

- Art Blocks Dev (Goerli):
  - V1 Core (deprecated): https://goerli.etherscan.io/address/0x1Bf03F29c4FEFFFe4eE26704aaA31d85c026aCE6
  - V3 Core: https://goerli.etherscan.io/address/0xF396C180bb2f92EE28535D23F5224A5b9425ceca

## Art Blocks Engine Core Contracts

For deployed core contracts, see the deployment details in the `/deployments/engine/[V2|V3]/<engine-partner>/` directories. For V2 core contracts, archived source code is available in the `/posterity/engine/` directory.

## Minter Suite

For details on the Flagship and Engine Minter Suite, see the [minter suite documenation](./MINTER_SUITE.md).

## Shared Randomizers

- Goerli: https://goerli.etherscan.io/address/0xec5dae4b11213290b2dbe5295093f75920bd2982#code
- Ropsten: https://ropsten.etherscan.io/address/0x7ba972189ED3C527847170453fC108707F62755a#code
- Rinkeby: https://rinkeby.etherscan.io/address/0x3b30d421a6dA95694EaaE09971424F15Eb375269#code
- Kovan: https://kovan.etherscan.io/address/0x3b30d421a6dA95694EaaE09971424F15Eb375269#code
- Mainnet: https://etherscan.io/address/0x088098f7438773182b703625c4128aff85fcffc4#code

## Contract Source Code Verification

In an effort to ensure source code verification is easily completed by anyone, After 10, January 2023, all mainnet deployments should also have a corresponding tag+release in this GitHub repository. For deployments prior to this date, PR history may be used to determine the commit hash used for a given deployment. Currently, all mainnet deployments of contracts developed in this repositiory are verified on Etherscan.

# Royalty Registry

Art Blocks supports lookups of all mainnet flagship, partnership, and PBAB tokens on Manifold's [Royalty Registry](https://royaltyregistry.xyz/lookup). This enables on-chain royalty lookups for all Art Blocks NFTs, and allows for the creation of royalty streams for artists and other creators.

For core contracts V3+ (including Art Blocks Engine V3+), Art Blocks core contracts are designed to integrate directly with Manifold's [Royalty Registry](https://royaltyregistry.xyz/lookup). Aside from an artist and the platform defining royalty percentages/basis-points and addresses on the V3+ core contracts, no additional steps are required to register a token with the Royalty Registry.

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

# Source Code Archival

An NPM package is published that includes all contracts in the `/contracts/` directory. The `/contracts/archive/` directory contains contracts that were previously published, but are no longer actively developed, but should still be included in our published npm package. For example, the original Art Blocks core contracts are included in the `/contracts/archive/` directory so they may be actively integrated with subgraphs and frontends, even though they are no longer actively developed.

# References

## Running Gas Reports for Solidity Methods & Deployments

Your `.env` file should contain a `COINMARKETCAP_API_KEY` param in order to calculate ethereum gas costs. The key value can be found in the Engineering team's shared 1Password account. Additionally, you'll need to add the following object within the `module.exports` key in hardhat.config.ts:

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
  - This address received secondary market royalties from https://opensea.io until July 29th 2021. These royalties were subsequently distributed to artists directly from this address. After July 29th the secondary royalty address was changed to the current one on the first page of this doc.
- Primary Sales Minting Contracts (no longer in use) –
  - [0x091dcd914fCEB1d47423e532955d1E62d1b2dAEf](https://etherscan.io/address/0x091dcd914fCEB1d47423e532955d1E62d1b2dAEf)
  - [0x1Db80B860081AF41Bc0ceb3c877F8AcA8379F869](https://etherscan.io/address/0x1Db80B860081AF41Bc0ceb3c877F8AcA8379F869)
  - [0xAA6EBab3Bf3Ce561305bd53E4BD3B3945920B176](https://etherscan.io/address/0xAA6EBab3Bf3Ce561305bd53E4BD3B3945920B176)
  - [0x0E8BD86663e3c2418900178e96E14c51B2859957](https://etherscan.io/address/0x0E8BD86663e3c2418900178e96E14c51B2859957)
  - These are the Smart contract that received funds from primary sales and split them between the artist(s) and the platform. Artists received funds directly from this contract. These minter contracts are no longer in use.

## Other Useful References

[evm.codes](https://www.evm.codes/) - An interactive guide to EVM op-code costs.

# License

The Art Blocks `artblocks-contracts` repo is open source software licensed under the GNU Lesser General Public License v3.0. For full license text, please see our [LICENSE](https://github.com/ArtBlocks/artblocks-contracts/blob/main/LICENSE) declaration file.
