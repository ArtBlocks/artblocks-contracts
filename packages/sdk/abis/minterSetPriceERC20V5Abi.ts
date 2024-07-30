export const minterSetPriceERC20V5Abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "minterFilter",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
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
    name: "checkYourAllowanceOfProjectERC20",
    outputs: [
      {
        internalType: "uint256",
        name: "remaining",
        type: "uint256",
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
    ],
    name: "getYourBalanceOfProjectERC20",
    outputs: [
      {
        internalType: "uint256",
        name: "balance",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "coreContract",
        type: "address",
      },
    ],
    name: "isEngineView",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
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
    name: "maxInvocationsProjectConfig",
    outputs: [
      {
        components: [
          {
            internalType: "bool",
            name: "maxHasBeenInvoked",
            type: "bool",
          },
          {
            internalType: "uint24",
            name: "maxInvocations",
            type: "uint24",
          },
        ],
        internalType: "struct MaxInvocationsLib.MaxInvocationsProjectConfig",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
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
    stateMutability: "view",
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
    inputs: [],
    name: "minterVersion",
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
    name: "projectMaxHasBeenInvoked",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
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
    name: "projectMaxInvocations",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
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
        internalType: "uint256",
        name: "maxPricePerToken",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "currencyAddress",
        type: "address",
      },
    ],
    name: "purchase",
    outputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
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
        internalType: "uint256",
        name: "maxPricePerToken",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "currencyAddress",
        type: "address",
      },
    ],
    name: "purchaseTo",
    outputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
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
    name: "setPriceProjectConfig",
    outputs: [
      {
        components: [
          {
            internalType: "uint248",
            name: "pricePerToken",
            type: "uint248",
          },
          {
            internalType: "bool",
            name: "priceIsConfigured",
            type: "bool",
          },
        ],
        internalType: "struct SetPriceLib.SetPriceProjectConfig",
        name: "",
        type: "tuple",
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
        internalType: "uint248",
        name: "pricePerTokenInWei",
        type: "uint248",
      },
    ],
    name: "updatePricePerTokenInWei",
    outputs: [],
    stateMutability: "nonpayable",
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
    name: "updateProjectCurrencyInfo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
