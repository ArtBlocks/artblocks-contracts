require("dotenv").config();
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-truffle5";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomiclabs/hardhat-solhint";
import "hardhat-contract-sizer";
import "@nomiclabs/hardhat-etherscan";

const INFURA_PROJECT_ID = process.env.PROTOTYPE_BR_INFURA_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const MNEMONIC = process.env.MNEMONIC;
const ROPSTEN_PRIVATE_KEY = process.env.ROPSTEN_PRIVATE_KEY;
const ALCHEMY_ROPSTEN_API_KEY = process.env.ALCHEMY_ROPSTEN_API_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

module.exports = {
  solidity: {
    version: "0.5.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  gasReporter: {
    currency: "USD",
    enabled: true
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false
  },
  networks: {
    hardhat: {
      gasPrice: 0, // 0 gwei
      allowUnlimitedContractSize: true
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: { mnemonic: `${MNEMONIC}` },
      gasPrice: 30000000000
    },
    ropsten: {
      url: `https://eth-ropsten.alchemyapi.io/v2/${ALCHEMY_ROPSTEN_API_KEY}`,
      accounts: [`0x${ROPSTEN_PRIVATE_KEY}`]
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: PRIVATE_KEY ? [`0x${PRIVATE_KEY}`] : "remote"
      //accounts: {mnemonic:`update worry tide frequent intact pave fun daring abandon already payment wonder`}
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: PRIVATE_KEY ? [`0x${PRIVATE_KEY}`] : "remote"
    },
    coverage: {
      url: "http://localhost:8555",
      gasPrice: 8000000000 // 8 gwei
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  }
};
