import { ConfigurationSchema, FormFieldSchema } from "./json-schema";
import { Maybe } from "./generated/graphql";
import { WalletClient } from "viem";
import { ZodValidationSchema } from "./utils";

export type AvailableMinter = {
  address: string;
  type: string;
};

export type SelectedMinter = AvailableMinter & {
  basePrice: Maybe<string>;
  currencyAddress: Maybe<string>;
  currencySymbol: Maybe<string>;
  extraMinterDetails: any;
  configurationForms: {
    formSchema: FormFieldSchema;
    zodSchema: ZodValidationSchema;
    handleSubmit: (
      args: Record<string, any>,
      signer: WalletClient
    ) => Promise<void>;
  }[];
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

export const mockMinterSchemaMap: Record<string, ConfigurationSchema> = {
  MinterDALin: {
    $id: "https://example.com/schemas/setAuctionDetails.json",
    title: "Linear Dutch Auction Configuration Form",
    type: "object",
    properties: {
      setAuctionDetails: {
        displayName: "Set Auction Details",
        type: "object",
        compound: true,
        compoundBehavior: "transactionGroup",
        onChain: true,
        transactionDetails: {
          functionName: "setAuctionDetails",
          args: [
            "project_id",
            "extraMinterDetails.auctionTimestampStart",
            "extraMinterDetails.auctionTimestampEnd",
            "extraMinterDetails.startPrice",
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
            displayName: "Project ID",
            minimum: 1,
          },
          auctionTimestampStart: {
            type: "integer",
            displayName: "Auction Start Timestamp",
            minimum: 0,
          },
          priceDecayHalfLifeSeconds: {
            type: "integer",
            displayName: "Price Decay Half-Life (seconds)",
            minimum: 0,
          },
          startPrice: {
            type: "integer",
            displayName: "Auction Start Price (wei)",
          },
          basePrice: {
            type: "integer",
            displayName: "Auction Base Price (wei)",
          },
        },
        required: [
          "project_id",
          "auctionTimestampStart",
          "priceDecayHalfLifeSeconds",
          "startPrice",
          "basePrice",
        ],
      },
      resetAuctionDetails: {
        displayName: "Reset Auction Details",
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
            displayName: "Project ID",
          },
        },
      },
    },
    additionalProperties: true,
  },
};
