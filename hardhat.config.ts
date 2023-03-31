require("dotenv").config();

import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-truffle5";
import "@nomiclabs/hardhat-solhint";
import "@nomiclabs/hardhat-vyper";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-gas-reporter";
import "hardhat-contract-sizer";
import "hardhat-docgen";
import "@openzeppelin/hardhat-upgrades";
import { solidityConfig } from "./hardhat.solidity-config";
import { vyperConfig } from "./hardhat.vyper-config";

const MAINNET_JSON_RPC_PROVIDER_URL = process.env.MAINNET_JSON_RPC_PROVIDER_URL;
const GOERLI_JSON_RPC_PROVIDER_URL = process.env.GOERLI_JSON_RPC_PROVIDER_URL;
const MAINNET_PRIVATE_KEY = process.env.MAINNET_PRIVATE_KEY;
const TESTNET_PRIVATE_KEY = process.env.TESTNET_PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

// Sidechain Configuration
const PALM_MAINNET_JSON_RPC_PROVIDER_URL =
  process.env.PALM_MAINNET_JSON_RPC_PROVIDER_URL;
const PALM_TESTNET_JSON_RPC_PROVIDER_URL =
  process.env.PALM_TESTNET_JSON_RPC_PROVIDER_URL;

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

module.exports = {
  // Currently disabled due to: https://github.com/NomicFoundation/hardhat/issues/2812
  vyper: vyperConfig,
  solidity: solidityConfig,
  networks: {
    hardhat: {
      gasPrice: 100000000000, // 100 gwei
      initialBaseFeePerGas: 0,
    },
    mainnet: {
      url: MAINNET_JSON_RPC_PROVIDER_URL,
      accounts: [`0x${MAINNET_PRIVATE_KEY}`],
      gasPrice: "auto",
      gasMultiplier: 1.75,
    },
    goerli: {
      url: GOERLI_JSON_RPC_PROVIDER_URL,
      accounts: [`0x${TESTNET_PRIVATE_KEY}`],
      gasPrice: "auto",
      gasMultiplier: 4.0,
    },
    palm_mainnet: {
      url: PALM_MAINNET_JSON_RPC_PROVIDER_URL,
      accounts: [`0x${MAINNET_PRIVATE_KEY}`],
      gasPrice: "auto",
      gasMultiplier: 1.5,
    },
    palm_testnet: {
      url: PALM_TESTNET_JSON_RPC_PROVIDER_URL,
      accounts: [`0x${TESTNET_PRIVATE_KEY}`],
      gasPrice: "auto",
      gasMultiplier: 1.5,
    },
    coverage: {
      url: "http://localhost:8545",
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
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
      `^contracts/interfaces/0.5.x/`,
      `^contracts/interfaces/0.8.x/IManifold.sol`,
      `^contracts/interfaces/0.8.x/IBonusContract.sol`,
      `^contracts/libs/0.5.x/`,
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
