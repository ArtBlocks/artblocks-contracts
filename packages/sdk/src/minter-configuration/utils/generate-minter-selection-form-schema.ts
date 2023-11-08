import { OnChainCompoundNonArrayFormFieldSchema } from "../../json-schema";

export function generateMinterSelectionFormSchema(
  shared: boolean
): OnChainCompoundNonArrayFormFieldSchema {
  const args = ["projectIndex", "minter.address"];
  const inputs = [
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
  ];

  if (shared) {
    args.splice(1, 0, "coreContractAddress");
    inputs.splice(1, 0, {
      internalType: "address",
      name: "_coreContract",
      type: "address",
    });
  }

  return {
    title: "Set Minter For Project",
    type: "object",
    compound: true,
    compoundBehavior: "transactionGroup",
    onChain: true,
    transactionDetails: {
      functionName: "setMinterForProject",
      args,
      abi: [
        {
          inputs,
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
}
