export const iSharedMinterHolderV0Abi = [
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
        name: "ownedNFTAddress",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "ownedNFTTokenId",
        type: "uint256",
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
    stateMutability: "payable",
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
        internalType: "address",
        name: "ownedNFTAddress",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "ownedNFTTokenId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "vault",
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
    stateMutability: "payable",
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
        internalType: "address",
        name: "ownedNFTAddress",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "ownedNFTTokenId",
        type: "uint256",
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
    stateMutability: "payable",
    type: "function",
  },
] as const;
