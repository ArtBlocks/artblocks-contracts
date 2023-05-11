// empirically have found adding 10 seconds between txs in scripts is enough to
// avoid chain reorgs and tx failures
export const EXTRA_DELAY_BETWEEN_TX = 10000; // ms

// delegation registry addresses on supported networks
export const DELEGATION_REGISTRY_ADDRESSES = {
  // note: same address for goerli and mainnet
  goerli: "0x00000000000076A84feF008CDAbe6409d2FE638B",
  mainnet: "0x00000000000076A84feF008CDAbe6409d2FE638B",
};

// BytecodeStorageReader library addresses on supported networks
export const BYTECODE_STORAGE_READER_LIBRARY_ADDRESSES = {
  // note: _different_ address for goerli and mainnet
  goerli: "0xB8B806A10d16cc80dB788552B54B3ECb4A2A3C3D",
  mainnet: "0xf0585dF582A0ad119F1616FB82f3b449a98EeCd5",
};

// known V3 engine registry contracts, and their deployers
// format is [network]: { [registry address]: [deployer address] }
export const KNOWN_ENGINE_REGISTRIES = {
  goerli: {
    // [INDEXED] goerli staging registry, indexed in staging subgraph | deployer: staging deployer wallet
    "0xEa698596b6009A622C3eD00dD5a8b5d1CAE4fC36":
      "0xB8559AF91377e5BaB052A4E9a5088cB65a9a4d63",

    // [INDEXED] goerli dev registry, indexed in dev subgraph | deployer: dev admin wallet
    "0x2A39132E8d594d2c840D6656327fB26d900C05bA":
      "0x2246475beddf9333b6a6D9217194576E7617Afd1",

    // [NOT INDEXED] goerli dev admin wallet, not indexed in any subgraphs (for testing only) | deployer: dev admin wallet
    "0x263113c07CB69eE047E6572E135E8C3C6302feFE":
      "0x2246475beddf9333b6a6D9217194576E7617Afd1",
  },
  mainnet: {
    // [INDEXED] mainnet registry, indexed in mainnet subgraph | deployer: mainnet deployer wallet
    "0x652490c8BB6e7ec3Fd798537D2F348D7904BBbc2":
      "0xB8559AF91377e5BaB052A4E9a5088cB65a9a4d63",
  },
  "arbitrum-goerli": {
    // [INDEXED] arbitrum goerli dev | deployer: lindsay dev wallet
    "0x429af8eE97750aaddE1e8df9e921e11406ff9ed2":
      "0x3b9038fa89783CBA1933c1689043b4dae2032d1c",
  },
};
