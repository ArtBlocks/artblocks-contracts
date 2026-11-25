// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Read-only checks of ABX FS on a network: that the FileDataReader the generator reads through is
 * deployed, and that a CID is never written to the registry unless the file it names is present,
 * gzip-encoded, and decodes to the expected library exactly as the page will decode it. (The
 * registry itself refuses a CID that is absent or not gzip; the rest is what only this script can
 * check.)
 */

import { ethers } from "hardhat";
import { createHash } from "crypto";
import { gunzipSync, inflateRawSync } from "zlib";
import {
  ABXFS_CANONICAL_FILE_STORE,
  ABXFS_CANONICAL_SSTORE2_BACKEND,
  ABXFS_FILE_DATA_READER,
  AbxfsDependencyFile,
} from "./config";

const FILE_STORE_ABI = [
  "function fileExists(bytes32 cid) view returns (bool)",
  "function getFileInfo(bytes32 cid) view returns (tuple(bytes32 root, uint8 rootLevel, uint256 chunkCount, uint256 size, string mimeType, bytes32 codec, bytes32 outputHash) info)",
  "function readChunk(bytes32 cid, uint256 index) view returns (bytes data)",
  "function getChunkIds(bytes32 cid, uint256 start, uint256 end) view returns (bytes32[] ids)",
  "function chunkStore() view returns (address)",
];

const CHUNK_STORE_ABI = [
  "function recordOf(bytes32 id) view returns (address backend, uint48 size, bytes32 pointer, bytes32 dataHash)",
];

const GZIP_CODEC = ethers.utils.formatBytes32String("gzip");

export type VerifiedAbxfsFile = {
  chunkCount: number;
  gzipBytes: number;
  decodedBytes: number;
};

/**
 * Reads `entry.cid` from `fileStore` chunk by chunk (each read is a small call, so this works on
 * RPCs with low eth_call gas caps), gunzips it, and checks the decoded SHA-256. Also requires:
 * - every chunk in the canonical raw SSTORE2 backend, which is immutable, so the file stays
 *   readable exactly as verified;
 * - one gzip member and nothing after it (`requireSingleMemberGzip`): the page inflates only the
 *   first member, while zlib inflates them all, so only then is what is checked here what renders.
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
  const chunkStore = new ethers.Contract(
    await store.chunkStore(),
    CHUNK_STORE_ABI,
    ethers.provider
  );
  const ids: string[] = await store.getChunkIds(entry.cid, 0, chunkCount);
  for (let i = 0; i < ids.length; i++) {
    const { backend } = await chunkStore.recordOf(ids[i]);
    if (
      ethers.utils.getAddress(backend) !==
      ethers.utils.getAddress(ABXFS_CANONICAL_SSTORE2_BACKEND)
    ) {
      throw new Error(
        `${entry.dependency}: chunk ${i} is stored in backend ${backend}, not the canonical raw SSTORE2 backend ${ABXFS_CANONICAL_SSTORE2_BACKEND}`
      );
    }
  }
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
  requireSingleMemberGzip(entry.dependency, gzip);
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
 * Refuses unless `gzip` is exactly one gzip member: a valid header, one deflate stream, and its
 * 8-byte trailer ending the data. (`gunzipSync` then checks the trailer's CRC-32 and size.) Inflaters
 * agree on such a file; on several members, or bytes after the trailer, they do not.
 */
export function requireSingleMemberGzip(
  dependency: string,
  gzip: Buffer
): void {
  if (
    gzip.length < 18 ||
    gzip[0] !== 0x1f ||
    gzip[1] !== 0x8b ||
    gzip[2] !== 8
  ) {
    throw new Error(`${dependency}: not a gzip member (header)`);
  }
  const flags = gzip[3];
  if (flags & 0xe0) {
    throw new Error(`${dependency}: gzip header sets reserved flags`);
  }
  let offset = 10;
  if (flags & 0x04) offset += 2 + gzip.readUInt16LE(offset); // FEXTRA
  if (flags & 0x08) offset = gzip.indexOf(0, offset) + 1; // FNAME
  if (flags & 0x10) offset = gzip.indexOf(0, offset) + 1; // FCOMMENT
  if (flags & 0x02) offset += 2; // FHCRC
  if (offset <= 0 || offset >= gzip.length) {
    throw new Error(`${dependency}: truncated gzip header`);
  }
  // `info: true` also returns the inflater, whose `bytesWritten` is the deflate stream's length.
  const { engine } = inflateRawSync(gzip.subarray(offset), {
    info: true,
  }) as unknown as { engine: { bytesWritten: number } };
  const end = offset + engine.bytesWritten + 8;
  if (end !== gzip.length) {
    throw new Error(
      `${dependency}: gzip is not a single member: its first member ends at byte ${end} of ${gzip.length}`
    );
  }
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
