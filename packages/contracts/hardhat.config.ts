require("dotenv").config();
import "@nomiclabs/hardhat-truffle5";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomiclabs/hardhat-solhint";
import "hardhat-contract-sizer";
import "@nomicfoundation/hardhat-verify";
import "hardhat-docgen";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-ledger";
import { solidityConfig } from "./hardhat.solidity-config";
import { getDeployerWallet } from "./scripts/util/get-deployer-wallet";
require("@nomicfoundation/hardhat-chai-matchers");

// ----- WALLET CONFIGURATION -----
// initialize with dummy fallback private key
let PRIVATE_KEY: string =
  "DEAD000000000000000000000000000000000000000000000000000000000000";
// if process argument "run" is present, use the deployer wallet
// @dev use argv length check to avoid wallet nuisance when hardhat
// runs pre-processes such as "compile" prior to running scripts
if (process.argv.length == 2) {
  // override default wallet with loaded deployer wallet if available
  const deployerWallet = getDeployerWallet();
  if (deployerWallet) {
    PRIVATE_KEY = deployerWallet.privateKey;
  }
}

// ----- API KEYS -----

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const ARBISCAN_API_KEY = process.env.ARBISCAN_API_KEY || "";

// @dev load environment variables, falling back to defaults if not set to
// enable running tests without a populated .env file
const MAINNET_JSON_RPC_PROVIDER_URL =
  process.env.MAINNET_JSON_RPC_PROVIDER_URL || "";
const SEPOLIA_JSON_RPC_PROVIDER_URL =
  process.env.SEPOLIA_JSON_RPC_PROVIDER_URL || "";
const GOERLI_JSON_RPC_PROVIDER_URL =
  process.env.GOERLI_JSON_RPC_PROVIDER_URL || "";

// L2 Configuration
const ARBITRUM_MAINNET_JSON_RPC_PROVIDER_URL =
  process.env.ARBITRUM_MAINNET_JSON_RPC_PROVIDER_URL || "";
const ARBITRUM_SEPOLIA_JSON_RPC_PROVIDER_URL =
  process.env.ARBITRUM_SEPOLIA_JSON_RPC_PROVIDER_URL || "";
const ARBITRUM_GOERLI_JSON_RPC_PROVIDER_URL =
  process.env.ARBITRUM_GOERLI_JSON_RPC_PROVIDER_URL || "";

// Sidechain Configuration
const PALM_MAINNET_JSON_RPC_PROVIDER_URL =
  process.env.PALM_MAINNET_JSON_RPC_PROVIDER_URL || "";
const PALM_TESTNET_JSON_RPC_PROVIDER_URL =
  process.env.PALM_TESTNET_JSON_RPC_PROVIDER_URL || "";

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
/**
 * @type import('hardhat/config').HardhatUserConfig
 */

module.exports = {
  solidity: solidityConfig,
  networks: {
    hardhat: {
      gasPrice: 100000000000, // 100 gwei
      initialBaseFeePerGas: 0,
      maxNominalGasPriceGwei: 200, // gwei
    },
    mainnet: {
      url: MAINNET_JSON_RPC_PROVIDER_URL,
      // must only use one of the following two options
      accounts: [`${PRIVATE_KEY}`],
      // ledgerAccounts: ["0x"],
      gasPrice: "auto",
      gasMultiplier: 1.75,
      maxNominalGasPriceGwei: 75,
    },
    sepolia: {
      url: SEPOLIA_JSON_RPC_PROVIDER_URL,
      accounts: [`${PRIVATE_KEY}`],
      gasPrice: "auto",
      gasMultiplier: 4.0,
      maxNominalGasPriceGwei: 200,
    },
    goerli: {
      url: GOERLI_JSON_RPC_PROVIDER_URL,
      accounts: [`${PRIVATE_KEY}`],
      gasPrice: "auto",
      gasMultiplier: 10.0,
      maxNominalGasPriceGwei: 200,
    },
    palm_mainnet: {
      url: PALM_MAINNET_JSON_RPC_PROVIDER_URL,
      accounts: [`${PRIVATE_KEY}`],
      gasPrice: "auto",
      gasMultiplier: 1.5,
      maxNominalGasPriceGwei: 50,
    },
    palm_testnet: {
      url: PALM_TESTNET_JSON_RPC_PROVIDER_URL,
      accounts: [`${PRIVATE_KEY}`],
      gasPrice: "auto",
      gasMultiplier: 1.5,
      maxNominalGasPriceGwei: 200,
    },
    arbitrum: {
      url: ARBITRUM_MAINNET_JSON_RPC_PROVIDER_URL,
      accounts: [`${PRIVATE_KEY}`],
      gasPrice: "auto",
      gasMultiplier: 1.5,
      maxNominalGasPriceGwei: 50,
    },
    "arbitrum-sepolia": {
      url: ARBITRUM_SEPOLIA_JSON_RPC_PROVIDER_URL,
      accounts: [`${PRIVATE_KEY}`],
      gasPrice: "auto",
      gasMultiplier: 1.5,
      maxNominalGasPriceGwei: 200,
    },
    "arbitrum-goerli": {
      url: ARBITRUM_GOERLI_JSON_RPC_PROVIDER_URL,
      accounts: [`${PRIVATE_KEY}`],
      gasPrice: "auto",
      gasMultiplier: 1.5,
      maxNominalGasPriceGwei: 200,
    },
    coverage: {
      url: "http://localhost:8545",
    },
  },
  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_API_KEY,
      goerli: ETHERSCAN_API_KEY,
      sepolia: ETHERSCAN_API_KEY,
      arbitrum: ARBISCAN_API_KEY, // This is unused but here in case hardhat changes
      arbitrumOne: ARBISCAN_API_KEY,
      "arbitrum-sepolia": ARBISCAN_API_KEY,
      "arbitrum-goerli": ARBISCAN_API_KEY,
    },
    customChains: [
      {
        network: "arbitrum-sepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io",
        },
      },
    ],
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  docgen: {
    path: "./docs",
    clear: true,
    runOnCompile: false,
    except: [
      `^contracts/interfaces/v0.5.x/`,
      `^contracts/interfaces/v0.8.x/IManifold.sol`,
      `^contracts/interfaces/v0.8.x/IBonusContract.sol`,
      `^contracts/libs/v0.5.x/`,
      `^contracts/minter-suite/Minters/.*V0.sol`,
      `^contracts/mock`,
      `^contracts/PBAB\\+Collabs/.*/.*.sol`,
      `^contracts/BasicRandomizer.sol`,
      `^contracts/BasicRandomizerV2.sol`,
    ],
  },
  gasReporter: {
    enabled: false,
    currency: "USD",
    gasPrice: 100,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  mocha: {
    timeout: 100000,
  },
};
