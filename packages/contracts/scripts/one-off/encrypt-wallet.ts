import { ethers } from "ethers";
var readlineSync = require("readline-sync");
import { writeFileSync } from "fs";

/**
 * saves an input private key to encrypted keystore file
 * note: env var WALLET_FILE does not affect this script
 */
async function encryptWallets() {
  console.warn(
    "WARNING: If inputs are unexpected, this script may log input that could be sensitive. Use at your own risk."
  );
  // get private key from user
  let privateKey = readlineSync.question(
    "private key to encrypt (e.g. 0x012345...ef): ",
    {
      hideEchoBack: true,
    }
  );
  if (!privateKey) {
    throw new Error("no private key provided");
  }
  if (privateKey.startsWith("0x")) {
    // remove leading 0x
    privateKey = privateKey.substring(2);
  }
  if (privateKey.length !== 64) {
    throw new Error(
      "private key must be 32 bytes (64 characters), plus 0x prefix"
    );
  }
  const wallet = new ethers.Wallet(privateKey);
  console.log("Wallet address: ", wallet.address);
  // get password from user
  const keystorePassword = readlineSync.question(
    "STRONG, SECURE password for wallet keystore (recommend password generator): ",
    {
      hideEchoBack: true,
      mask: "",
    }
  );
  if (keystorePassword.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
  const keystorePasswordConfirm = readlineSync.question("Confirm password: ", {
    hideEchoBack: true,
    mask: "",
  });
  if (keystorePassword !== keystorePasswordConfirm) {
    throw new Error("Passwords do not match");
  }
  // encrypt wallet
  const encryptedKeystore = await wallet.encrypt(keystorePassword);
  // output to file
  const filename = readlineSync.question(
    "save to filename (must start with './wallets/' and end with '.encrypted-keystore.json'): ",
    {
      defaultInput: "./wallets/wallet.encrypted-keystore.json",
    }
  );
  if (!filename.endsWith(".encrypted-keystore.json")) {
    throw new Error("filename must end with '.encrypted-keystore.json'");
  }
  if (!filename.startsWith("./wallets/")) {
    throw new Error("filename must start with './wallets/'");
  }
  writeFileSync(filename, encryptedKeystore);
  // log status
  console.log(`mainnet keystore saved to ${filename}`);
}

encryptWallets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
