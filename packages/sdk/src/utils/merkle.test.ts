/**
 * @jest-environment ./src/test-env.ts
 */
import MerkleTree from "merkletreejs";
import {
  textOrCsvAddressListToArray,
  readFileAsText,
  getMerkleRoot,
  hashAddress,
} from "./merkle";
import { Hex, keccak256 } from "viem";
import { generateRandomAddress } from "./test-helpers";

describe("textOrCsvAddressListToArray", () => {
  it("should correctly split and trim addresses separated by commas", () => {
    const input = "0x123,0x456, 0x789";
    expect(textOrCsvAddressListToArray(input)).toEqual([
      "0x123",
      "0x456",
      "0x789",
    ]);
  });

  it("should correctly split and trim addresses separated by newlines", () => {
    const input = `0x123
0x456
0x789`;
    expect(textOrCsvAddressListToArray(input)).toEqual([
      "0x123",
      "0x456",
      "0x789",
    ]);
  });

  it("should ignore empty addresses", () => {
    const input = "0x123,,0x456,\n,0x789";
    expect(textOrCsvAddressListToArray(input)).toEqual([
      "0x123",
      "0x456",
      "0x789",
    ]);
  });
});

describe("readFileAsText", () => {
  it("should correctly read and return the content of a text file", async () => {
    // Create a fake file using DataTransfer
    const dataTransfer = new DataTransfer();
    const fakeTextContent = "address1\naddress2";
    dataTransfer.items.add(
      new File([fakeTextContent], "test.txt", { type: "text/plain" })
    );
    const fakeFile = dataTransfer.files[0];

    const textContent = await readFileAsText(fakeFile);
    expect(textContent).toBe(fakeTextContent);
  });

  it("should reject with an error if the FileReader encounters an error", async () => {
    // Create a fake file
    const dataTransfer = new DataTransfer();
    const fakeTextContent = "address1\naddress2";
    dataTransfer.items.add(
      new File([fakeTextContent], "test.txt", { type: "text/plain" })
    );
    const fakeFile = dataTransfer.files[0];

    // Spy on the FileReader's readAsText method
    const fileReaderSpy = jest.spyOn(FileReader.prototype, "readAsText");

    // Mock the FileReader's readAsText method to simulate an error
    const mockError = new DOMException("FileReader error");
    fileReaderSpy.mockImplementation(() => {
      throw mockError;
    });

    await expect(readFileAsText(fakeFile)).rejects.toThrow("FileReader error");

    // Restore the original implementation of FileReader's readAsText method
    fileReaderSpy.mockRestore();
  });

  it("should resolve with an empty string if the file is empty", async () => {
    // Create a fake empty file
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File([], "empty.txt", { type: "text/plain" }));
    const emptyFile = dataTransfer.files[0];

    const textContent = await readFileAsText(emptyFile);
    expect(textContent).toBe("");
  });
});

describe("getMerkleRoot", () => {
  it("should return the correct Merkle root for a list of addresses", () => {
    const address1 = generateRandomAddress();
    const address2 = generateRandomAddress();
    const address3 = generateRandomAddress();
    const addresses = [address1, address2, address3];
    const merkleRoot = getMerkleRoot(addresses);

    const merkleTree = new MerkleTree(
      addresses.map((addr: string) => hashAddress(addr as Hex)),
      keccak256,
      { sortPairs: true }
    );

    const expectedMerkleRoot = merkleTree.getHexRoot();
    expect(merkleRoot).toBe(expectedMerkleRoot);

    const validProof = merkleTree.getHexProof(hashAddress(address1));
    expect(
      merkleTree.verify(validProof, hashAddress(address1), merkleRoot)
    ).toBe(true);

    const badAddress = generateRandomAddress();
    const invalidProof = merkleTree.getHexProof(hashAddress(badAddress));
    expect(
      merkleTree.verify(invalidProof, hashAddress(badAddress), merkleRoot)
    ).toBe(false);
  });
});
