import {
  ConfigurationSchema,
  FormFieldSchema,
  OnChainCompoundNonArrayFormFieldSchema,
} from "./json-schema";
import { Maybe } from "./generated/graphql";
import { WalletClient } from "viem";
import { ZodValidationSchema } from "./utils";

export type AvailableMinter = {
  address: string;
  type: string;
};

export type ConfigurationForm = {
  formSchema: FormFieldSchema;
  initialFormValues: Record<string, any>;
  zodSchema: ZodValidationSchema;
  handleSubmit: (
    formValues: Record<string, any>,
    signer: WalletClient
  ) => Promise<void>;
};

export type SelectedMinter = AvailableMinter & {
  basePrice: Maybe<string>;
  currencyAddress: Maybe<string>;
  currencySymbol: Maybe<string>;
  extraMinterDetails: any;
  configurationForms: ConfigurationForm[];
};

export function filterProjectIdFromFormSchema(
  schema: FormFieldSchema
): FormFieldSchema {
  // If properties are defined, remove projectId
  const properties = schema.properties
    ? (({ projectIndex, ...rest }) => rest)(schema.properties)
    : undefined;

  // If required is defined, filter out projectId
  const required = schema.required
    ? schema.required.filter((item) => item !== "projectIndex")
    : undefined;

  return {
    ...schema,
    properties,
    required,
  };
}

