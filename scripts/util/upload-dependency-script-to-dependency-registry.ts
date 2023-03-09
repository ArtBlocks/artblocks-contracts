// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
import { Command } from "@commander-js/extra-typings";
import { ethers } from "hardhat";
import { DependencyRegistryV0 } from "../contracts";
import { DependencyRegistryV0__factory } from "../contracts/factories/DependencyRegistryV0__factory";
import fs from "fs";
import { ContractTransaction } from "ethers";
import Graphemer from "graphemer";

const program = new Command()
  .option(
    "-d --dependency-registry <dependency-registry>",
    "Dependency registry address"
  )
  .option("-f --file <file>", "Path to file to be uploaded")
  .option("-t --dependency-type <dependency-type>", "Dependency type")
  .option(
    "-o --offset <offset>",
    "Offset to start at. Usefule for resuming upload after failure"
  )
  .option(
    "-u --update",
    "Update existing dependency scripts instead of appending"
  );

program.parse(process.argv);

export const maxContentSize = 24000;

function chunk(s, maxBytes) {
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
      console.log("hello");
      while (chunkSize > maxBytes) {
        i--;
        chunk = splitString.slice(0, i).join("");
        chunkSize = Buffer.byteLength(chunk);
      }
    }

    // This is a safe cut-off point; never half-way a multi-byte
    result.push(buf.slice(0, i).toString());
    buf = buf.slice(i); // Skip space (if any)
  }
  return result;
}

async function main() {
  const {
    dependencyRegistry: dependencyRegistryAddress,
    file,
    dependencyType,
    offset,
    update,
  } = program.opts();

  if (!(dependencyRegistryAddress && file && dependencyType)) {
    throw new Error("Missing required option");
  }

  if (update && offset) {
    throw new Error("Cannot use --update and --offset together");
  }

  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;
  if (networkName != "goerli") {
    throw new Error("This script is intended to be run on goerli only");
  }

  let scriptChunks = chunk(fs.readFileSync(file), maxContentSize);
  if (offset) {
    scriptChunks = scriptChunks.slice(Number(offset));
  }

  const dependencyRegistry: DependencyRegistryV0 =
    DependencyRegistryV0__factory.connect(dependencyRegistryAddress, signer);

  for (let i = 0; i < scriptChunks.length; i++) {
    console.log(`Uploading chunk ${i + 1} of ${scriptChunks.length}...`);
    const chunk = scriptChunks[i];

    try {
      let transaction: ContractTransaction | null = null;
      if (update) {
        transaction = await dependencyRegistry.updateDependencyScript(
          ethers.utils.formatBytes32String(dependencyType),
          i,
          chunk
        );
      } else {
        transaction = await dependencyRegistry.addDependencyScript(
          ethers.utils.formatBytes32String(dependencyType),
          chunk
        );
      }
      await transaction.wait();
      console.log(`Uploaded chunk ${i + 1} of ${scriptChunks.length}`);
    } catch (error) {
      console.error(error);
      console.error(
        `Failed to upload chunk ${i + 1} of ${
          scriptChunks.length
        } to dependency registry. Try running this script again with the --offset option set to ${i}`
      );
      break;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
