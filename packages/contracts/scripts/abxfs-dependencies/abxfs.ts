// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Read-only checks of ABX FS files on a network, so a CID is never written to the registry
 * unless the file it names is present, gzip-encoded, and decodes to the expected library.
 */

import { ethers } from "hardhat";
import { createHash } from "crypto";
import { gunzipSync } from "zlib";
import { AbxfsDependencyFile } from "./config";

const FILE_STORE_ABI = [
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
  const info = await store.getFileInfo(entry.cid);
  if (info.codec !== GZIP_CODEC) {
    throw new Error(
      `${entry.dependency}: ${entry.cid} is not a gzip file on this network ` +
        `(codec ${info.codec}${info.root === ethers.constants.HashZero ? ", file not found" : ""})`
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
