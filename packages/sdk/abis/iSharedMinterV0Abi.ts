export const iSharedMinterV0Abi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "projectId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "coreContract",
        type: "address",
      },
    ],
    name: "getPriceInfo",
    outputs: [
      {
        internalType: "bool",
        name: "isConfigured",
        type: "bool",
      },
      {
        internalType: "uint256",
        name: "tokenPriceInWei",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "currencySymbol",
        type: "string",
      },
      {
        internalType: "address",
        name: "currencyAddress",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "projectId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "coreContract",
        type: "address",
      },
      {
        internalType: "uint24",
        name: "maxInvocations",
        type: "uint24",
      },
    ],
    name: "manuallyLimitProjectMaxInvocations",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "minterFilterAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "minterType",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "projectId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "coreContract",
        type: "address",
      },
    ],
    name: "syncProjectMaxInvocationsToCore",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
