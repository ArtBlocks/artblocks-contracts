require("dotenv").config();
var readlineSync = require("readline-sync");
import { readFileSync } from "fs";
import { Wallet, ethers } from "ethers";

// Exports a function that returns the private key of the wallet to use for
// deploying contracts. The private key is loaded from an encrypted keystore
// file, defined by env var `WALLET_ENCRYPTED_KEYSTORE_FILE`. If this env var
// is not set, null is returned, and a warning will be logged.
// @dev use closure to only ever ask for password once
export var getDeployerWallet = ((): (() => Wallet | null) => {
  var _wallet: Wallet | null = null;

  var _getDeployerWallet: () => Wallet = function (): Wallet {
    if (_wallet) {
      // only load wallet once
      return _wallet;
    }
    // enable loading wallet from an encrypted keystore file
    const WALLET_ENCRYPTED_KEYSTORE_FILE =
      process.env.WALLET_ENCRYPTED_KEYSTORE_FILE || null;
    // require env var to be set
    if (!WALLET_ENCRYPTED_KEYSTORE_FILE) {
      console.warn(
        "WALLET_ENCRYPTED_KEYSTORE_FILE env variable not set - default hardhat accounts will be used"
      );
      return null;
    }
    if (!WALLET_ENCRYPTED_KEYSTORE_FILE.endsWith(".encrypted-keystore.json")) {
      // safety mechanism for clarity
      throw new Error(
        "WALLET_ENCRYPTED_KEYSTORE_FILE env variable must end with '.encrypted-keystore.json'"
      );
    }
    if (!WALLET_ENCRYPTED_KEYSTORE_FILE.startsWith("./wallets/")) {
      // safety mechanism for alginment with .gitignore
      throw new Error(
        "WALLET_ENCRYPTED_KEYSTORE_FILE env variable must start with './wallets/'"
      );
    }
    console.log("Loading wallet from file: ", WALLET_ENCRYPTED_KEYSTORE_FILE);
    const walletContents = readFileSync(
      WALLET_ENCRYPTED_KEYSTORE_FILE
    ).toString();
    const walletPassword = readlineSync.question("Wallet password: ", {
      hideEchoBack: true,
      mask: "",
    });
    // load wallet directly to closure variable
    _wallet = ethers.Wallet.fromEncryptedJsonSync(
      walletContents,
      walletPassword
    );
    console.log("Wallet Address: ", _wallet.address);
    return _wallet;
  };

  // return function that returns the wallet
  return _getDeployerWallet;
})();
