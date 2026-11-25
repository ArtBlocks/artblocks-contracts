import { ethers, network } from "hardhat";
import { Contract } from "ethers";
import { gzipSync } from "zlib";

// ABX FS contracts are deployed by CREATE2 at the same address on every chain. The registry reads
// the FileStore and the generator reads the FileDataReader at these addresses; tests place mocks
// there with hardhat_setCode.
export const ABXFS_FILE_STORE_ADDRESS =
  "0x8b6077a1d6953D96687005B9408D56A655b4d155";
// the canonical FileDataReader (ABX FS companion), pinned: the generator's ABXFS_FILE_DATA_READER
export const ABXFS_FILE_DATA_READER_ADDRESS =
  "0x8571A75695efAF94c7b91e5Ec3fc636Ce026cF05";

export const GZIP_CODEC = ethers.utils.formatBytes32String("gzip");
export const BR_CODEC = ethers.utils.formatBytes32String("br");
export const NO_CODEC = ethers.constants.HashZero;

/** Places a MockAbxfsFileStore at the canonical FileStore address and returns it there. */
export async function installAbxfsFileStoreMock(): Promise<Contract> {
  const impl = await (
    await ethers.getContractFactory("MockAbxfsFileStore")
  ).deploy();
  await network.provider.send("hardhat_setCode", [
    ABXFS_FILE_STORE_ADDRESS,
    await ethers.provider.getCode(impl.address),
  ]);
  return ethers.getContractAt("MockAbxfsFileStore", ABXFS_FILE_STORE_ADDRESS);
}

/**
 * Places a MockAbxfsFileDataReader, which reads the FileStore at the canonical address, at
 * `fileDataReaderAddress` (the generator's `ABXFS_FILE_DATA_READER`) and returns it there.
 */
export async function installAbxfsFileDataReaderMock(
  fileDataReaderAddress: string
): Promise<Contract> {
  const impl = await (
    await ethers.getContractFactory("MockAbxfsFileDataReader")
  ).deploy();
  await network.provider.send("hardhat_setCode", [
    fileDataReaderAddress,
    await ethers.provider.getCode(impl.address),
  ]);
  return ethers.getContractAt("MockAbxfsFileDataReader", fileDataReaderAddress);
}

/**
 * Splits `data` into chunks of the given sizes, then the remainder in chunks of at most
 * `restChunkSize` bytes (ABX FS chunks are variable-size, so tests use uneven boundaries).
 */
export function splitIntoChunks(
  data: Buffer,
  sizes: number[] = [],
  restChunkSize = 24_575
): Buffer[] {
  const chunks: Buffer[] = [];
  let offset = 0;
  for (const size of sizes) {
    if (offset >= data.length) break;
    chunks.push(data.subarray(offset, offset + size));
    offset += size;
  }
  while (offset < data.length) {
    chunks.push(data.subarray(offset, offset + restChunkSize));
    offset += restChunkSize;
  }
  return chunks;
}

/**
 * Stores `script` gzipped as file `cid` in the mock FileStore, split into chunks of `sizes`
 * then the rest. Returns the gzip bytes.
 */
export async function setGzipFile(
  fileStore: Contract,
  cid: string,
  script: string | Buffer,
  sizes: number[] = []
): Promise<Buffer> {
  const gzip = gzipSync(
    typeof script === "string" ? Buffer.from(script, "utf8") : script
  );
  const chunks = splitIntoChunks(gzip, sizes);
  // @dev an explicit limit: left to the node, a large calldata write is sent with a limit over
  // the block gas limit
  await fileStore.setFile(cid, GZIP_CODEC, gzip.length, chunks, {
    gasLimit: (
      await fileStore.estimateGas.setFile(cid, GZIP_CODEC, gzip.length, chunks)
    ).mul(2),
  });
  return gzip;
}

export function abxfsCid(label: string): string {
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(label));
}
