import { FormFieldSchema } from "../../json-schema";
import { getInitialMinterConfigurationValuesForFormField } from "./get-initial-minter-configuration-values-for-form-field";

const TEST_FORM_FIELD_SCHEMA: FormFieldSchema = {
  type: "object",
  title: "Manually limit project max invocations",
  onChain: true,
  transactionDetails: {
    functionName: "manuallyLimitProjectMaxInvocations",
    args: ["projectIndex", "coreContractAddress", "max_invocations"],
    abi: [
      {
        inputs: [
          {
            internalType: "uint256",
            name: "_projectId",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "_coreContract",
            type: "address",
          },
          {
            internalType: "uint24",
            name: "_maxInvocations",
            type: "uint24",
          },
        ],
        name: "manuallyLimitProjectMaxInvocations",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
    ],
  },
  properties: {
    projectIndex: {
      type: "integer",
      title: "Project index",
      minimum: 0,
    },
    coreContractAddress: {
      type: "string",
      title: "Core contract address",
    },
    max_invocations: {
      type: "number",
      title: "Max invocations",
      minimum: 0,
      multipleOf: 1,
      default: 1000000,
    },
  },
  required: ["projectIndex", "coreContractAddress", "max_invocations"],
};

describe("getInitialMinterConfigurationValuesForFormField", () => {
  it("generates initial values correctly for a simple schema", () => {
    const projectMinterConfiguration = {
      id: "0x000-0",
      project_id: "0",
      currency_address: "0x00000",
      currency_symbol: "ETH",
    };

    const result = getInitialMinterConfigurationValuesForFormField(
      TEST_FORM_FIELD_SCHEMA,
      projectMinterConfiguration
    );

    expect(result).toEqual({
      prop1: "value1",
      prop2: 3,
    });
  });

  it("generates initial values correctly for a nested schema", () => {
    const formField = {
      type: "object",
      properties: {
        prop1: { type: "string", default: "default1" },
        nested: {
          type: "object",
          properties: {
            prop2: { type: "number", default: 2 },
          },
        },
      },
    };

    const projectMinterConfiguration = {
      prop1: "value1",
      nested: {
        prop2: 3,
      },
    };

    const result = getInitialMinterConfigurationValuesForFormField(
      formField,
      projectMinterConfiguration
    );

    expect(result).toEqual({
      prop1: "value1",
      "nested.prop2": 3,
    });
  });

  it("falls back to default values if no configuration is provided", () => {
    const formField = {
      type: "object",
      properties: {
        prop1: { type: "string", default: "default1" },
        prop2: { type: "number", default: 2 },
      },
    };

    const result = getInitialMinterConfigurationValuesForFormField(
      formField,
      null
    );

    expect(result).toEqual({
      prop1: "default1",
      prop2: 2,
    });
  });
});
