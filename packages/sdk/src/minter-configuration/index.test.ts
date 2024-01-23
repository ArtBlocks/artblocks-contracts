import { generateProjectMinterConfigurationForms } from "./index";
import ArtBlocksSDK from "..";
import request from "graphql-request";
import { PublicClient } from "viem";

jest.mock("graphql-request");

describe("generateProjectMinterConfigurationForms", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const sdk = new ArtBlocksSDK({
    publicClient: {} as PublicClient,
    graphqlEndpoint: "https://test.com/graphql",
    jwt: "your-jwt",
  });

  const projectId = "0x00-0";
  const [, projectIndex] = projectId.split("-");

  describe("generateProjectMinterConfigurationForms", () => {
    it("should throw an error if the project does not exist", async () => {
      (request as jest.Mock).mockResolvedValueOnce({
        projects_metadata_by_pk: null,
      });
      await expect(
        generateProjectMinterConfigurationForms({
          projectId,
          onConfigurationChange: jest.fn(),
          sdk: sdk,
        })
      ).rejects.toThrow(`Could not find project with id ${projectId}`);
    });

    it("should throw an error if the project does not have a minter filter", async () => {
      (request as jest.Mock).mockResolvedValueOnce({
        projects_metadata_by_pk: {
          project_id: projectIndex,
          contract: {
            minter_filter: null,
          },
        },
      });
      await expect(
        generateProjectMinterConfigurationForms({
          projectId,
          onConfigurationChange: jest.fn(),
          sdk: sdk,
        })
      ).rejects.toThrow(
        `Project with id ${projectId} is not on a contract with an associated minter filter`
      );
    });

    it("returns just the minter selection form if the project has no minter specified", async () => {
      //
      const { minter_configuration, ...mockProjectData } =
        TEST_RESPONSE.projects_metadata_by_pk;
      (request as jest.Mock).mockResolvedValueOnce({
        projects_metadata_by_pk: mockProjectData,
      });
      const { forms } = await generateProjectMinterConfigurationForms({
        projectId,
        onConfigurationChange: jest.fn(),
        sdk: sdk,
      });

      expect(forms.length).toEqual(1);
      expect(forms[0].key).toEqual("setMinterForProject");
    });
    it("returns only the minter selection form if the project minter has no configuration schema", async () => {
      const mockProjectData = { ...TEST_RESPONSE };
      console.log(mockProjectData);
      mockProjectData.projects_metadata_by_pk.minter_configuration.minter.type.project_configuration_schema =
        {} as any;
      (request as jest.Mock).mockResolvedValueOnce(mockProjectData);
      const { forms } = await generateProjectMinterConfigurationForms({
        projectId,
        onConfigurationChange: jest.fn(),
        sdk: sdk,
      });

      expect(forms.length).toEqual(1);
      expect(forms[0].key).toEqual("setMinterForProject");
    });
  });
});

