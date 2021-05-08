require('dotenv').config();
usePlugin("@nomiclabs/buidler-waffle");
usePlugin("@nomiclabs/buidler-truffle5");
usePlugin("buidler-gas-reporter");
usePlugin("solidity-coverage");
usePlugin("@nomiclabs/buidler-solhint");

const INFURA_PROJECT_ID = process.env.PROTOTYPE_BR_INFURA_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const MNEMONIC = process.env.MNEMONIC;
const MAINNET_KEY = process.env.MAINNET_KEY;

module.exports = {
  solc: {
    version: '0.5.17',
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  gasReporter: {
    currency: 'USD',
    enabled: true
  },
  networks: {
    buidlerevm: {
      gasPrice: 0, // 0 gwei
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
      //accounts: {mnemonic:`${MNEMONIC}`},
      accounts: [`0x${MAINNET_KEY}`],
      gasPrice: 75000000000
    },
    ropsten: {
      url: `http://127.0.0.1:8545`,
      chainId:3,
      from: `0x8De4e517A6F0B84654625228D8293b70AB49cF6C`
    },
    /*
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${PRIVATE_KEY}`]
    },
    */
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID}`,

      accounts: [`0x${PRIVATE_KEY}`]
      //accounts: {mnemonic:`update worry tide frequent intact pave fun daring abandon already payment wonder`}
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${PRIVATE_KEY}`]
    },
    coverage: {
      url: 'http://localhost:8555',
      gasPrice: 8000000000, // 8 gwei
    }
  }
};
