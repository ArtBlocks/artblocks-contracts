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
import "@nomicfoundation/hardhat-chai-matchers";
import "@typechain/hardhat";

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
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";

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

const BASE_MAINNET_JSON_RPC_PROVIDER_URL =
  process.env.BASE_MAINNET_JSON_RPC_PROVIDER_URL || "";

const HOODI_JSON_RPC_PROVIDER_URL =
  process.env.HOODI_JSON_RPC_PROVIDER_URL || "";

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
      maxNominalGasPriceGwei: 400,
    },
    base: {
      url: BASE_MAINNET_JSON_RPC_PROVIDER_URL,
      accounts: [`${PRIVATE_KEY}`],
      // ledgerAccounts: ["0x"],
      gasPrice: "auto",
      gasMultiplier: 1.5,
      maxNominalGasPriceGwei: 50,
    },
    arbitrum: {
      url: ARBITRUM_MAINNET_JSON_RPC_PROVIDER_URL,
      accounts: [`${PRIVATE_KEY}`],
      // ledgerAccounts: ["0x"],
      gasPrice: "auto",
      gasMultiplier: 1.5,
      maxNominalGasPriceGwei: 50,
    },
    hoodi: {
      url: HOODI_JSON_RPC_PROVIDER_URL,
      accounts: [`${PRIVATE_KEY}`],
      gasPrice: "auto",
      gasMultiplier: 2.0,
      maxNominalGasPriceGwei: 200,
    },
    coverage: {
      url: "http://localhost:8545",
    },
  },
  etherscan: {
    // V2 API migration: use single Etherscan API key for all Etherscan networks
    // See: https://docs.etherscan.io/contract-verification/verify-with-hardhat
    apiKey: ETHERSCAN_API_KEY,
    customChains: [
      {
        network: "sepolia",
        chainId: 11155111,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api",
          browserURL: "https://sepolia.etherscan.io",
        },
      },
      {
        network: "hoodi",
        chainId: 560048,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api",
          browserURL: "https://hoodi.etherscan.io",
        },
      },
    ],
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
    only: [
      "GenArt721CoreV3_Curated$",
      "GenArt721CoreV3_Curated_Flex$",
      "GenArt721CoreV3_Engine$",
      "GenArt721CoreV3_Engine_Flex$",
      "MinterRAM.*",
    ],
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
  sourcify: {
    enabled: false, // would like to enable this but it's not working
  },
  typechain: {
    outDir: "./scripts/contracts",
    target: "ethers-v5",
    alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
    externalArtifacts: ["./artifacts/contracts/**/!(*.dbg)*.json"], // optional array of glob patterns with external artifacts to process (for example external libs from node_modules)
    dontOverrideCompile: false, // defaults to false
  },
};
