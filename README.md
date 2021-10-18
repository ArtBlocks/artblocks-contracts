# Art Blocks Smart Contracts

## Initial Setup

### install packages
`yarn`

### set up your environment

Create a `.env` file by duplicating `.env.example` and populating all variables.

### compile
`yarn hardhat compile`

### generate typescript contract bindings
`yarn generate:typechain`

## PBAB Deployments

**Important notes:**

1. **Always** recompile and regenerate typechain contract bindings before deployment `yarn hardhat compile && yarn generate:typechain`.
1. If deploying to mainnet, before running any of the deployment scripts below, ensure you have updated your `hardhat.config.ts` file to reflect a gas price for your transaction that is aligned with [current gas prices](https://etherscan.io/gastracker).

### setup steps

1. Create a new directory for the deployment of your projects' smart contracts (e.g. `scripts/PBAB/silly-dilly`)
1. Navigate to an existing project in the `script` directory (e.g. `scripts/PBAB/doodle-labs`)
1. Copy the deployment scripts from said existing project into your new directory, and update them to use the desired new information for the contracts, token name, and token symbol.
1. Perform the 3 main deployment steps below running the relevant deployment scripts in order, with the format `yarn hardhat run scripts/<randomizer script name> --network <network>`. Note that for a standard deployment these deployments should be done in order (and the files should be prefixed in this order accordingly): 1) `Randomizer`, 2) `GenArt721CoreV2`, 3) `GenArt721Minter`.

### deploying the randomizer

1. Run the Randomizer deployment script with, e.g. `yarn hardhat run scripts/PBAB/silly-dilly/1_silly_dilly_randomizer.ts --network ropsten`.
1. Once the contract deployment is successful, verify this on Etherscan and record the contract address of the successfully deployed Randomizer.

### deploying the core contract

1. Update the Core Contract deployment script (e.g. `2_silly_dilly_deploy_coreV2.ts`) to include the successfully deployed Randomizer contract address as the parameterized randomizer.
1. Run the core contract deployment script with, e.g., `yarn hardhat run scripts/PBAB/silly-dilly/2_silly_dilly_deploy_coreV2.ts --network ropsten`.
1. Once the contract deployment is successful, verify this on Etherscan and record the contract address of the successfully deployed Core Contract.
1. Verify the Core Contract on Etherscan: `yarn hardhat verify --contract <path to .sol>:<contract name> --network <network> <core contract address> "<token name>" "<token symbol>" "<randomizer contract address>"`

### deploying the minter

1. Update the Minter deployment script (e.g. `3_silly_dilly_deploy_minter.ts`) to include the successfully deployed Core Contract contract address as the parameterized core contract.
1. Run the minter deployment script with, e.g., `yarn hardhat run scripts/PBAB/silly-dilly/3_silly_dilly_deploy_minter.ts --network ropsten`.
1. Once the minter is successful, verify this on Etherscan and record the contract address of the successfully deployed Core Contract.
1. Verify the Minter on Etherscan: `yarn hardhat verify --contract <path to .sol>:<contract name> --network <network> <minter contract address> "<gen art contract address>"`

### (required) configuring base contract setup

1. Update the Core Contract to record the deployed minter as a whitelisted minter. This can be done by connecting to the contract via Etherscan (e.g. https://etherscan.io/address/0x28f2d3805652fb5d359486dffb7d08320d403240#writeContract) and using the `addMintWhitelisted` method.
1. Update the render provider address (e.g. the Art Blocks address) to use a secure multi-sig wallet (e.g. https://gnosis-safe.io/app/#/safes/0x51cFD298b73e19ecAB5BE6c88438bE3922f34293) rather than the default-assigned wallet of the deployer wallet (which is likely a hot wallet). This can be done by connecting to the contract via Etherscan (e.g. https://etherscan.io/address/0x28f2d3805652fb5d359486dffb7d08320d403240#writeContract) and using the `updateRenderProviderAddress` method.

### whitelist ab staff (testnet only)

1. Using the `addWhitelisted` method, whitelist the following engineering team folks in order to facilitate technical assistance while integrating and validating on testnet.
- `0xB8559AF91377e5BaB052A4E9a5088cB65a9a4d63` (purplehat)
- `0x3c3cAb03C83E48e2E773ef5FC86F52aD2B15a5b0` (dogbot)
- `0x0B7917b62BC98967e06e80EFBa9aBcAcCF3d4928` (ben_thank_you)

### transferring contract ownership

**You must perform the following steps in order.**

1. Update the owner of the Minter to reflect the final address of the PBAB project owner (which is likely not the default of the deployer address, which is likely a hot wallet). This can be done by connecting to the contract via Etherscan (e.g. https://etherscan.io/address/0x7497909537ce00fdda93c12d5083d8647c593c67#writeContract) and using the `setOwnerAddress` method.
1. Update the Core Contract to reflect the final address of the PBAB owner as a whitelisted address (this must be done in addition to making them the admin, and is easier to remember to do during setup, prior to transferring the admin role, rather than requiring that PBAB partners to this themselves). This can be done by connecting to the contract via Etherscan (e.g. https://etherscan.io/address/0x28f2d3805652fb5d359486dffb7d08320d403240#writeContract) and using the `addWhitelisted` method.
1. Update the admin role for the Core Contract to reflect the final address of the PBAB project owner (which is likely not the default of the deployer address, which is likely a hot wallet). This can be done by connecting to the contract via Etherscan (e.g. https://etherscan.io/address/0x28f2d3805652fb5d359486dffb7d08320d403240#writeContract) and using the `updateAdmin` method.

### post deployment infra configuration

1. Update The Graph's subgraph for PBAB to index the newly created smart contracts.
1. Add an associated S3 bucket for the new PBAB contract.
1. To allow for rendered project images to be previewed in the artist project manager, integrate this new S3 bucket in Vercel's external reference whitelisting.

## Project Launch Details

### project creation

After having deployed a PBAB contract, you can now create projects on your contract.

To create a new project shell, use the `addProject` method of your deployed Core Contract. This can be done by connecting to the contract via Etherscan.

### pre-mint #0 flight check

Prior to minting your first token (#0) on your new project shell, please verify the following.

1. The `baseTokenURI` has been set, taking the format of `http://token.artblocks.io/{CORE_CONTRACT_ADDRESS}/`.
1. The max invocations for the project have been set **on the minter**. This is achieved by calling the `setProjectMaxInvocations` on the Minter contract when connecting with Etherscan, with the project ID of the project to be minted as the parameter. **Note**: This should only be done _after_ setting this max invocations for the project on the Core Contract itself.

### pre-launch (open minting) flight check

Prior to launching your token for open minting, please verify the following.

1. The project has been activated by the contract admin. This can be verified by reading the `projectTokenInfo` field.
1. The project is not yet unpaused. Project pause status is toggle-able by the project artist. This can be verified by reading the `projectScriptInfo` field.
