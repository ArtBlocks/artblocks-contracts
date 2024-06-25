// NOTE: this does not align with an actual interface
// but it is shared across all pre-v3 settlement minters
export const iUnsharedDAExpSettlementAbi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_projectId",
        type: "uint256",
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
        internalType: "address payable",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_projectId",
        type: "uint256",
      },
    ],
    name: "reclaimProjectExcessSettlementFundsTo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256[]",
        name: "_projectIds",
        type: "uint256[]",
      },
    ],
    name: "reclaimProjectsExcessSettlementFunds",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address payable",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256[]",
        name: "_projectIds",
        type: "uint256[]",
      },
    ],
    name: "reclaimProjectsExcessSettlementFundsTo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
