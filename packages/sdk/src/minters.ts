import {
  ConfigurationSchema,
  FormFieldSchema,
  OnChainCompoundNonArrayFormFieldSchema,
  OnChainFormFieldSchema,
  OnChainNonArrayFormFieldSchema,
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
    ? (({ project_id, ...rest }) => rest)(schema.properties)
    : undefined;

  // If required is defined, filter out projectId
  const required = schema.required
    ? schema.required.filter((item) => item !== "project_id")
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
    args: ["project_id", "minter.address"],
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
    title: "Linear Dutch Auction Configuration Form",
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
            "project_id",
            "extra_minter_details.endTime",
            "extra_minter_details.startTime",
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
          project_id: {
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
          "project_id",
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
          args: ["project_id"],
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
          project_id: {
            type: "string",
            title: "Project ID",
          },
        },
      },
    },
    additionalProperties: true,
  },
};
