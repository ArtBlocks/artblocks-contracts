import hre, { ethers } from "hardhat";
import { DependencyRegistryV0 } from "./contracts";
import { DependencyRegistryV0__factory } from "./contracts/factories/DependencyRegistryV0__factory";
import fs from "fs";
import zlib from "zlib";
import util from "util";
import Graphemer from "graphemer";
import Safe from "@safe-global/protocol-kit";
import { EthersAdapter } from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";
import { MetaTransactionData } from "@gnosis.pm/safe-core-sdk-types";
import { getNetworkName } from "./util/utils";
import { chunkArray } from "./util/utils";

const gzip = util.promisify(zlib.gzip);
const readFile = util.promisify(fs.readFile);

const TRANSACTION_CHUNK_SIZE = 5;
const config = {
  // Intended network to run on
  network: "",
  // File to gzip and upload
  file: "",
  // Dependency registry address
  dependencyRegistryAddress: "",
  // Gnosis safe address that controls the dependency registry
  safeAddress: "",
  // Transaction service url (e.g. https://safe-transaction-mainnet.safe.global/)
  transactionServiceUrl: "",
  // Update existing scripts instead of adding new ones
  update: false,
  // Offset to start uploading from. Useful for resuming a failed upload.
  offset: 0,
  // Dependency name and version to upload script for
  dependencyNameAndVersion: "",
};

const MAX_CONTENT_SIZE = 23500;

function chunk(s: string, maxBytes: number) {
  let buf = Buffer.from(s);
  const result = [];

  // Use Graphemer to split on grapheme boundaries
  const splitter = new Graphemer();

  while (buf.length) {
    const splitString = splitter.splitGraphemes(buf.toString("utf-8"));
    let i = maxBytes;

    // Assume that each chunk is composed of single-byte characters
    let chunk = splitString.slice(0, i).join("");
    let chunkSize = Buffer.byteLength(chunk);

    // If the chunk contains multi-byte characters, it will be too large
    // Reduce the chunk size until it fits
    if (chunkSize > maxBytes) {
      while (chunkSize > maxBytes) {
        i--;
        chunk = splitString.slice(0, i).join("");
        chunkSize = Buffer.byteLength(chunk);
      }
    }

    // This is a safe cut-off point; never half-way a multi-byte
    result.push(buf.subarray(0, i).toString());
    buf = buf.subarray(i); // Skip space (if any)
  }
  return result;
}

