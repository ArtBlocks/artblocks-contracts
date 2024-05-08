export const iSharedMinterDAExpSettlementV0Abi = [
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
    name: "getNumSettleableInvocations",
    outputs: [
      {
        internalType: "uint256",
        name: "numSettleableInvocations",
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
        internalType: "address",
        name: "walletAddress",
        type: "address",
      },
    ],
    name: "getProjectExcessSettlementFunds",
    outputs: [
      {
        internalType: "uint256",
        name: "excessSettlementFundsInWei",
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
    name: "getProjectLatestPurchasePrice",
    outputs: [
      {
        internalType: "uint256",
        name: "latestPurchasePrice",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "minimumPriceDecayHalfLifeSeconds",
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
    ],
    name: "reclaimProjectExcessSettlementFunds",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "minimumPriceDecayHalfLifeSeconds",
        type: "uint256",
      },
    ],
    name: "setMinimumPriceDecayHalfLifeSeconds",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
