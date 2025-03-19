import { ethers } from "hardhat";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// empirically have found adding 10 seconds between txs in scripts is enough to
// avoid chain reorgs and tx failures
export const EXTRA_DELAY_BETWEEN_TX = 10000; // ms

// delegation registry addresses on supported networks
export const DELEGATION_REGISTRY_V1_ADDRESSES = {
  mainnet: "0x00000000000076A84feF008CDAbe6409d2FE638B",
  sepolia: "0x00000000000076A84feF008CDAbe6409d2FE638B",
  arbitrum: "0x00000000000076A84feF008CDAbe6409d2FE638B",
  "arbitrum-sepolia": "0x00000000000076A84feF008CDAbe6409d2FE638B",
  base: "0x00000000000076A84feF008CDAbe6409d2FE638B",
};

export const DELEGATION_REGISTRY_V2_ADDRESSES = {
  mainnet: "0x00000000000000447e69651d841bD8D104Bed493",
  sepolia: "0x00000000000000447e69651d841bD8D104Bed493",
  arbitrum: "0x00000000000000447e69651d841bD8D104Bed493",
  "arbitrum-sepolia": "0x00000000000000447e69651d841bD8D104Bed493",
  base: "0x00000000000000447e69651d841bD8D104Bed493",
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
  return "0x000000000ef75C77F6bd0b2Ee166501FbBDb40c8";
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

export enum ProductClassEnum {
  Engine = "Engine",
  Sudio = "Studio",
}

/**
 * Helper function to get the prod render provider payment address for the given
 * network and environment, if there is a requirement.
 * Returns undefined if there is no requirement for a specific render provider (e.g. testnet)
 * @param networkName network name, e.g. "mainnet", "arbitrum", etc.
 * @param environment environment, e.g. "mainnet", "staging", "dev"
 * @param productClass product class, "Engine", "Studio"
 * @returns address if require a specific render provider payment address for the given network and environment, otherwise undefined
 */
export function getProdRenderProviderPaymentAddress(
  networkName: string,
  environment: string,
  productClass: ProductClassEnum
): string | undefined {
  // verify that a missing product class is not reason for returning undefined
  if (
    !productClass ||
    !Object.values(ProductClassEnum).includes(productClass)
  ) {
    throw new Error(
      `productClass is required and must be a valid ProductClassEnum. value: ${productClass}`
    );
  }
  return MAIN_CONFIG[networkName]?.[environment]?.[productClass]
    ?.prodRenderProviderPaymentAddress;
}

type T_RENDER_PROVIDER_PAYMENT_ADDRESSES = {
  [ProductClassEnum: string]: string;
};

type T_NETWORK_ENV_CONFIG = {
  engineFactory: string;
  sharedMinterFilter: string;
  sharedRandomizer: string;
  universalBytecodeStorageReader: string;
  dependencyRegistry?: string;
  scriptyBuilderV2?: string;
  prodRenderProviderPaymentAddress?: T_RENDER_PROVIDER_PAYMENT_ADDRESSES;
};
type T_MAIN_CONFIG = {
  [network: string]: {
    [environment: string]: T_NETWORK_ENV_CONFIG;
  };
};
export const MAIN_CONFIG: T_MAIN_CONFIG = {
  mainnet: {
    mainnet: {
      engineFactory: "0x000000004058B5159ABB5a3Dd8cf775A7519E75F",
      sharedMinterFilter: "0xa2ccfE293bc2CDD78D8166a82D1e18cD2148122b",
      sharedRandomizer: "0x13178A7a8A1A9460dBE39f7eCcEbD91B31752b91",
      universalBytecodeStorageReader:
        "0x000000000000A791ABed33872C44a3D215a3743B",
      scriptyBuilderV2: "0xD7587F110E08F4D120A231bA97d3B577A81Df022",
      dependencyRegistry: "0x37861f95882ACDba2cCD84F5bFc4598e2ECDDdAF",
      prodRenderProviderPaymentAddress: {
        [ProductClassEnum.Engine]: "0xa9F7C2b5Fd91C842B2E1b839A1Cf0f3DE2a24249",
        [ProductClassEnum.Sudio]: "0x036F3D03C1ccdde1878F01607922EA12110Ee9Bd",
      },
    },
  },
  arbitrum: {
    arbitrum: {
      engineFactory: "0x000000007566E6566771d28E91bD465bEE8426a5",
      sharedMinterFilter: "0x94560abECb897f359ee1A6Ed0E922315Da11752d",
      sharedRandomizer: "0x6a5976391E708fBf918c3786cd1FcbB88732fbc1",
      universalBytecodeStorageReader:
        "0x000000005795aA93c8E5De234Ff0DE0000C98946",
      prodRenderProviderPaymentAddress: {
        [ProductClassEnum.Engine]: "0x4fbFc0F88270FE3405Ee5bf8c98CC03647b4fdA4",
        [ProductClassEnum.Sudio]: "0x23636eAa2605B9c4a988E56d2093b488793f1C42",
      },
    },
  },
  base: {
    base: {
      engineFactory: "0x00000BA55cae9d000000b156875D91854124fd7e",
      sharedMinterFilter: "0x1E615ee4C7AC89B525d48AeedF01d76E4e06a2d5",
      sharedRandomizer: "0x9b2e24Bcb09AaDa3e8EE4F56D77713453aFd8A98",
      universalBytecodeStorageReader:
        "0x00000000000E85B0806ABB37B6C9d80A7100A0C5",
      scriptyBuilderV2: "0xD7587F110E08F4D120A231bA97d3B577A81Df022",
      prodRenderProviderPaymentAddress: {
        [ProductClassEnum.Engine]: "0xc5bd90634d9355B93FE8d07e6F79eAB5EF20AbCc",
        [ProductClassEnum.Sudio]: "0xc8D1099702cB95baf954a4E3e2bEaF883314f464",
      },
    },
  },
  sepolia: {
    staging: {
      engineFactory: "0x0000A9AA9b00F46c009f15b3F68122e1878D7d18",
      sharedMinterFilter: "0xa07f47c30C262adcC263A4D44595972c50e04db7",
      sharedRandomizer: "0x28f2D3805652FB5d359486dFfb7D08320D403240",
      universalBytecodeStorageReader:
        "0x000000069EbaecF0d656897bA5527f2145560086",
      scriptyBuilderV2: "0xD7587F110E08F4D120A231bA97d3B577A81Df022",
      dependencyRegistry: "0xEFA7Ef074A6E90a99fba8bAd4dCf337ef298387f",
    },
    dev: {
      engineFactory: "0x000000C969c34e95C9b9F24ea7bD597Af554a1c2",
      sharedMinterFilter: "0x29e9f09244497503f304FA549d50eFC751D818d2",
      sharedRandomizer: "0xA6F7e62F3B52552f79b2Baa2858a1DB18016c09B",
      universalBytecodeStorageReader:
        "0x000000069EbaecF0d656897bA5527f2145560086",
      scriptyBuilderV2: "0xD7587F110E08F4D120A231bA97d3B577A81Df022",
      dependencyRegistry: "0x5Fcc415BCFb164C5F826B5305274749BeB684e9b",
    },
  },
};

export const GUNZIP_SCRIPT_BASE64 =
  "InVzZSBzdHJpY3QiOygoKT0+e3ZhciB2PVVpbnQ4QXJyYXksQT1VaW50MTZBcnJheSxfPVVpbnQzMkFycmF5LHJyPW5ldyB2KFswLDAsMCwwLDAsMCwwLDAsMSwxLDEsMSwyLDIsMiwyLDMsMywzLDMsNCw0LDQsNCw1LDUsNSw1LDAsMCwwLDBdKSxucj1uZXcgdihbMCwwLDAsMCwxLDEsMiwyLDMsMyw0LDQsNSw1LDYsNiw3LDcsOCw4LDksOSwxMCwxMCwxMSwxMSwxMiwxMiwxMywxMywwLDBdKSxscj1uZXcgdihbMTYsMTcsMTgsMCw4LDcsOSw2LDEwLDUsMTEsNCwxMiwzLDEzLDIsMTQsMSwxNV0pLHRyPWZ1bmN0aW9uKHIsbil7Zm9yKHZhciB0PW5ldyBBKDMxKSxlPTA7ZTwzMTsrK2UpdFtlXT1uKz0xPDxyW2UtMV07Zm9yKHZhciBhPW5ldyBfKHRbMzBdKSxlPTE7ZTwzMDsrK2UpZm9yKHZhciB1PXRbZV07dTx0W2UrMV07Kyt1KWFbdV09dS10W2VdPDw1fGU7cmV0dXJuW3QsYV19LGVyPXRyKHJyLDIpLGlyPWVyWzBdLGNyPWVyWzFdO2lyWzI4XT0yNTgsY3JbMjU4XT0yODt2YXIgYXI9dHIobnIsMCkscHI9YXJbMF0sVXI9YXJbMV0scT1uZXcgQSgzMjc2OCk7Zm9yKG89MDtvPDMyNzY4OysrbyltPShvJjQzNjkwKT4+PjF8KG8mMjE4NDUpPDwxLG09KG0mNTI0MjgpPj4+MnwobSYxMzEwNyk8PDIsbT0obSY2MTY4MCk+Pj40fChtJjM4NTUpPDw0LHFbb109KChtJjY1MjgwKT4+Pjh8KG0mMjU1KTw8OCk+Pj4xO3ZhciBtLG8sRD1mdW5jdGlvbihyLG4sdCl7Zm9yKHZhciBlPXIubGVuZ3RoLGE9MCx1PW5ldyBBKG4pO2E8ZTsrK2EpclthXSYmKyt1W3JbYV0tMV07dmFyIGc9bmV3IEEobik7Zm9yKGE9MDthPG47KythKWdbYV09Z1thLTFdK3VbYS0xXTw8MTt2YXIgcztpZih0KXtzPW5ldyBBKDE8PG4pO3ZhciBpPTE1LW47Zm9yKGE9MDthPGU7KythKWlmKHJbYV0pZm9yKHZhciBmPWE8PDR8clthXSxoPW4tclthXSxsPWdbclthXS0xXSsrPDxoLHc9bHwoMTw8aCktMTtsPD13OysrbClzW3FbbF0+Pj5pXT1mfWVsc2UgZm9yKHM9bmV3IEEoZSksYT0wO2E8ZTsrK2EpclthXSYmKHNbYV09cVtnW3JbYV0tMV0rK10+Pj4xNS1yW2FdKTtyZXR1cm4gc30sRT1uZXcgdigyODgpO2ZvcihvPTA7bzwxNDQ7KytvKUVbb109ODt2YXIgbztmb3Iobz0xNDQ7bzwyNTY7KytvKUVbb109OTt2YXIgbztmb3Iobz0yNTY7bzwyODA7KytvKUVbb109Nzt2YXIgbztmb3Iobz0yODA7bzwyODg7KytvKUVbb109ODt2YXIgbyxvcj1uZXcgdigzMik7Zm9yKG89MDtvPDMyOysrbylvcltvXT01O3ZhciBvO3ZhciBncj1EKEUsOSwxKTt2YXIgeXI9RChvciw1LDEpLFI9ZnVuY3Rpb24ocil7Zm9yKHZhciBuPXJbMF0sdD0xO3Q8ci5sZW5ndGg7Kyt0KXJbdF0+biYmKG49clt0XSk7cmV0dXJuIG59LHA9ZnVuY3Rpb24ocixuLHQpe3ZhciBlPW4vOHwwO3JldHVybihyW2VdfHJbZSsxXTw8OCk+PihuJjcpJnR9LCQ9ZnVuY3Rpb24ocixuKXt2YXIgdD1uLzh8MDtyZXR1cm4oclt0XXxyW3QrMV08PDh8clt0KzJdPDwxNik+PihuJjcpfSx3cj1mdW5jdGlvbihyKXtyZXR1cm4ocis3KS84fDB9LG1yPWZ1bmN0aW9uKHIsbix0KXsobj09bnVsbHx8bjwwKSYmKG49MCksKHQ9PW51bGx8fHQ+ci5sZW5ndGgpJiYodD1yLmxlbmd0aCk7dmFyIGU9bmV3KHIuQllURVNfUEVSX0VMRU1FTlQ9PTI/QTpyLkJZVEVTX1BFUl9FTEVNRU5UPT00P186dikodC1uKTtyZXR1cm4gZS5zZXQoci5zdWJhcnJheShuLHQpKSxlfTt2YXIgeHI9WyJ1bmV4cGVjdGVkIEVPRiIsImludmFsaWQgYmxvY2sgdHlwZSIsImludmFsaWQgbGVuZ3RoL2xpdGVyYWwiLCJpbnZhbGlkIGRpc3RhbmNlIiwic3RyZWFtIGZpbmlzaGVkIiwibm8gc3RyZWFtIGhhbmRsZXIiLCwibm8gY2FsbGJhY2siLCJpbnZhbGlkIFVURi04IGRhdGEiLCJleHRyYSBmaWVsZCB0b28gbG9uZyIsImRhdGUgbm90IGluIHJhbmdlIDE5ODAtMjA5OSIsImZpbGVuYW1lIHRvbyBsb25nIiwic3RyZWFtIGZpbmlzaGluZyIsImludmFsaWQgemlwIGRhdGEiXSx4PWZ1bmN0aW9uKHIsbix0KXt2YXIgZT1uZXcgRXJyb3Iobnx8eHJbcl0pO2lmKGUuY29kZT1yLEVycm9yLmNhcHR1cmVTdGFja1RyYWNlJiZFcnJvci5jYXB0dXJlU3RhY2tUcmFjZShlLHgpLCF0KXRocm93IGU7cmV0dXJuIGV9LHpyPWZ1bmN0aW9uKHIsbix0KXt2YXIgZT1yLmxlbmd0aDtpZighZXx8dCYmdC5mJiYhdC5sKXJldHVybiBufHxuZXcgdigwKTt2YXIgYT0hbnx8dCx1PSF0fHx0Lmk7dHx8KHQ9e30pLG58fChuPW5ldyB2KGUqMykpO3ZhciBnPWZ1bmN0aW9uKFYpe3ZhciBYPW4ubGVuZ3RoO2lmKFY+WCl7dmFyIGI9bmV3IHYoTWF0aC5tYXgoWCoyLFYpKTtiLnNldChuKSxuPWJ9fSxzPXQuZnx8MCxpPXQucHx8MCxmPXQuYnx8MCxoPXQubCxsPXQuZCx3PXQubSxUPXQubixJPWUqODtkb3tpZighaCl7cz1wKHIsaSwxKTt2YXIgQj1wKHIsaSsxLDMpO2lmKGkrPTMsQilpZihCPT0xKWg9Z3IsbD15cix3PTksVD01O2Vsc2UgaWYoQj09Mil7dmFyIEc9cChyLGksMzEpKzI1NyxZPXAocixpKzEwLDE1KSs0LFc9RytwKHIsaSs1LDMxKSsxO2krPTE0O2Zvcih2YXIgQz1uZXcgdihXKSxPPW5ldyB2KDE5KSxjPTA7YzxZOysrYylPW2xyW2NdXT1wKHIsaStjKjMsNyk7aSs9WSozO2Zvcih2YXIgaj1SKE8pLHNyPSgxPDxqKS0xLHVyPUQoTyxqLDEpLGM9MDtjPFc7KXt2YXIgZD11cltwKHIsaSxzcildO2krPWQmMTU7dmFyIHk9ZD4+PjQ7aWYoeTwxNilDW2MrK109eTtlbHNle3ZhciBTPTAsRj0wO2Zvcih5PT0xNj8oRj0zK3AocixpLDMpLGkrPTIsUz1DW2MtMV0pOnk9PTE3PyhGPTMrcChyLGksNyksaSs9Myk6eT09MTgmJihGPTExK3AocixpLDEyNyksaSs9Nyk7Ri0tOylDW2MrK109U319dmFyIEo9Qy5zdWJhcnJheSgwLEcpLHo9Qy5zdWJhcnJheShHKTt3PVIoSiksVD1SKHopLGg9RChKLHcsMSksbD1EKHosVCwxKX1lbHNlIHgoMSk7ZWxzZXt2YXIgeT13cihpKSs0LFo9clt5LTRdfHJbeS0zXTw8OCxrPXkrWjtpZihrPmUpe3UmJngoMCk7YnJlYWt9YSYmZyhmK1opLG4uc2V0KHIuc3ViYXJyYXkoeSxrKSxmKSx0LmI9Zis9Wix0LnA9aT1rKjgsdC5mPXM7Y29udGludWV9aWYoaT5JKXt1JiZ4KDApO2JyZWFrfX1hJiZnKGYrMTMxMDcyKTtmb3IodmFyIHZyPSgxPDx3KS0xLGhyPSgxPDxUKS0xLEw9aTs7TD1pKXt2YXIgUz1oWyQocixpKSZ2cl0sTT1TPj4+NDtpZihpKz1TJjE1LGk+SSl7dSYmeCgwKTticmVha31pZihTfHx4KDIpLE08MjU2KW5bZisrXT1NO2Vsc2UgaWYoTT09MjU2KXtMPWksaD1udWxsO2JyZWFrfWVsc2V7dmFyIEs9TS0yNTQ7aWYoTT4yNjQpe3ZhciBjPU0tMjU3LFU9cnJbY107Sz1wKHIsaSwoMTw8VSktMSkraXJbY10saSs9VX12YXIgUD1sWyQocixpKSZocl0sTj1QPj4+NDtQfHx4KDMpLGkrPVAmMTU7dmFyIHo9cHJbTl07aWYoTj4zKXt2YXIgVT1ucltOXTt6Kz0kKHIsaSkmKDE8PFUpLTEsaSs9VX1pZihpPkkpe3UmJngoMCk7YnJlYWt9YSYmZyhmKzEzMTA3Mik7Zm9yKHZhciBRPWYrSztmPFE7Zis9NCluW2ZdPW5bZi16XSxuW2YrMV09bltmKzEtel0sbltmKzJdPW5bZisyLXpdLG5bZiszXT1uW2YrMy16XTtmPVF9fXQubD1oLHQucD1MLHQuYj1mLHQuZj1zLGgmJihzPTEsdC5tPXcsdC5kPWwsdC5uPVQpfXdoaWxlKCFzKTtyZXR1cm4gZj09bi5sZW5ndGg/bjptcihuLDAsZil9O3ZhciBBcj1uZXcgdigwKTt2YXIgU3I9ZnVuY3Rpb24ocil7KHJbMF0hPTMxfHxyWzFdIT0xMzl8fHJbMl0hPTgpJiZ4KDYsImludmFsaWQgZ3ppcCBkYXRhIik7dmFyIG49clszXSx0PTEwO24mNCYmKHQrPXJbMTBdfChyWzExXTw8OCkrMik7Zm9yKHZhciBlPShuPj4zJjEpKyhuPj40JjEpO2U+MDtlLT0hclt0KytdKTtyZXR1cm4gdCsobiYyKX0sTXI9ZnVuY3Rpb24ocil7dmFyIG49ci5sZW5ndGg7cmV0dXJuKHJbbi00XXxyW24tM108PDh8cltuLTJdPDwxNnxyW24tMV08PDI0KT4+PjB9O2Z1bmN0aW9uIEgocixuKXtyZXR1cm4genIoci5zdWJhcnJheShTcihyKSwtOCksbnx8bmV3IHYoTXIocikpKX12YXIgVHI9dHlwZW9mIFRleHREZWNvZGVyPCJ1IiYmbmV3IFRleHREZWNvZGVyLENyPTA7dHJ5e1RyLmRlY29kZShBcix7c3RyZWFtOiEwfSksQ3I9MX1jYXRjaHt9dmFyIGZyPSgpPT57dmFyIG47bGV0IHI9ZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnc2NyaXB0W3R5cGU9InRleHQvamF2YXNjcmlwdCtnemlwIl1bc3JjXScpO2ZvcihsZXQgdCBvZiByKXRyeXtsZXQgZT10LnNyYy5tYXRjaCgvXmRhdGE6KC4qPykoPzo7KGJhc2U2NCkpPywoLiopJC8pO2lmKCFlKWNvbnRpbnVlO2xldFthLHUsZyxzXT1lLGk9VWludDhBcnJheS5mcm9tKGc/YXRvYihzKTpkZWNvZGVVUklDb21wb25lbnQocyksdz0+dy5jaGFyQ29kZUF0KDApKSxoPW5ldyBUZXh0RGVjb2RlcigpLmRlY29kZShIKGkpKSxsPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoInNjcmlwdCIpO2wudGV4dENvbnRlbnQ9aCwobj10LnBhcmVudE5vZGUpPT1udWxsfHxuLnJlcGxhY2VDaGlsZChsLHQpfWNhdGNoKGUpe2NvbnNvbGUuZXJyb3IoIkNvdWxkIG5vdCBndW56aXAgc2NyaXB0Iix0LGUpfX07ZnIoKTt3aW5kb3cuZ3VuemlwU3luYz1IO3dpbmRvdy5ndW56aXBTY3JpcHRzPWZyO30pKCk7";
