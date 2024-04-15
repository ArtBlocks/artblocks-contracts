import { BaseFormFieldSchema, FormFieldSchema } from "../json-schema";
import { processFormSchema } from "./process-form-schema";

function getTestSchema(): FormFieldSchema {
  return {
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
  };
}

describe("processFormSchema", () => {
  it("should remove projectIndex and coreContractAddress from properties and required array", () => {
    const schema: FormFieldSchema = getTestSchema();
    const processedSchema = processFormSchema(schema);
    expect(processedSchema.properties).not.toHaveProperty("projectIndex");
    expect(processedSchema.properties).not.toHaveProperty(
      "coreContractAddress"
    );
    expect(processedSchema.required).toEqual([
      "extra_minter_details.startTime",
      "extra_minter_details.approximateDAExpEndTime",
      "extra_minter_details.startPrice",
      "base_price",
    ]);
  });

  it("should order properties based on ui:order, excluding removed ones", () => {
    const schema = getTestSchema();
    const processedSchema = processFormSchema(schema);
    const expectedOrder = [
      "extra_minter_details.startPrice",
      "base_price",
      "extra_minter_details.startTime",
      "extra_minter_details.approximateDAExpEndTime",
    ];
    expect(
      Object.keys(
        processedSchema.properties as Record<string, BaseFormFieldSchema>
      )
    ).toEqual(expectedOrder);
  });

  it("should handle nested objects and order them based on ui:order", () => {
    const schema = getTestSchema();
    schema.properties = {
      ...schema.properties,
      parent: {
        type: "object",
        properties: {
          child2: { type: "string" },
          child1: { type: "string" },
        },
        required: ["child1", "child2"],
        "ui:order": ["child1", "child2"],
      },
    };
    const processedSchema = processFormSchema(schema);
    expect(
      Object.keys(
        processedSchema.properties?.parent?.properties as Record<
          string,
          BaseFormFieldSchema
        >
      )
    ).toEqual(["child1", "child2"]);
  });

  it("should retain original order if ui:order is not specified, excluding removed ones", () => {
    const { ["ui:order"]: _, ...schema } = getTestSchema();
    const processedSchema = processFormSchema(schema);
    expect(
      Object.keys(
        processedSchema.properties as Record<string, BaseFormFieldSchema>
      )
    ).toEqual([
      "base_price",
      "extra_minter_details.startTime",
      "extra_minter_details.startPrice",
      "extra_minter_details.approximateDAExpEndTime",
    ]);
  });
});
