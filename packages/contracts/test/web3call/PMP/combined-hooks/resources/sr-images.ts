import { readFileSync } from "fs";
import { join } from "path";

// Load raw data from JSON files
const lowEntropyData = JSON.parse(
  readFileSync(join(__dirname, "low-entropy.json"), "utf8")
);
const highEntropyData = JSON.parse(
  readFileSync(join(__dirname, "high-entropy.json"), "utf8")
);
const typicalData = JSON.parse(
  readFileSync(join(__dirname, "typical.json"), "utf8")
);
const typical2Data = JSON.parse(
  readFileSync(join(__dirname, "typical2.json"), "utf8")
);
const typical3Data = JSON.parse(
  readFileSync(join(__dirname, "typical3.json"), "utf8")
);

// Export raw data
export const lowEntropy64x64Raw = lowEntropyData.raw;
export const highEntropy64x64Raw = highEntropyData.raw;
export const typical64x64Raw = typicalData.raw;
export const typical64x64Raw2 = typical2Data.raw;
export const typical64x64Raw3 = typical3Data.raw;

// Load and export gzipped data
const lowEntropy64x64GzipBuffer = readFileSync(
  join(__dirname, "low-entropy.gz")
);
export const lowEntropy64x64Gzip = new Uint8Array(lowEntropy64x64GzipBuffer);

const highEntropy64x64GzipBuffer = readFileSync(
  join(__dirname, "high-entropy.gz")
);
export const highEntropy64x64Gzip = new Uint8Array(highEntropy64x64GzipBuffer);

export const typical64x64GzipBuffer = readFileSync(
  join(__dirname, "typical.gz")
);
export const typical64x64Gzip = new Uint8Array(typical64x64GzipBuffer);

export const typical64x64Gzip2Buffer = readFileSync(
  join(__dirname, "typical2.gz")
);
export const typical64x64Gzip2 = new Uint8Array(typical64x64Gzip2Buffer);

export const typical64x64Gzip3Buffer = readFileSync(
  join(__dirname, "typical3.gz")
);
export const typical64x64Gzip3 = new Uint8Array(typical64x64Gzip3Buffer);
