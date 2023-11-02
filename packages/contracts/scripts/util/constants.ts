import { ethers } from "hardhat";

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
  "arbitrum-goerli": "0x681861cD4fC92d70aE57745385065ef862954662",
  arbitrum: "0xa07f47c30C262adcC263A4D44595972c50e04db7",
  goerli: "0xB8B806A10d16cc80dB788552B54B3ECb4A2A3C3D",
  mainnet: "0xf0585dF582A0ad119F1616FB82f3b449a98EeCd5",
};

/**
 * Get active shared minter filter contract address for the given network and
 * environment.
 * @param networkName network name (e.g. "goerli", "mainnet", "arbitrum", etc.)
 * @param environment environment (e.g. "dev", "staging", "mainnet")
 * @returns active shared minter filter contract address
 */
export function getActiveSharedMinterFilter(
  networkName: string,
  environment: string
): string {
  const activeMinterFilter =
    ACTIVE_SHARED_MINTER_FILTERS[networkName]?.[environment];
  if (!activeMinterFilter) {
    throw new Error(
      `No active shared minter filter found for network ${networkName} and environment ${environment}`
    );
  }
  return activeMinterFilter;
}
// TODO: add addresses when deployed
// Active shared minter filter contracts being used for the shared minter
// suite, on each network and environment.
// format is [network]: { [environment]: [minter filter address] }
const ACTIVE_SHARED_MINTER_FILTERS = {
  goerli: {
    dev: "0x15B337C090170D56e45124ebd2Ce278a5b6Ff101",
    staging: "0xD1d9aD8B1B520F19DFE43Cc975b9470840e8b824",
  },
  mainnet: {
    mainnet: "0xTBD",
  },
  "arbitrum-goerli": {
    dev: "0xTBD",
    staging: "0xTBD",
  },
  arbitrum: {
    mainnet: "0xTBD",
  },
};

/**
 * Get active shared randomizer contract address for the given network and
 * environment.
 * @param networkName network name (e.g. "goerli", "mainnet", "arbitrum", etc.)
 * @param environment environment (e.g. "dev", "staging", "mainnet")
 * @returns active shared randomizer contract address
 */
export function getActiveSharedRandomizer(
  networkName: string,
  environment: string
): string {
  const activeSharedRandomizer =
    ACTIVE_SHARED_RANDOMIZERS[networkName]?.[environment];
  if (!activeSharedRandomizer) {
    throw new Error(
      `No active shared randomizer found for network ${networkName} and environment ${environment}`
    );
  }
  return activeSharedRandomizer;
}
// TODO: add addresses when deployed
// Active shared randomizer contracts being used for the shared minter
// suite, on each network and environment.
// format is [network]: { [environment]: [randomizer address] }
const ACTIVE_SHARED_RANDOMIZERS = {
  goerli: {
    dev: "0x16D3b6164E7F05869287CC0fE57f3EA2572178A0",
    staging: "0xC91CFC2062D8B4Ff53A7c8836CAEf925a7C78c81",
  },
  mainnet: {
    mainnet: "0xTBD",
  },
  "arbitrum-goerli": {
    dev: "0xTBD",
    staging: "0xTBD",
  },
  arbitrum: {
    mainnet: "0xTBD",
  },
};

/**
 * Gets active core registry contract address for the given network and
 * environment.
 * @dev keys off of the current core registry of the active Minter Filter for
 * the given network and environment
 * @param networkName
 * @param environment
 * @returns
 */
export async function getActiveCoreRegistry(
  networkName: string,
  environment: string
): Promise<string> {
  // get the active minter filter for the network and environment
  const activeMinterFilter = getActiveSharedMinterFilter(
    networkName,
    environment
  );
  const minterFilterFactory = await ethers.getContractFactory("MinterFilterV2");
  const minterFilter = minterFilterFactory.attach(activeMinterFilter);
  const activeCoreRegistryAddress = await minterFilter.coreRegistry();
  if (!activeCoreRegistryAddress) {
    throw new Error(
      `No active core registry found for network ${networkName} and environment ${environment}`
    );
  }
  return activeCoreRegistryAddress;
}

// DEPRECATED - use getActiveCoreRegistry after migration to shared minter suite
// deprecated V3 engine registry contracts, and their deployers
// format is [network]: { [registry address]: [deployer address] }
export const DEPRECATED_ENGINE_REGISTRIES = {
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
    // [INDEXED] arbitrum goerli staging | deployer: lindsay dev wallet
    "0x25841600e79E9A5263Ec4badcC328AD9CFE5f8C8":
      "0x3b9038fa89783CBA1933c1689043b4dae2032d1c",
    // [INDEXED] arbitrum goerli staging | deployer: arbitrum staging deployer wallet
    "0x3b30d421a6dA95694EaaE09971424F15Eb375269":
      "0xB8559AF91377e5BaB052A4E9a5088cB65a9a4d63",
  },
  arbitrum: {
    // [INDEXED] arbitrum mainnet | deployer: arbitrum mainnet deployer wallet
    "0xdAe755c2944Ec125a0D8D5CB082c22837593441a":
      "0xB8559AF91377e5BaB052A4E9a5088cB65a9a4d63",
  },
};
