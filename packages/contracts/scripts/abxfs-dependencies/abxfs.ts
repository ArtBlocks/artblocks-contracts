// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Read-only checks of ABX FS on a network: that the FileDataReader the generator reads through is
 * deployed, and that a CID is never written to the registry unless the file it names is present,
 * gzip-encoded, and decodes to the expected library. (The registry itself refuses a CID that is
 * absent or not gzip; the SHA-256 check is what only this script can do.)
 */

import { ethers } from "hardhat";
import { createHash } from "crypto";
import { gunzipSync } from "zlib";
import {
  ABXFS_CANONICAL_FILE_STORE,
  ABXFS_FILE_DATA_READER,
  AbxfsDependencyFile,
} from "./config";

const FILE_STORE_ABI = [
  "function fileExists(bytes32 cid) view returns (bool)",
  "function getFileInfo(bytes32 cid) view returns (tuple(bytes32 root, uint8 rootLevel, uint256 chunkCount, uint256 size, string mimeType, bytes32 codec, bytes32 outputHash) info)",
  "function readChunk(bytes32 cid, uint256 index) view returns (bytes data)",
];

const GZIP_CODEC = ethers.utils.formatBytes32String("gzip");

export type VerifiedAbxfsFile = {
  chunkCount: number;
  gzipBytes: number;
  decodedBytes: number;
};

/**
 * Reads `entry.cid` from `fileStore` chunk by chunk (each read is a small call, so this works on
 * RPCs with low eth_call gas caps), gunzips it, and checks the decoded SHA-256.
 */
export async function verifyAbxfsFile(
  fileStore: string,
  entry: AbxfsDependencyFile
): Promise<VerifiedAbxfsFile> {
  const store = new ethers.Contract(fileStore, FILE_STORE_ABI, ethers.provider);
  if (!(await store.fileExists(entry.cid))) {
    throw new Error(
      `${entry.dependency}: ${entry.cid} is not a file on this network's ABX FS`
    );
  }
  const info = await store.getFileInfo(entry.cid);
  if (info.codec !== GZIP_CODEC) {
    throw new Error(
      `${entry.dependency}: ${entry.cid} is not a gzip file (codec ${info.codec})`
    );
  }
  const chunkCount = info.chunkCount.toNumber();
  const chunks: Buffer[] = [];
  for (let i = 0; i < chunkCount; i++) {
    chunks.push(
      Buffer.from(ethers.utils.arrayify(await store.readChunk(entry.cid, i)))
    );
  }
  const gzip = Buffer.concat(chunks);
  if (gzip.length !== info.size.toNumber()) {
    throw new Error(
      `${entry.dependency}: chunks join to ${gzip.length} bytes, FileStore reports ${info.size}`
    );
  }
  const decoded = gunzipSync(gzip);
  const sha256 = createHash("sha256").update(decoded).digest("hex");
  if (sha256 !== entry.sha256) {
    throw new Error(
      `${entry.dependency}: decoded SHA-256 ${sha256}, expected ${entry.sha256}`
    );
  }
  return {
    chunkCount,
    gzipBytes: gzip.length,
    decodedBytes: decoded.length,
  };
}

/**
 * Refuses unless the canonical FileDataReader is deployed on this network, reads the canonical
 * stores, and is the address `generatorImplementation` reads through. The generator reads every
 * dependency file through it, so no upgrade batch is built before it exists.
 */
export async function requireFileDataReader(
  generatorImplementation: string
): Promise<void> {
  const generator = new ethers.Contract(
    generatorImplementation,
    ["function ABXFS_FILE_DATA_READER() view returns (address)"],
    ethers.provider
  );
  const reader = ethers.utils.getAddress(
    await generator.ABXFS_FILE_DATA_READER()
  );
  if (reader !== ethers.utils.getAddress(ABXFS_FILE_DATA_READER)) {
    throw new Error(
      `Generator implementation reads FileDataReader ${reader}, config says ${ABXFS_FILE_DATA_READER}.`
    );
  }
  if ((await ethers.provider.getCode(reader)) === "0x") {
    throw new Error(
      `No ABX FS FileDataReader at ${reader} on this network. Deploy it (ABX FS, ` +
        `packages/contracts-companion/script/DeployDataReader.s.sol) before upgrading the generator.`
    );
  }
  const fileStore = await new ethers.Contract(
    reader,
    ["function fileStore() view returns (address)"],
    ethers.provider
  ).fileStore();
  if (
    ethers.utils.getAddress(fileStore) !==
    ethers.utils.getAddress(ABXFS_CANONICAL_FILE_STORE)
  ) {
    throw new Error(
      `FileDataReader ${reader} reads FileStore ${fileStore}, not the canonical ${ABXFS_CANONICAL_FILE_STORE}.`
    );
  }
}
