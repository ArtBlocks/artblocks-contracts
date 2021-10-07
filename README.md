

### install packages
`yarn`

### set up your environment

Create a `.env` file by duplicating `.env.example` and populating all variables.

### compile
`yarn hardhat compile`

### generate typescript contract bindings
`yarn generate:typechain`

### deploy a gen art contract + minter

1. Create a new directory for the deployment of your projects' smart contracts (e.g. `scripts/PBAB/silly-dilly`)
2. Navigate to an existing project in the `script` directory (e.g. `scripts/PBAB/doodle-labs`)
2. Copy the deployment scripts from said existing project into your new directory, and update them to use the desired new information for the contracts, token name, and token symbol.
3. Run each deployment script with: `yarn hardhat run scripts/<new script name> --network <network>`. Note that for a standard deployment these scripts should be run/updated in order: 1) Randomizer, 2) GenArt721CoreV2, 3) GenArt721Minter.

### verify on etherscan
- GenArt721CoreV2
  - `yarn hardhat verify --contract <path to .sol>:<contract name> --network <network> <contract address> "<token name>" "<token symbol>" "<randomizer contract address>"`
- GenArt721Minter
  - `yarn hardhat verify --contract <path to .sol>:<contract name> --network <network> <contract address> "<gen art contract address>"`