export const minterSelectionSchema: OnChainCompoundNonArrayFormFieldSchema = {
  title: "Set Minter For Project",
  type: "object",
  compound: true,
  compoundBehavior: "transactionGroup",
  onChain: true,
  transactionDetails: {
    functionName: "setMinterForProject",
    args: ["projectIndex", "minter.address"],
    abi: [
      {
        inputs: [
          {
            internalType: "uint256",
            name: "",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "",
            type: "address",
          },
        ],
        name: "setMinterForProject",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
    ],
  },
  properties: {
    "minter.address": {
      type: "string",
      title: "Minter Address",
    },
  },
  required: ["minter.address"],
};

export const mockMinterSchemaMap: Record<string, ConfigurationSchema> = {
  MinterDALin: {
    title: "Linear Dutch Auction Minter Configuration Form",
    type: "object",
    properties: {
      setAuctionDetails: {
        title: "Set Auction Details",
        type: "object",
        compound: true,
        compoundBehavior: "transactionGroup",
        onChain: true,
        transactionDetails: {
          functionName: "setAuctionDetails",
          args: [
            "projectIndex",
            "extra_minter_details.startTime",
            "extra_minter_details.endTime",
            "extra_minter_details.startPrice",
            "base_price",
          ],
          abi: [
            {
              inputs: [
                {
                  internalType: "uint256",
                  name: "_projectId",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "_auctionTimestampStart",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "_auctionTimestampEnd",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "_startPrice",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "_basePrice",
                  type: "uint256",
                },
              ],
              name: "setAuctionDetails",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
          ],
        },
        properties: {
          projectIndex: {
            type: "integer",
            title: "Project ID",
            minimum: 1,
          },
          "extra_minter_details.startTime": {
            type: "integer",
            title: "Auction Start Timestamp",
            minimum: 0,
            default: 0,
          },
          "extra_minter_details.endTime": {
            type: "integer",
            title: "Auction End Timestamp",
            minimum: 0,
            default: 0,
          },
          "extra_minter_details.startPrice": {
            type: "integer",
            title: "Auction Start Price (wei)",
            default: 0,
          },
          base_price: {
            type: "integer",
            title: "Auction Base Price (wei)",
            default: 0,
          },
        },
        required: [
          "projectIndex",
          "extra_minter_details.auctionTimestampStart",
          "extra_minter_details.auctionTimestampEnd",
          "extra_minter_details.startPrice",
          "base_price",
        ],
      },
      resetAuctionDetails: {
        title: "Reset Auction Details",
        type: "object",
        format: "button",
        onChain: true,
        compound: true,
        compoundBehavior: "transactionGroup",
        transactionDetails: {
          functionName: "resetAuctionDetails",
          args: ["projectIndex"],
          abi: [
            {
              inputs: [
                {
                  internalType: "uint256",
                  name: "_projectId",
                  type: "uint256",
                },
              ],
              name: "resetAuctionDetails",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
          ],
        },
        properties: {
          projectIndex: {
            type: "integer",
            title: "Project ID",
          },
        },
      },
    },
    additionalProperties: true,
  },
  MinterSetPrice: {
    title: "Set Price Minter Configuration Form",
    type: "object",
    properties: {
      updatePricePerTokenInWei: {
        title: "Update Price Per Token In Wei",
        type: "object",
        onChain: true,
        transactionDetails: {
          functionName: "updatePricePerTokenInWei",
          args: ["projectIndex", "base_price"],
          abi: [
            {
              inputs: [
                {
                  internalType: "uint256",
                  name: "_projectId",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "_pricePerTokenInWei",
                  type: "uint256",
                },
              ],
              name: "updatePricePerTokenInWei",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
          ],
        },
        properties: {
          projectIndex: {
            type: "integer",
            title: "Project Index",
            minimum: 0,
          },
          base_price: {
            type: "integer",
            title: "Base Price (wei)",
            default: 0,
          },
        },
        required: ["projectIndex", "base_price"],
      },
    },
    additionalProperties: true,
  },
  MinterMerkleV5: {
    title: "Minter Configuration Form",
    type: "object",
    properties: {
      updateMerkleRoot: {
        title: "Update Merkle Root",
        type: "object",
        onChain: true,
        transactionDetails: {
          functionName: "updateMerkleRoot",
          args: ["projectIndex", "extraMinterDetails.merkleRoot"],
          abi: [
            {
              inputs: [
                {
                  internalType: "uint256",
                  name: "_projectId",
                  type: "uint256",
                },
                {
                  internalType: "bytes32",
                  name: "_root",
                  type: "bytes32",
                },
              ],
              name: "updateMerkleRoot",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
          ],
        },
        properties: {
          projectIndex: {
            type: "integer",
            title: "Project Index",
            minimum: 0,
          },
          allowListFile: {
            type: "string",
            format: "data-url",
            description: "Upload a file with the allowed addresses",
            title: "Allowed Addresses File",
            submissionProcessing: "merkleRoot",
          },
          "extra_minter_details.merkleRoot": {
            readOnly: true,
            type: "string",
            title: "Merkle Root",
          },
        },
        required: ["projectIndex", "ext"],
      },
      setProjectInvocationsPerAddress: {
        title: "Set Project Invocations Per Address",
        type: "object",
        onChain: true,
        transactionDetails: {
          functionName: "setProjectInvocationsPerAddress",
          args: ["projectIndex", "maxInvocationsPerAddress"],
          abi: [
            {
              inputs: [
                {
                  internalType: "uint256",
                  name: "_projectId",
                  type: "uint256",
                },
                {
                  internalType: "uint24",
                  name: "_maxInvocationsPerAddress",
                  type: "uint24",
                },
              ],
              name: "setProjectInvocationsPerAddress",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
          ],
        },
        properties: {
          projectIndex: {
            type: "integer",
            title: "Project Index",
            minimum: 0,
          },
          maxInvocationsPerAddress: {
            type: "integer",
            title: "Max Invocations Per Address",
            minimum: 0,
          },
        },
        required: ["projectIndex", "maxInvocationsPerAddress"],
      },
      updatePricePerTokenInWei: {
        title: "Update Price Per Token In Wei",
        type: "object",
        onChain: true,
        transactionDetails: {
          functionName: "updatePricePerTokenInWei",
          args: ["projectIndex", "base_price"],
          abi: [
            {
              inputs: [
                {
                  internalType: "uint256",
                  name: "_projectId",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "_pricePerTokenInWei",
                  type: "uint256",
                },
              ],
              name: "updatePricePerTokenInWei",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
          ],
        },
        properties: {
          projectIndex: {
            type: "integer",
            title: "Project Index",
            minimum: 0,
          },
          base_price: {
            type: "integer",
            title: "Base Price (wei)",
            default: 0,
          },
        },
        required: ["projectIndex", "base_price"],
      },
    },
    additionalProperties: true,
  },
};
