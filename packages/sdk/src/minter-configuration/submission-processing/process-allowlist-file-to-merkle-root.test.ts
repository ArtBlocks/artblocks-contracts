/**
 * @jest-environment ./src/test-env.ts
 */
import { processAllowlistFileToMerkleRoot } from "./process-allowlist-file-to-merkle-root";
import * as merkleUtils from "../../utils/merkle";
import * as graphqlRequest from "graphql-request";
import { generateTransformProjectMinterConfigurationFormValuesArgs } from "./test-helpers";

// Mock the necessary functions
jest.mock("../../utils/merkle");
jest.mock("graphql-request");

// Mock global fetch
global.fetch = jest.fn();

describe("processAllowlistFileToMerkleRoot", () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    (graphqlRequest.request as jest.Mock).mockClear();
    (merkleUtils.getMerkleRoot as jest.Mock).mockClear();
    (merkleUtils.readFileAsText as jest.Mock).mockClear();
    (merkleUtils.textOrCsvAddressListToArray as jest.Mock).mockClear();
    (global.fetch as jest.Mock).mockClear();
  });

  it("processes a valid file and returns a merkle root", async () => {
    const args = generateTransformProjectMinterConfigurationFormValuesArgs();

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(
      new File(["content"], "filename", { type: "text/plain" })
    );
    const fakeFileList = dataTransfer.files;

    (merkleUtils.readFileAsText as jest.Mock).mockResolvedValue("content");
    (merkleUtils.textOrCsvAddressListToArray as jest.Mock).mockReturnValue([
      "address1",
      "address2",
    ]);
    (merkleUtils.getMerkleRoot as jest.Mock).mockReturnValue(
      "fake-merkle-root"
    );

    (graphqlRequest.request as jest.Mock).mockResolvedValueOnce({
      getAllowlistUploadUrl: { key: "fake-key", url: "fake-url" },
    });

    (graphqlRequest.request as jest.Mock).mockResolvedValueOnce({});

    (global.fetch as jest.Mock).mockResolvedValueOnce({});

    const result = await processAllowlistFileToMerkleRoot(fakeFileList, args);

    expect(result).toEqual("fake-merkle-root");
    expect(graphqlRequest.request).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("throws an error if the input is not a FileList", async () => {
    const args = generateTransformProjectMinterConfigurationFormValuesArgs();

    await expect(
      processAllowlistFileToMerkleRoot("not a file list", args)
    ).rejects.toThrow(
      "Unexpected form value for merkle root transformation. Please provide a text or csv file."
    );
  });

  it("throws an error if the file type is not text/plain or text/csv", async () => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(
      new File(["content"], "filename", { type: "application/json" })
    );
    const fakeFileList = dataTransfer.files;

    const args = generateTransformProjectMinterConfigurationFormValuesArgs();

    await expect(
      processAllowlistFileToMerkleRoot(fakeFileList, args)
    ).rejects.toThrow(
      "Unexpected file type for merkle root transformation. Please provide a text or csv file."
    );
  });

  it("throws an error if the server response is unexpected", async () => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(
      new File(["content"], "filename", { type: "text/plain" })
    );
    const fakeFileList = dataTransfer.files;

    const args = generateTransformProjectMinterConfigurationFormValuesArgs();

    (merkleUtils.readFileAsText as jest.Mock).mockResolvedValue("content");
    (merkleUtils.textOrCsvAddressListToArray as jest.Mock).mockReturnValue([
      "address1",
      "address2",
    ]);
    (merkleUtils.getMerkleRoot as jest.Mock).mockReturnValue(
      "fake-merkle-root"
    );

    (graphqlRequest.request as jest.Mock).mockResolvedValueOnce({});

    await expect(
      processAllowlistFileToMerkleRoot(fakeFileList, args)
    ).rejects.toThrow("Unexpected response from server. Please try again.");
  });

  it("throws an error if the file upload fails", async () => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(
      new File(["content"], "filename", { type: "text/plain" })
    );
    const fakeFileList = dataTransfer.files;

    const args = generateTransformProjectMinterConfigurationFormValuesArgs();

    (merkleUtils.readFileAsText as jest.Mock).mockResolvedValue("content");
    (merkleUtils.textOrCsvAddressListToArray as jest.Mock).mockReturnValue([
      "address1",
      "address2",
    ]);
    (merkleUtils.getMerkleRoot as jest.Mock).mockReturnValue(
      "fake-merkle-root"
    );

    (graphqlRequest.request as jest.Mock).mockResolvedValueOnce({
      getAllowlistUploadUrl: { key: "fake-key", url: "fake-url" },
    });

    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("Upload failed")
    );

    await expect(
      processAllowlistFileToMerkleRoot(fakeFileList, args)
    ).rejects.toThrow("Unexpected error uploading allowlist file");
  });
});
