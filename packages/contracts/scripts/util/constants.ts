import { ethers } from "hardhat";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// empirically have found adding 10 seconds between txs in scripts is enough to
// avoid chain reorgs and tx failures
export const EXTRA_DELAY_BETWEEN_TX = 10000; // ms

// delegation registry addresses on supported networks
export const DELEGATION_REGISTRY_ADDRESSES = {
  mainnet: "0x00000000000076A84feF008CDAbe6409d2FE638B",
  sepolia: "0x00000000000076A84feF008CDAbe6409d2FE638B",
  arbitrum: "0x00000000000076A84feF008CDAbe6409d2FE638B",
  "arbitrum-sepolia": "0x00000000000076A84feF008CDAbe6409d2FE638B",
  base: "0x00000000000076A84feF008CDAbe6409d2FE638B",
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
    MAIN_CONFIG[networkName]?.[environment]?.sharedMinterFilter;
  if (!activeMinterFilter) {
    throw new Error(
      `No active shared minter filter found for network ${networkName} and environment ${environment}`
    );
  }
  return activeMinterFilter;
}

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
    MAIN_CONFIG[networkName]?.[environment]?.sharedRandomizer;
  if (!activeSharedRandomizer) {
    throw new Error(
      `No active shared randomizer found for network ${networkName} and environment ${environment}`
    );
  }
  return activeSharedRandomizer;
}

export function getActiveSharedSplitProvider(): string {
  return "0x0000000004B100B47f061968a387c82702AFe946";
}

export async function getActiveEngineImplementations(
  networkName: string,
  environment: string
): Promise<{
  activeEngineImplementationAddress: string;
  activeEngineFlexImplementationAddress: string;
}> {
  // get the engine factory
  const engineFactoryAddress = getActiveEngineFactoryAddress(
    networkName,
    environment
  );
  const engineContractFactory =
    await ethers.getContractFactory("EngineFactoryV0");
  const engineFactory = engineContractFactory.attach(engineFactoryAddress);

  const activeEngineImplementationAddress =
    await engineFactory.engineImplementation();
  const activeEngineFlexImplementationAddress =
    await engineFactory.engineFlexImplementation();
  if (
    !activeEngineImplementationAddress ||
    !activeEngineFlexImplementationAddress
  ) {
    throw new Error(
      `No active engine or engine flex implementation found for network ${networkName} and environment ${environment}`
    );
  }
  return {
    activeEngineImplementationAddress,
    activeEngineFlexImplementationAddress,
  };
}

export function getActiveEngineFactoryAddress(
  networkName: string,
  environment: string
): string {
  const activeEngineFactory =
    MAIN_CONFIG[networkName]?.[environment]?.engineFactory;
  if (!activeEngineFactory) {
    throw new Error(
      `No active engine factory found for network ${networkName} and environment ${environment}`
    );
  }
  return activeEngineFactory;
}

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

/**
 * Helper function to get the prod render provider payment address for the given
 * network and environment, if there is a requirement.
 * Returns undefined if there is no requirement for a specific render provider (e.g. testnet)
 * @param networkName network name, e.g. "mainnet", "arbitrum", etc.
 * @param environment environment, e.g. "mainnet", "staging", "dev"
 * @returns address if require a specific render provider payment address for the given network and environment, otherwise undefined
 */
export function getProdRenderProviderPaymentAddress(
  networkName: string,
  environment: string
): string | undefined {
  return MAIN_CONFIG[networkName]?.[environment]
    ?.prodRenderProviderPaymentAddress;
}

type T_NETWORK_ENV_CONFIG = {
  engineFactory: string;
  sharedMinterFilter: string;
  sharedRandomizer: string;
  prodRenderProviderPaymentAddress?: string;
};
type T_MAIN_CONFIG = {
  [network: string]: {
    [environment: string]: T_NETWORK_ENV_CONFIG;
  };
};
const MAIN_CONFIG: T_MAIN_CONFIG = {
  mainnet: {
    mainnet: {
      engineFactory: "0x000000AB1a0786eE8c71516d9AbB8a36fbdDb7CB",
      sharedMinterFilter: "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b",
      sharedRandomizer: "0x13178A7a8A1A9460dBE39f7eCcEbD91B31752b91",
      prodRenderProviderPaymentAddress:
        "0x036F3D03C1ccdde1878F01607922EA12110Ee9Bd",
    },
  },
  arbitrum: {
    arbitrum: {
      engineFactory: "0x000000da9D51CC51a50Dc296246075859b13ab0B",
      sharedMinterFilter: "0x94560abECb897f359ee1A6Ed0E922315Da11752d",
      sharedRandomizer: "0x6a5976391E708fBf918c3786cd1FcbB88732fbc1",
      prodRenderProviderPaymentAddress:
        "0x23636eAa2605B9c4a988E56d2093b488793f1C42",
    },
  },
  base: {
    base: {
      engineFactory: "0xtbd",
      sharedMinterFilter: "0xtbd",
      sharedRandomizer: "0x9b2e24Bcb09AaDa3e8EE4F56D77713453aFd8A98",
      prodRenderProviderPaymentAddress: "0xtbd",
    },
  },
  sepolia: {
    staging: {
      engineFactory: "0x000000E238ebffe826c960aB0b53B299CB4eBbE0",
      sharedMinterFilter: "0xa07f47c30C262adcC263A4D44595972c50e04db7",
      sharedRandomizer: "0x28f2D3805652FB5d359486dFfb7D08320D403240",
    },
    dev: {
      engineFactory: "0x000000A8398893f1A9B4a0d234a2eC4F8AFc5838",
      sharedMinterFilter: "0x29e9f09244497503f304FA549d50eFC751D818d2",
      sharedRandomizer: "0xA6F7e62F3B52552f79b2Baa2858a1DB18016c09B",
    },
  },
};