const TEST_RESPONSE = {
  projects_metadata_by_pk: {
    project_id: "0",
    user_is_artist: false,
    contract: {
      user_is_allowlisted: false,
      minter_filter: {
        type: "MinterFilterV2",
        address: "0x29e9f09244497503f304fa549d50efc751d818d2",
        globally_allowed_minters: [
          {
            address: "0x725b18673125bb1384c65a558d24a13fbb88d812",
            minter_type: "MinterDALinHolderV5",
            type: {
              label:
                "Dutch auction - linear price decrease, token holders only",
              unversioned_type: "MinterDALinHolder",
              version_number: 5,
            },
          },
          {
            address: "0x42c250c81cd2d38143a89a21cab6434092c2f52b",
            minter_type: "MinterSetPriceV5",
            type: {
              label: "Set price - ETH",
              unversioned_type: "MinterSetPrice",
              version_number: 5,
            },
          },
          {
            address: "0xfa66daa16268e9e0d7d11a3d45982077241acdb8",
            minter_type: "MinterSetPriceERC20V5",
            type: {
              label: "Set price - custom ERC20",
              unversioned_type: "MinterSetPriceERC20",
              version_number: 5,
            },
          },
          {
            address: "0x2c9939f0829f3111fd4499221f6d2a88996f6899",
            minter_type: "MinterSetPriceHolderV5",
            type: {
              label: "Set price - ETH, token holders only",
              unversioned_type: "MinterSetPriceHolder",
              version_number: 5,
            },
          },
          {
            address: "0x522fa6bd096787b9ad5e96cd8c6cc1ecae582044",
            minter_type: "MinterSetPriceMerkleV5",
            type: {
              label: "Set price - ETH, allowlisted users only",
              unversioned_type: "MinterSetPriceMerkle",
              version_number: 5,
            },
          },
          {
            address: "0xa863523c0147e82b365991f4d23ace8c1fcd93a9",
            minter_type: "MinterSetPricePolyptychV5",
            type: {
              label: "Polyptych (copy-hash) minter",
              unversioned_type: "MinterSetPricePolyptych",
              version_number: 5,
            },
          },
          {
            address: "0xf5c43cbef349787cf54422742471c770c61074a0",
            minter_type: "MinterSetPricePolyptychERC20V5",
            type: {
              label: "polyptych (copy-hash) minter - custom ERC20",
              unversioned_type: "MinterSetPricePolyptychERC20",
              version_number: 5,
            },
          },
          {
            address: "0x7856a8aef94c7d73d764e3fd71f76a44ba79f78e",
            minter_type: "MinterDAExpV5",
            type: {
              label: "Dutch auction - exponential price decrease",
              unversioned_type: "MinterDAExp",
              version_number: 5,
            },
          },
          {
            address: "0xb7ab729ea2e3e2884d3ff0bcbebcfeb0359144e2",
            minter_type: "MinterDALinV5",
            type: {
              label: "Dutch auction - linear price decrease",
              unversioned_type: "MinterDALin",
              version_number: 5,
            },
          },
          {
            address: "0x38c0ab6a9dcad4dae17b75079d8f5d3b99c97d10",
            minter_type: "MinterDAExpSettlementV3",
            type: {
              label:
                "Dutch auction (w/settlement) - exponential price decrease",
              unversioned_type: "MinterDAExpSettlement",
              version_number: 3,
            },
          },
          {
            address: "0x1ade06149c3c4992f81692447ef305d6ef82a984",
            minter_type: "MinterDAExpHolderV5",
            type: {
              label:
                "Dutch auction - exponential price decrease, token holders only",
              unversioned_type: "MinterDAExpHolder",
              version_number: 5,
            },
          },
          {
            address: "0x9fa2fde53148e0dcba6335e51bd539bedce633e4",
            minter_type: "MinterSEAV1",
            type: {
              label: "Serial English auction minter",
              unversioned_type: "MinterSEA",
              version_number: 1,
            },
          },
        ],
      },
    },
    minter_configuration: {
      currency_address: "0x0000000000000000000000000000000000000000",
      currency_symbol: "ETH",
      id: "0x7856a8aef94c7d73d764e3fd71f76a44ba79f78e-0x0e4e004e1f31b40bf4d7eefbd99d376a23065122-0",
      project_id: "0x0e4e004e1f31b40bf4d7eefbd99d376a23065122-0",
      base_price: "1000000000000000",
      max_invocations: 1000000,
      extra_minter_details: {
        startTime: 1704921654,
        startPrice: "400000000000000000",
        halfLifeSeconds: 69,
        approximateDAExpEndTime: 1704922255,
      },
      minter: {
        address: "0x7856a8aef94c7d73d764e3fd71f76a44ba79f78e",
        minter_type: "MinterDAExpV5",
        type: {
          project_configuration_schema: {
            type: "object",
            title: "Automated exponential dutch auction minter",
            properties: {
              setAuctionDetails: {
                type: "object",
                title: "Set auction details",
                onChain: true,
                required: [
                  "projectIndex",
                  "extra_minter_details.startTime",
                  "extra_minter_details.approximateDAExpEndTime",
                  "extra_minter_details.startPrice",
                  "base_price",
                  "coreContractAddress",
                ],
                "ui:order": [
                  "projectIndex",
                  "coreContractAddress",
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
                  projectIndex: {
                    type: "integer",
                    title: "Project index",
                    minimum: 0,
                  },
                  coreContractAddress: {
                    type: "string",
                    title: "Core contract address",
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
              resetAuctionDetails: {
                type: "object",
                title: "Reset auction details",
                format: "button",
                onChain: true,
                compound: true,
                required: ["projectIndex", "coreContractAddress"],
                properties: {
                  projectIndex: {
                    type: "integer",
                    title: "Project index",
                  },
                  coreContractAddress: {
                    type: "string",
                    title: "Core contract address",
                  },
                },
                compoundBehavior: "transactionGroup",
                transactionDetails: {
                  abi: [
                    {
                      name: "resetAuctionDetails",
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
                      ],
                      outputs: [],
                      stateMutability: "nonpayable",
                    },
                  ],
                  args: ["projectIndex", "coreContractAddress"],
                  functionName: "resetAuctionDetails",
                  syncCheckFieldsOverride: [
                    "extra_minter_details.startTime",
                    "extra_minter_details.endTime",
                    "extra_minter_details.startPrice",
                    "extra_minter_details.halfLifeSeconds",
                    "base_price",
                  ],
                },
              },
              manuallyLimitProjectMaxInvocations: {
                type: "object",
                title: "Manually limit project max invocations",
                onChain: true,
                required: [
                  "projectIndex",
                  "coreContractAddress",
                  "max_invocations",
                ],
                properties: {
                  projectIndex: {
                    type: "integer",
                    title: "Project index",
                    minimum: 0,
                  },
                  max_invocations: {
                    type: "number",
                    title: "Max invocations",
                    minimum: 0,
                    multipleOf: 1,
                  },
                  coreContractAddress: {
                    type: "string",
                    title: "Core contract address",
                  },
                },
                transactionDetails: {
                  abi: [
                    {
                      name: "manuallyLimitProjectMaxInvocations",
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
                          name: "_maxInvocations",
                          type: "uint24",
                          internalType: "uint24",
                        },
                      ],
                      outputs: [],
                      stateMutability: "nonpayable",
                    },
                  ],
                  args: [
                    "projectIndex",
                    "coreContractAddress",
                    "max_invocations",
                  ],
                  functionName: "manuallyLimitProjectMaxInvocations",
                },
              },
            },
            description:
              "For exponential Dutch auctions, artists specify the starting price, ending price, and the half-life for price drops. Collectors will pay more for tokens purchased earlier in the auction, and less for tokens purchased later in the auction.",
            additionalProperties: true,
          },
          unversioned_type: "MinterDAExp",
          version_number: 5,
        },
      },
    },
  },
};
