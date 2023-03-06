// delegation registry addresses on supported networks
export const DELEGATION_REGISTRY_ADDRESSES = {
  // note: same address for goerli and mainnet
  goerli: "0x00000000000076A84feF008CDAbe6409d2FE638B",
  mainnet: "0x00000000000076A84feF008CDAbe6409d2FE638B",
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
};

// WETH token addresses on supported networks
// @dev thse are the commonly used WETH9 contracts
export const WETH_ADDRESSES = {
  goerli: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
  mainnet: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
};
