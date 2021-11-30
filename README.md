# Art Blocks Smart Contracts

[![CircleCI](https://circleci.com/gh/ArtBlocks/artblocks-contracts/tree/main.svg?style=svg&circle-token=757a2689792bc9c126834396d6fa47e8f023bc2d)](https://circleci.com/gh/ArtBlocks/artblocks-contracts/tree/main)

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

### prettify your source code
`yarn prettier`

## PBAB Deployments

**Important notes:**

1. **Always** recompile and regenerate typechain contract bindings before deployment `yarn clean && yarn compile && yarn generate:typechain`.
1. If deploying to mainnet, before running any of the deployment scripts below, ensure you have updated your `hardhat.config.ts` file to reflect a gas price for your transaction that is aligned with [current gas prices](https://etherscan.io/gastracker).

### deployment steps

1. Create a new directory for the deployment of your projects' smart contracts (e.g. `scripts/PBAB/silly-dilly`)
1. Navigate to the `scripts/1_reference_pbab_suite_deployer.ts` example deployer in the `script` directory.
1. Copy the reference deployer script from said existing project into your new directory and rename it.
1. Update the new multi-contract deployment script copy to use the desired new information for the renderer provider, contract ownership, token name, and token symbol for the new ERC721 contract, as defined within the `CONFIG BEGINS HERE` and `CONFIG ENDS HERE` comment blocks.
1. **[Mainnet only]** Ensure that your local `hardhat.config.ts` file has a reasonable gas limit set, based on current gas prices.
1. Perform the 3 contract deployments by running a forked and updated deployment script, with the format `yarn hardhat run scripts/<deployment script name> --network <network>`.
1. Verify that the deployed addresses reported in your terminal match those that you find on Etherscan when looking at the outgoing transactions for your deployer wallet.
1. Verify the deployed contracts on Etherscan, using the commands prompted to you by the deployment script.

### help!

If you're running into issues while attempting a deployment, before you begin to panic try running `yarn clean` first.

### post deployment infra configuration

1. Update The Graph's subgraph for PBAB to index the newly created smart contracts.
1. Add an associated S3 bucket for the new PBAB contract.
1. To allow for rendered project images to be previewed in the artist project manager, integrate this new S3 bucket in Vercel's external reference whitelisting.

### recording deployment log

After having successfully deployed a set of contracts for a new PBAB configuration, it is good practice to make record of the deployment details (e.g. in a simple Markdown file) regarding which contracts were deployed and what deployed addresses they now live at. You can see an example of this in this repository with PR #33.

### automated post-deployment setup

**NOTE:** The following post-deployment steps are done _automatically_ by the integrated multi-contract deployment script. The following descriptions exist purely for descriptive purposes.

#### configuring base contract setup

1. Update the Core Contract to record the deployed minter as a whitelisted minter. This can be done by connecting to the contract via Etherscan (e.g. https://etherscan.io/address/0x28f2d3805652fb5d359486dffb7d08320d403240#writeContract) and using the `addMintWhitelisted` method.
1. Update the render provider address (e.g. the Art Blocks address) to use a secure Art Blocks owned hardware wallet rather than the default-assigned wallet of the deployer wallet (which is likely a hot wallet). This can be done by connecting to the contract via Etherscan (e.g. https://etherscan.io/address/0x28f2d3805652fb5d359486dffb7d08320d403240#writeContract) and using the `updateRenderProviderAddress` method.

**Note:** in the future, it would be preferrable to use a multi-sig vault (e.g. Gnosis) rather than using a single-failure-point hardware wallet as the render provider payee for new core contract deployments, but this is currently problematic due to EIP-2929 (see https://help.gnosis-safe.io/en/articles/5249851-why-can-t-i-transfer-eth-from-a-contract-into-a-safe).

#### whitelist ab staff (testnet only)

1. Using the `addWhitelisted` method, whitelist the following engineering team folks in order to facilitate technical assistance while integrating and validating on testnet.
- `0xB8559AF91377e5BaB052A4E9a5088cB65a9a4d63` (purplehat)
- `0x3c3cAb03C83E48e2E773ef5FC86F52aD2B15a5b0` (dogbot)
- `0x0B7917b62BC98967e06e80EFBa9aBcAcCF3d4928` (ben_thank_you)

#### transferring contract ownership

**The following steps must be performed in order.**

1. Update the owner of the Minter to reflect the final address of the PBAB project owner (which is likely not the default of the deployer address, which is likely a hot wallet). This can be done by connecting to the contract via Etherscan (e.g. https://etherscan.io/address/0x7497909537ce00fdda93c12d5083d8647c593c67#writeContract) and using the `setOwnerAddress` method.
1. Update the Core Contract to reflect the final address of the PBAB owner as a whitelisted address (this must be done in addition to making them the admin, and is easier to remember to do during setup, prior to transferring the admin role, rather than requiring that PBAB partners to this themselves). This can be done by connecting to the contract via Etherscan (e.g. https://etherscan.io/address/0x28f2d3805652fb5d359486dffb7d08320d403240#writeContract) and using the `addWhitelisted` method.
1. Update the admin role for the Core Contract to reflect the final address of the PBAB project owner (which is likely not the default of the deployer address, which is likely a hot wallet). This can be done by connecting to the contract via Etherscan (e.g. https://etherscan.io/address/0x28f2d3805652fb5d359486dffb7d08320d403240#writeContract) and using the `updateAdmin` method.
