import { generateMinterSelectionFormSchema } from "./generate-minter-selection-form-schema";

describe("generateMinterSelectionFormSchema", () => {
  it("generates the correct schema when shared is false", () => {
    const result = generateMinterSelectionFormSchema(false);

    expect(result).toEqual({
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
                name: "_projectId",
                type: "uint256",
              },
              {
                internalType: "address",
                name: "_minter",
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
    });
  });

  it("generates the correct schema when shared is true", () => {
    const result = generateMinterSelectionFormSchema(true);

    expect(result).toEqual({
      title: "Set Minter For Project",
      type: "object",
      compound: true,
      compoundBehavior: "transactionGroup",
      onChain: true,
      transactionDetails: {
        functionName: "setMinterForProject",
        args: ["projectIndex", "coreContractAddress", "minter.address"],
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
                internalType: "address",
                name: "_minter",
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
    });
  });
});