async function gzipAndBase64Encode(filePath: string) {
  try {
    // Read file
    const fileData = await readFile(filePath);

    // Gzip file
    const gzippedData = await gzip(fileData);

    // Base64 encode
    return gzippedData.toString("base64");
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

/**
 * The main function of this script performs the following tasks:
 *
 * 1. Validates the provided configuration, including the network, dependency registry address, file path, and dependency name and version.
 * 2. Sets up the Gnosis SDK with the Ethers adapter and Safe API kit.
 * 3. Reads the specified file, gzips it, and encodes the gzipped data in base64 format.
 * 4. Splits the base64 encoded string into chunks that are less than the maximum content size.
 * 5. Connects to the DependencyRegistry contract and creates a series of transactions. Each transaction either adds a new dependency script or updates an existing one, depending on the configuration.
 * 6. Groups the transactions into chunks to avoid hitting the gas limit.
 * 7. Proposes each chunk of transactions as a multi-send transaction to the Gnosis Safe.
 *
 * The goal of this script is to gzip and base64 encode a file, then propose transactions to add the encoded file on-chain to our DependencyRegistry contract.
 */
async function main() {
  // Destructure config
  const {
    dependencyRegistryAddress,
    file,
    dependencyNameAndVersion,
    offset,
    update,
  } = config;

  // Validate required config
  if (!(dependencyRegistryAddress && file && dependencyNameAndVersion)) {
    throw new Error("Missing required config");
  }

  // Update and offset cannot be used together
  if (update && offset) {
    throw new Error("Cannot use update and offset together");
  }

  // Validate network
  const networkName = await getNetworkName();
  if (networkName !== config.network) {
    throw new Error(
      `This script is intended to be run on ${config.network} but is being run on ${networkName}`
    );
  }

  // Ethers adapter reuires a signer with a provider so create one here
  const ledgerAddress = hre.network.config.ledgerAccounts[0];
  const ledgerSigner = await ethers.getSigner(ledgerAddress);
  console.log("using wallet", await ledgerSigner.getAddress());

  // Gnosis sdk setup
  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: ledgerSigner,
  });

  const safeApiKit = new SafeApiKit({
    txServiceUrl: config.transactionServiceUrl,
    ethAdapter,
  });

  const protocolKit = await Safe.create({
    ethAdapter,
    safeAddress: config.safeAddress,
  });

  // Gzip and base64 encode file
  const gzippedBase64EncodedScript = await gzipAndBase64Encode(file);
  if (!gzippedBase64EncodedScript) {
    throw new Error("Failed to base64 encode script");
  }

  // Write script to file for reference
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `gzippedBase64EncodedScript_${timestamp}.js`;
  console.log(
    `Writing gzipped base64 encoded script to ${filename} for reference`
  );
  fs.writeFileSync(filename, gzippedBase64EncodedScript);

  // Chunk script into pieces less than MAX_CONTENT_SIZE. Chunk size is based
  // on maximum contract size of 24kb.
  let scriptChunks = chunk(gzippedBase64EncodedScript, MAX_CONTENT_SIZE);
  if (offset) {
    scriptChunks = scriptChunks.slice(Number(offset));
  }

  // Get dependency registry contract to create transaction data
  const dependencyRegistry: DependencyRegistryV0 =
    DependencyRegistryV0__factory.connect(
      dependencyRegistryAddress,
      ledgerSigner
    );

  // Create transactions to send in multi-send transaction
  const addDependencyScriptTransactionData: MetaTransactionData[] =
    scriptChunks.map((chunk, i) => {
      let data;
      if (config.update) {
        data = dependencyRegistry.interface.encodeFunctionData(
          "updateDependencyScript",
          [ethers.utils.formatBytes32String(dependencyNameAndVersion), i, chunk]
        );
      } else {
        data = dependencyRegistry.interface.encodeFunctionData(
          "addDependencyScript",
          [ethers.utils.formatBytes32String(dependencyNameAndVersion), chunk]
        );
      }
      return {
        to: dependencyRegistry.address,
        data,
        value: "0x00",
      };
    });

  // Chunk transactions into groups of TRANSACTION_CHUNK_SIZE to avoid hitting the gas limit
  const chunkedTransactions = chunkArray(
    addDependencyScriptTransactionData,
    TRANSACTION_CHUNK_SIZE
  );

  console.log(
    `Proposing ${chunkedTransactions.length} transactions with ${addDependencyScriptTransactionData.length} total chunks`
  );

  // Propose each chunk of transactions as a multi-send transaction
  let nonce = await protocolKit.getNonce();
  for (let i = config.offset; i < chunkedTransactions.length; i++) {
    const transactions = chunkedTransactions[i];
    try {
      const safeTransaction = await protocolKit.createTransaction({
        safeTransactionData: transactions,
        options: {
          nonce: nonce++,
        },
      });
      const senderAddress = await ledgerSigner.getAddress();
      const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
      const signature = await protocolKit.signTransactionHash(safeTxHash);
      await safeApiKit.proposeTransaction({
        safeAddress: await protocolKit.getAddress(),
        safeTransactionData: safeTransaction.data,
        safeTxHash,
        senderAddress,
        senderSignature: signature.data,
      });
    } catch (error) {
      console.log(
        `Failed to propose transaction at index ${i}. Please rerun the script with the offset set to ${i}`
      );
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
