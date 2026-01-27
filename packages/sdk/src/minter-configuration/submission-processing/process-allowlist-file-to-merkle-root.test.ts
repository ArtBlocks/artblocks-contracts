/**
 * @jest-environment ./src/test-env.ts
 */
import { processAllowlistFileToMerkleRoot } from "./process-allowlist-file-to-merkle-root";
import * as merkleUtils from "../../utils/merkle";
import * as graphqlRequest from "graphql-request";
import { generateTransformProjectMinterConfigurationFormValuesArgs } from "./test-helpers";
import {
  getAllowlistUploadUrlQueryDocument,
  updateOffChainExtraMinterDetailsMutationDocument,
} from "../graphql-operations";

// Mock the necessary functions
jest.mock("../../utils/merkle", () => {
  const originalModule = jest.requireActual("../../utils/merkle");

  return {
    ...originalModule,
    getMerkleRoot: jest.fn(),
  };
});
jest.mock("graphql-request");

// Mock global fetch
global.fetch = jest.fn();

describe("processAllowlistFileToMerkleRoot", () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    (graphqlRequest.request as jest.Mock).mockClear();
    (merkleUtils.getMerkleRoot as jest.Mock).mockClear();
    (global.fetch as jest.Mock).mockClear();
  });

  it("processes a valid file and returns a merkle root", async () => {
    const args = generateTransformProjectMinterConfigurationFormValuesArgs();

    // Set up a fake file list
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(
      new File(["address1,address2"], "filename", { type: "text/plain" })
    );
    const fakeFileList = dataTransfer.files;

    // Mock the graphql request to get the url to upload the list to s3
    (
      args.clientContext.graphqlClient.request as jest.Mock
    ).mockResolvedValueOnce({
      getAllowlistUploadUrl: { key: "fake-key", url: "fake-url" },
    });

    // Mock the fetch request to upload the file to s3
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(""),
    });

    // Mock generating the merkle root
    (merkleUtils.getMerkleRoot as jest.Mock).mockReturnValue(
      "fake-merkle-root"
    );

    // Mock the graphql request to update offchain_extra_minter_details
    // with the expected merkle root and s3 file url
    (
      args.clientContext.graphqlClient.request as jest.Mock
    ).mockResolvedValueOnce({});

    const result = await processAllowlistFileToMerkleRoot(fakeFileList, args);

    // Request for the signed s3 upload url
    expect(args.clientContext.graphqlClient.request).toHaveBeenCalledWith(
      getAllowlistUploadUrlQueryDocument,
      {
        projectId: args.projectId,
      }
    );

    // Generate the merkle root from the file contents
    expect(merkleUtils.getMerkleRoot).toHaveBeenCalledWith([
      "address1",
      "address2",
    ]);

    // Upload the file to s3
    expect(global.fetch).toHaveBeenCalledWith("fake-url", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["address1", "address2"]),
    });

    // Update the offchain_extra_minter_details with the merkle root and s3 url
    expect(args.clientContext.graphqlClient.request).toHaveBeenCalledWith(
      updateOffChainExtraMinterDetailsMutationDocument,
      {
        projectMinterConfigId: args.minterConfiguration.id,
        chainId: args.project.chain_id,
        extraMinterDetails: {
          pendingMerkleRoot: "fake-merkle-root",
          pendingAllowlistedAddressesLink: "fake-url",
        },
      },
      {
        "x-hasura-role": "staff",
      }
    );

    expect(result).toEqual("fake-merkle-root");
    expect(args.clientContext.graphqlClient.request).toHaveBeenCalledTimes(2);
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
      new File(["address1,address2"], "filename", { type: "text/plain" })
    );
    const fakeFileList = dataTransfer.files;

    const args = generateTransformProjectMinterConfigurationFormValuesArgs();

    // Mock the graphql request to get the url to upload the list to s3
    // but return an unexpected response (i.e. no key or url)
    (
      args.clientContext.graphqlClient.request as jest.Mock
    ).mockResolvedValueOnce({});

    await expect(
      processAllowlistFileToMerkleRoot(fakeFileList, args)
    ).rejects.toThrow("Unexpected response from server. Please try again.");
  });

  it("throws an error if the file upload fails", async () => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(
      new File(["address1,address2"], "filename", { type: "text/plain" })
    );
    const fakeFileList = dataTransfer.files;

    const args = generateTransformProjectMinterConfigurationFormValuesArgs();

    (merkleUtils.getMerkleRoot as jest.Mock).mockReturnValue(
      "fake-merkle-root"
    );

    (
      args.clientContext.graphqlClient.request as jest.Mock
    ).mockResolvedValueOnce({
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
