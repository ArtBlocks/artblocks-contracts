import { PublicClient } from "viem";
import { FormFieldSchema } from "../../json-schema";
import { getInitialMinterConfigurationValuesForFormField } from "./get-initial-minter-configuration-values-for-form-field";

const mockPublicClient = jest.fn() as unknown as PublicClient;

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
  it("generates initial values correctly for a simple schema", async () => {
    const projectMinterConfiguration = {
      id: "0x000-0",
      project_id: "0",
      currency_address: "0x00000",
      currency_symbol: "ETH",
      max_invocations: 3,
    };

    const result = await getInitialMinterConfigurationValuesForFormField(
      TEST_FORM_FIELD_SCHEMA,
      projectMinterConfiguration,
      mockPublicClient
    );

    expect(result).toEqual({
      max_invocations: 3,
    });
  });

  it("generates initial values correctly for a nested schema", async () => {
    const formField: FormFieldSchema = {
      ...TEST_FORM_FIELD_SCHEMA,
      properties: {
        ...TEST_FORM_FIELD_SCHEMA.properties,
        nested: {
          type: "object",
          properties: {
            prop2: { type: "number", default: 2 },
          },
        },
      },
    };

    const projectMinterConfiguration = {
      id: "0x000-0",
      project_id: "0",
      currency_address: "0x00000",
      currency_symbol: "ETH",
      nested: {
        prop2: 3,
      },
    };

    const result = await getInitialMinterConfigurationValuesForFormField(
      formField,
      projectMinterConfiguration,
      mockPublicClient
    );

    expect(result).toEqual({
      max_invocations: 1000000,
      nested: {
        prop2: 3,
      },
    });
  });

  it("falls back to default values if no configuration is provided", async () => {
    const result = await getInitialMinterConfigurationValuesForFormField(
      TEST_FORM_FIELD_SCHEMA,
      null,
      mockPublicClient
    );

    expect(result).toEqual({
      max_invocations: 1000000,
    });
  });
});
