import MerkleTree from "merkletreejs";
import { Hex, encodePacked, keccak256 } from "viem";

// Convert a string representation of a list of addresses (either comma or newline separated)
// into an array of addresses
export function textOrCsvAddressListToArray(fileContent: string) {
  // Split the content by either newline, comma, or both
  const addresses = fileContent.split(/[\r\n,]+/);

  // Trim each address to remove any spaces and filter out empty addresses
  const cleanedAddresses = addresses
    .map((address) => address.trim())
    .filter((address) => address !== "");

  // Join the cleaned addresses with commas
  return cleanedAddresses;
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = (e) => {
      if (!e.target) return reject(new Error("Invalid file"));
      resolve(e.target.result as string);
    };
    fr.onerror = reject;
    fr.readAsText(new Blob([file]));
  });
}

export const getMerkleRoot = (addresses: string[]): string => {
  const merkleTree = new MerkleTree(
    addresses.map((addr: string) => hashAddress(addr as Hex)),
    keccak256,
    { sortPairs: true }
  );

  const root = merkleTree.getHexRoot();
  return root;
};

export const hashAddress = (address: Hex) => {
  return Buffer.from(
    keccak256(encodePacked(["address"], [address])).slice(2),
    "hex"
  );
};
