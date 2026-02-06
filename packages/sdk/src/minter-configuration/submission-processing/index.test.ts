/**
 * @jest-environment ./src/test-env.ts
 */
import { parseEther, parseUnits, PublicClient } from "viem";
import { processProjectMinterConfigurationFormValuesForSubmission } from "./index";
import { processAllowlistFileToMerkleRoot } from "./process-allowlist-file-to-merkle-root";
import { processProjectContractTokenHolderList } from "./process-project-contract-token-holder-list";
import { generateTransformProjectMinterConfigurationFormValuesArgs } from "./test-helpers";
import { processAuctionDetailsToHalfLifeSeconds } from "./process-auction-details-to-half-life-seconds";
import { generateRandomAddress } from "../../utils/test-helpers";

// Mock the necessary functions
jest.mock("./process-allowlist-file-to-merkle-root");
jest.mock("./process-project-contract-token-holder-list");
jest.mock("./process-auction-details-to-half-life-seconds");
jest.mock("graphql-request");

// Mock global fetch
global.fetch = jest.fn();

describe("processProjectMinterConfigurationFormValuesForSubmission", () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
  });

  it("does merkleRoot submissionProcessing", async () => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(
      new File(["content"], "filename", { type: "text/plain" })
    );
    const fakeFileList = dataTransfer.files;

    const args = generateTransformProjectMinterConfigurationFormValuesArgs({
      formValues: {
        allowlistFile: fakeFileList,
      },
      schema: {
        type: "object",
        title: "Update merkle root",
        onChain: true,
        required: ["allowlistFile"],
        properties: {
          allowlistFile: {
            type: "string",
            title: "Allowlist file",
            default: "",
            "ui:widget": "file",
            description:
              "Please upload a comma-separated .txt or .csv file of ETH addresses who may purchase mints",
            submissionProcessing: "merkleRoot",
          },
        },
        transactionDetails: {
          abi: [
            {
              name: "updateMerkleRoot",
              type: "function",
              inputs: [
                {
                  name: "_projectId",
                  type: "uint256",
                  internalType: "uint256",
                },
                {
                  name: "_coreContract",
                  type: "address",
                  internalType: "address",
                },
                {
                  name: "_root",
                  type: "bytes32",
                  internalType: "bytes32",
                },
              ],
              outputs: [],
              stateMutability: "nonpayable",
            },
          ],
          args: ["projectIndex", "coreContractAddress", "allowlistFile"],
          functionName: "updateMerkleRoot",
          syncCheckFieldsOverride: ["extra_minter_details.merkleRoot"],
        },
      },
    });

    (processAllowlistFileToMerkleRoot as jest.Mock).mockResolvedValue(
      "fake-merkle-root"
    );

    const result =
      await processProjectMinterConfigurationFormValuesForSubmission(args);

    const processAllowlistFileToMerkleRootCall = (
      processAllowlistFileToMerkleRoot as jest.Mock
    ).mock.calls[0];
    expect(processAllowlistFileToMerkleRootCall[0]).toBe(fakeFileList);
    expect(processAllowlistFileToMerkleRootCall[1]).toEqual(args);
    expect(result).toEqual({ allowlistFile: "fake-merkle-root" });
  });

  it("does tokenHolderAllowlist submissionProcessing", async () => {
    const allowlistedAddressAndProjectId = ["0x1-1", "0x1-2"];
    const args = generateTransformProjectMinterConfigurationFormValuesArgs({
      formValues: {
        "extra_minter_details.allowlistedAddressAndProjectId":
          allowlistedAddressAndProjectId,
      },
      schema: {
        type: "object",
        title: "Add/remove allowed projects",
        onChain: true,
        required: ["extra_minter_details.allowlistedAddressAndProjectId"],
        properties: {
          "extra_minter_details.allowlistedAddressAndProjectId": {
            type: "array",
            items: {
              type: "string",
            },
            title: "Allowed projects",
            description:
              "Addresses and project IDs that are allowed to mint in the format <core contract address>-<project ID>",
            submissionProcessing: "tokenHolderAllowlist",
          },
        },
        transactionDetails: {
          abi: [
            {
              name: "allowAndRemoveHoldersOfProjects",
              type: "function",
              inputs: [
                {
                  name: "_projectId",
                  type: "uint256",
                  internalType: "uint256",
                },
                {
                  name: "_coreContract",
                  type: "address",
                  internalType: "address",
                },
                {
                  name: "_ownedNFTAddressesAdd",
                  type: "address[]",
                  internalType: "address[]",
                },
                {
                  name: "_ownedNFTProjectIdsAdd",
                  type: "uint256[]",
                  internalType: "uint256[]",
                },
                {
                  name: "_ownedNFTAddressesRemove",
                  type: "address[]",
                  internalType: "address[]",
                },
                {
                  name: "_ownedNFTProjectIdsRemove",
                  type: "uint256[]",
                  internalType: "uint256[]",
                },
              ],
              outputs: [],
              stateMutability: "nonpayable",
            },
          ],
          args: [
            "projectIndex",
            "coreContractAddress",
            "ownedNFTAddressesAdd",
            "ownedNFTProjectIdsAdd",
            "ownedNFTAddressesRemove",
            "ownedNFTProjectIdsRemove",
          ],
          functionName: "allowAndRemoveHoldersOfProjects",
          syncCheckFieldsOverride: [
            "extra_minter_details.allowlistedAddressAndProjectId",
          ],
        },
      },
    });

    (processProjectContractTokenHolderList as jest.Mock).mockReturnValue({
      ownedNFTAddressesAdd: ["0x1"],
      ownedNFTProjectIdsAdd: ["2"],
      ownedNFTAddressesRemove: ["0x2"],
      ownedNFTProjectIdsRemove: ["1"],
    });

    const result =
      await processProjectMinterConfigurationFormValuesForSubmission(args);

    expect(processProjectContractTokenHolderList).toHaveBeenCalledWith(
      allowlistedAddressAndProjectId,
      args
    );
    expect(result).toEqual({
      extra_minter_details: {
        allowlistedAddressAndProjectId: allowlistedAddressAndProjectId,
      },
      ownedNFTAddressesAdd: ["0x1"],
      ownedNFTProjectIdsAdd: ["2"],
      ownedNFTAddressesRemove: ["0x2"],
      ownedNFTProjectIdsRemove: ["1"],
    });
  });
  it("does ethToWei submissionProcessing", async () => {
    const args = generateTransformProjectMinterConfigurationFormValuesArgs({
      formValues: {
        base_price: "1",
      },
      schema: {
        type: "object",
        title: "Update price per token in ETH",
        onChain: true,
        required: ["base_price"],
        properties: {
          base_price: {
            type: "number",
            title: "Base price in display unit (e.g. ether)",
            default: "",
            displayProcessing: "weiToEth",
            submissionProcessing: "ethToWei",
          },
        },
        transactionDetails: {
          abi: [
            {
              name: "updatePricePerTokenInWei",
              type: "function",
              inputs: [
                {
                  name: "_projectId",
                  type: "uint256",
                  internalType: "uint256",
                },
                {
                  name: "_coreContract",
                  type: "address",
                  internalType: "address",
                },
                {
                  name: "_pricePerTokenInWei",
                  type: "uint248",
                  internalType: "uint248",
                },
              ],
              outputs: [],
              stateMutability: "nonpayable",
            },
          ],
          args: ["projectIndex", "coreContractAddress", "base_price"],
          functionName: "updatePricePerTokenInWei",
        },
      },
    });

    const result =
      await processProjectMinterConfigurationFormValuesForSubmission(args);
    expect(result).toEqual({ base_price: parseEther("1") });
  });
  it("does ethToWei submissionProcessing for ERC-20 currency", async () => {
    const args = generateTransformProjectMinterConfigurationFormValuesArgs({
      formValues: {
        base_price: 1,
      },
      schema: {
        type: "object",
        title: "Update price per token in ETH",
        onChain: true,
        required: ["base_price"],
        properties: {
          base_price: {
            type: "number",
            title: "Base price in display unit (e.g. ether)",
            default: "",
            displayProcessing: "weiToEth",
            submissionProcessing: "ethToWei",
          },
        },
        transactionDetails: {
          abi: [
            {
              name: "updatePricePerTokenInWei",
              type: "function",
              inputs: [
                {
                  name: "_projectId",
                  type: "uint256",
                  internalType: "uint256",
                },
                {
                  name: "_coreContract",
                  type: "address",
                  internalType: "address",
                },
                {
                  name: "_pricePerTokenInWei",
                  type: "uint248",
                  internalType: "uint248",
                },
              ],
              outputs: [],
              stateMutability: "nonpayable",
            },
          ],
          args: ["projectIndex", "coreContractAddress", "base_price"],
          functionName: "updatePricePerTokenInWei",
        },
      },
    });

    args.minterConfiguration.currency_address = generateRandomAddress();
    const mockReadContract = jest.fn();
    const mockPublicClient = {
      readContract: mockReadContract,
    } as unknown as PublicClient;
    args.clientContext.publicClientResolver = () => mockPublicClient;

    const decimals = 6;
    mockReadContract.mockResolvedValue(decimals);

    const result =
      await processProjectMinterConfigurationFormValuesForSubmission(args);
    expect(result).toEqual({ base_price: parseUnits("1", decimals) });
  });
  it("does datetimeToUnixTimestamp submissionProcessing", async () => {
    const args = generateTransformProjectMinterConfigurationFormValuesArgs({
      formValues: {
        extra_minter_details: {
          startTime: "2021-01-01T00:00:00.000Z",
        },
      },
      schema: {
        type: "object",
        title: "Set auction details",
        onChain: true,
        required: ["extra_minter_details.startTime"],
        properties: {
          "extra_minter_details.startTime": {
            type: "string",
            title: "Start time",
            format: "date-time",
            default: "",
            displayProcessing: "unixTimestampToDatetime",
            submissionProcessing: "datetimeToUnixTimestamp",
          },
        },
        transactionDetails: {
          abi: [
            {
              name: "setAuctionDetails",
              type: "function",
              inputs: [
                {
                  name: "_projectId",
                  type: "uint256",
                  internalType: "uint256",
                },
                {
                  name: "_coreContract",
                  type: "address",
                  internalType: "address",
                },
                {
                  name: "_auctionTimestampStart",
                  type: "uint40",
                  internalType: "uint40",
                },
                {
                  name: "_halfLifeSeconds",
                  type: "uint40",
                  internalType: "uint40",
                },
                {
                  name: "_startPrice",
                  type: "uint256",
                  internalType: "uint256",
                },
                {
                  name: "_basePrice",
                  type: "uint256",
                  internalType: "uint256",
                },
              ],
              outputs: [],
              stateMutability: "nonpayable",
            },
          ],
          args: [
            "projectIndex",
            "coreContractAddress",
            "extra_minter_details.startTime",
            "extra_minter_details.approximateDAExpEndTime",
            "extra_minter_details.startPrice",
            "base_price",
          ],
          functionName: "setAuctionDetails",
        },
      },
    });

    const result =
      await processProjectMinterConfigurationFormValuesForSubmission(args);

    expect(result).toEqual({
      extra_minter_details: {
        startTime: 1609459200,
      },
    });
  });
  it("does auctionEndDatetimeToHalfLifeSeconds submissionProcessing", async () => {
    const args = generateTransformProjectMinterConfigurationFormValuesArgs({
      formValues: {
        extra_minter_details: {
          approximateDAExpEndTime: "2021-01-02T00:00:00.000Z",
          startTime: "2021-01-01T00:00:00.000Z",
          startPrice: "2",
        },
        base_price: "1",
      },
      schema: {
        type: "object",
        title: "Set auction details",
        onChain: true,
        required: [
          "extra_minter_details.startTime",
          "extra_minter_details.approximateDAExpEndTime",
          "extra_minter_details.startPrice",
          "base_price",
        ],
        "ui:order": [
          "extra_minter_details.startPrice",
          "base_price",
          "extra_minter_details.startTime",
          "extra_minter_details.approximateDAExpEndTime",
        ],
        properties: {
          base_price: {
            type: "number",
            title: "Ending price",
            format: "ETH",
            default: 0,
            displayProcessing: "weiToEth",
            submissionProcessing: "ethToWei",
          },
          "extra_minter_details.startTime": {
            type: "string",
            title: "Start time",
            format: "date-time",
            default: "",
            displayProcessing: "unixTimestampToDatetime",
            submissionProcessing: "datetimeToUnixTimestamp",
          },
          "extra_minter_details.startPrice": {
            type: "number",
            title: "Starting price",
            format: "ETH",
            default: 0,
            displayProcessing: "weiToEth",
            submissionProcessing: "ethToWei",
          },
          "extra_minter_details.approximateDAExpEndTime": {
            type: "string",
            title: "End time",
            format: "date-time",
            displayProcessing: "unixTimestampToDatetime",
            submissionProcessing: "auctionEndDatetimeToHalfLifeSeconds",
          },
        },
        transactionDetails: {
          abi: [
            {
              name: "setAuctionDetails",
              type: "function",
              inputs: [
                {
                  name: "_projectId",
                  type: "uint256",
                  internalType: "uint256",
                },
                {
                  name: "_coreContract",
                  type: "address",
                  internalType: "address",
                },
                {
                  name: "_auctionTimestampStart",
                  type: "uint40",
                  internalType: "uint40",
                },
                {
                  name: "_halfLifeSeconds",
                  type: "uint40",
                  internalType: "uint40",
                },
                {
                  name: "_startPrice",
                  type: "uint256",
                  internalType: "uint256",
                },
                {
                  name: "_basePrice",
                  type: "uint256",
                  internalType: "uint256",
                },
              ],
              outputs: [],
              stateMutability: "nonpayable",
            },
          ],
          args: [
            "projectIndex",
            "coreContractAddress",
            "extra_minter_details.startTime",
            "extra_minter_details.approximateDAExpEndTime",
            "extra_minter_details.startPrice",
            "base_price",
          ],
          functionName: "setAuctionDetails",
        },
      },
    });

    (processAuctionDetailsToHalfLifeSeconds as jest.Mock).mockReturnValue(
      "86400" // 24 hours in seconds
    );

    const result =
      await processProjectMinterConfigurationFormValuesForSubmission(args);

    expect(processAuctionDetailsToHalfLifeSeconds).toHaveBeenCalledWith(args);
    expect(result).toEqual({
      extra_minter_details: {
        startTime: 1609459200,
        approximateDAExpEndTime: "86400",
        startPrice: parseEther("2"),
      },
      base_price: parseEther("1"),
    });
  });
});
