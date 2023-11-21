require("dotenv").config();
var readlineSync = require("readline-sync");
import { readFileSync } from "fs";
import { ethers } from "ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-truffle5";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomiclabs/hardhat-solhint";
import "hardhat-contract-sizer";
import "@nomicfoundation/hardhat-verify";
import "hardhat-docgen";
import "@openzeppelin/hardhat-upgrades";
import { solidityConfig } from "./hardhat.solidity-config";

// ----- WALLET CONFIGURATION -----

// enable loading wallet from an encrypted keystore file
// default to dummy private key if no wallet keystore file is provided
const DUMMY_PRIVATE_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
let PRIVATE_KEY = DUMMY_PRIVATE_KEY;
const WALLET_FILE = process.env.WALLET_FILE || null;
if (WALLET_FILE) {
  if (!WALLET_FILE.endsWith(".encrypted-keystore.json")) {
    // safety mechanism for clarity
    throw new Error(
      "WALLET_FILE env variable must end with '.encrypted-keystore.json'"
    );
  }
  if (!WALLET_FILE.startsWith("./wallets/")) {
    // safety mechanism for alginment with .gitignore
    throw new Error("WALLET_FILE env variable must start with './wallets/'");
  }
  console.log("Loading wallet from file: ", WALLET_FILE);
  const walletContents = readFileSync(WALLET_FILE).toString();
  const walletPassword = readlineSync.question("Wallet password: ", {
    hideEchoBack: true,
    mask: "",
  });
  const wallet = ethers.Wallet.fromEncryptedJsonSync(
    walletContents,
    walletPassword
  );
  console.log("Wallet Address: ", wallet.address);
  PRIVATE_KEY = wallet.privateKey.substring(2); // remove leading 0x
} else {
  console.warn(
    `WALLET_FILE env variable not set, falling back to dummy default private key ${DUMMY_PRIVATE_KEY}`
  );
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
      accounts: [`0x${PRIVATE_KEY}`],
      gasPrice: "auto",
      gasMultiplier: 1.75,
      maxNominalGasPriceGwei: 50,
    },
    sepolia: {
      url: SEPOLIA_JSON_RPC_PROVIDER_URL,
      accounts: [`0x${PRIVATE_KEY}`],
      gasPrice: "auto",
      gasMultiplier: 4.0,
      maxNominalGasPriceGwei: 200,
    },
    goerli: {
      url: GOERLI_JSON_RPC_PROVIDER_URL,
      accounts: [`0x${PRIVATE_KEY}`],
      gasPrice: "auto",
      gasMultiplier: 10.0,
      maxNominalGasPriceGwei: 200,
    },
    palm_mainnet: {
      url: PALM_MAINNET_JSON_RPC_PROVIDER_URL,
      accounts: [`0x${PRIVATE_KEY}`],
      gasPrice: "auto",
      gasMultiplier: 1.5,
      maxNominalGasPriceGwei: 50,
    },
    palm_testnet: {
      url: PALM_TESTNET_JSON_RPC_PROVIDER_URL,
      accounts: [`0x${PRIVATE_KEY}`],
      gasPrice: "auto",
      gasMultiplier: 1.5,
      maxNominalGasPriceGwei: 200,
    },
    arbitrum: {
      url: ARBITRUM_MAINNET_JSON_RPC_PROVIDER_URL,
      accounts: [`0x${PRIVATE_KEY}`],
      gasPrice: "auto",
      gasMultiplier: 1.5,
      maxNominalGasPriceGwei: 50,
    },
    "arbitrum-sepolia": {
      url: ARBITRUM_SEPOLIA_JSON_RPC_PROVIDER_URL,
      accounts: [`0x${PRIVATE_KEY}`],
      gasPrice: "auto",
      gasMultiplier: 1.5,
      maxNominalGasPriceGwei: 200,
    },
    "arbitrum-goerli": {
      url: ARBITRUM_GOERLI_JSON_RPC_PROVIDER_URL,
      accounts: [`0x${PRIVATE_KEY}`],
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
    runOnCompile: false,
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
    currency: "USD",
    gasPrice: 100,
    enabled: true,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  mocha: {
    timeout: 100000,
  },
};
