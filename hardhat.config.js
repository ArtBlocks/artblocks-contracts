require("@nomiclabs/hardhat-waffle");
require('hardhat-contract-sizer');
require("hardhat-gas-reporter");


const INFURA_PROJECT_ID = process.env.PROTOTYPE_BR_INFURA_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const MNEMONIC = process.env.MNEMONIC;
const MAINNET_KEY = process.env.MAINNET_KEY;

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

module.exports = {
  solidity: {
    version: "0.5.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
      },
    },
  },
  networks: {
    hardhat: {
      gasPrice: 0,
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${MAINNET_KEY}`],
      gasPrice: 75000000000
    },
    ropsten: {
      url: `http://127.0.0.1:8545`,
      chainId:3,
      from: `0x8De4e517A6F0B84654625228D8293b70AB49cF6C`
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID}`,

      accounts: [`0x${PRIVATE_KEY}`]
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${PRIVATE_KEY}`]
    },
    coverage: {
      url: 'http://localhost:8545',
      // gasPrice: 8000000000, // 8 gwei
    }
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },

    gasReporter: {
      currency: 'USD',
      gasPrice: 500
    }
};
// console.log(`https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`);
