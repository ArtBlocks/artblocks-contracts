

### install packages
`yarn`

### compile
`yarn hardhat compile`

### generate typescript contract bindings
`yarn generate:typechain`

### deploy a gen art contract + minter

1. create a `.env` file by duplicating `.env.example` and populating all variables
2. copy doodle_labs_contract_setup.ts and update to use the desired contracts, token name, and token symbol
3. `yarn hardhat run scripts/<new script name> --network <network>`

### verify on etherscan
- GenArt
  - `yarn hardhat verify --contract <path to .sol>:<contract name> --network <network> <contract address> "<token name>" "<token symbol>" "<randomizer contract address>"`
- Minter
  - `yarn hardhat verify --contract <path to .sol>:<contract name> --network <network> <contract address> "<gen art contract address>"`
