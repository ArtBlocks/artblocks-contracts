# Art Blocks Smart Contracts

[![CircleCI](https://circleci.com/gh/ArtBlocks/artblocks-contracts/tree/main.svg?style=svg&circle-token=757a2689792bc9c126834396d6fa47e8f023bc2d)](https://circleci.com/gh/ArtBlocks/artblocks-contracts/tree/main)

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

### format your source code
`yarn format`

## Deployments
Deployment script templates are located in the `./scripts` directory. To run a deployment script `deploy.ts`:
```
yarn hardhat run --network <your-network> scripts/deploy.ts
```
where `<your network>` is any network configured in `hardhat.config.js`.
For additional deployment details, see hardhat docs: [https://hardhat.org/guides/deploying.html](https://hardhat.org/guides/deploying.html)

## Documentation
Documenation for contracts may be generated via `yarn docgen`. Some Art Blocks contracts use [NatSpec](https://docs.soliditylang.org/en/v0.8.9/natspec-format.html#documentation-example) comments to automatically enrich generated documentation. Some contracts use [dynamic expressions](https://docs.soliditylang.org/en/v0.8.9/natspec-format.html#dynamic-expressions) to improve user experience.

## Royalty Registry Overrides
Art Blocks supports lookups of all mainnet flagship and PBAB tokens on the [Royalty Registry](https://royaltyregistry.xyz/lookup).[^1]

Two royalty override contracts are [to be[^1]] deployed for all flagship and PBAB GenArt721Core contracts.
These contracts delegate all permissions to the core contracts, but require some configuring for newly deployed token contracts.

### Configuring PBAB Royalty Override 
Upon deploying a PBAB contract, the following steps must be taken:
>Tasks denoted by (scripted) are included in `scripts/1_reference_pbab_suite_deployer.ts`[^1]

- **(scripted), Required** Set the royalty lookup address on the royalty registry for the newly deployed contract
  - Go to the [Royalty Registry](https://royaltyregistry.xyz/lookup) and call the following function on the Royalty Registry smart contract:
    - `setRoyaltyLookupAddress(<new_PBAB_coreAddr>, <PBAB_royaltyOverrideContract>)`
    >note: `PBAB_royaltyOverrideContract` will be known after [^1]
- **(scripted), Required** Set Platform royalty payment address for the new core contract in PBAB royalty override contract
    >note: This step is optional in the PBAB deployer script in case platform royalty payment address is not known at time of deployment, but must be completed before royalty lookups will work
  - `admin` of the PBAB core contract must call the following function on the PBAB royalty override contract:
    - `updatePlatformRoyaltyAddressForContract(<new_PBAB_coreAddr>, <platformRoyaltyPaymentAddress>)`

Additionally, the following settings may be configured/changed by a PBAB core contract's `admin` at any time:
- **Change Royalty Percentages** 
    - `renderProvider` or `platform` Royalty [BPS](https://www.investopedia.com/terms/b/basispoint.asp) may be changed from default values of 2.5% to any value. This can be configured by a PBAB core contract's `admin` via the PBAB override contract's functions `updateRenderProviderBpsForContract` and `updatePlatformBpsForContract`.
- **Change Platform Royalty Payment Address**
    - The address to receive platform royalty payments may be updated by a PBAB core contract's admin via the PBAB override contract's function `updatePlatformRoyaltyAddressForContract`.
- **Change Render Provider Royalty Payment Address**
    - The address to receive render provider royalty payments is delegated to the token core contract, and defined as the public variable `renderProviderAddress`.

### Configuring Art Blocks Flagship Royalty Override
Upon deploying a new Art Blocks flagship core contract, the following steps must be taken (not scripted/automated):

- **Required** Set the royalty lookup address on the royalty registry for the newly deployed contract
  - Go to the [Royalty Registry](https://royaltyregistry.xyz/lookup) to call the following function on the Royalty Registry smart contract:
    - `setRoyaltyLookupAddress(<new_coreAddr>, <ArtBlocks_royaltyOverrideContract>)`
    >note: `ArtBlocks_royaltyOverrideContract` will be known after [^1]
- **Required** Set Art Blocks royalty payment address for the new core contract in the royalty override contract
  - `admin` of core contract must call:
    - `updateArtblocksRoyaltyAddressForContract(<new_coreAddr>, <ArtBlocksRoyaltyPaymentAddress>)`

Additionally, the following settings may be configured/changed by a core contract's `admin` at any time:
- **Change Art Blocks Royalty Percentage** 
    - Royalty [BPS](https://www.investopedia.com/terms/b/basispoint.asp) may be changed from default values of 2.5% to any value less than or equal to the default (cannot be increased above default). This can be configured by a core contract's `admin` via the  override contract's function `updateArtblocksBpsForContract`.
- **Change Art Blocks Royalty Payment Address**
    - The address to receive Art Blocks royalty payments may be updated by a core contract's admin via the royalty override contract's function `updateArtblocksRoyaltyAddressForContract`.




[^1]: Pending merge of manifoldxyz/royalty-registry-solidity#11