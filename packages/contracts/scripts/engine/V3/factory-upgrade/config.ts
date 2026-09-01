// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Topology for the v3.2 -> v3.3 Engine Factory rollout.
 *
 * The rollout replaces the Engine and Engine Flex implementations that
 * `EngineFactoryV0` clones, which means a new factory: both implementations are
 * `immutable` on the factory, so they cannot be repointed. A new factory in turn
 * needs ownership of the `CoreRegistryV1`, which the outgoing factory holds.
 *
 * Almost nothing is configured here. The outgoing factory's address comes from
 * `MAIN_CONFIG` in `scripts/util/constants.ts`, and every constructor argument
 * for the new factory is read off the outgoing factory on chain, so the new
 * factory cannot silently differ from the one it replaces in any field other
 * than the two implementations. What is configured is what does not exist on
 * chain yet: the addresses the new libraries and implementations will be mined
 * to, which are filled in as each phase completes.
 */

/** ImmutableCreate2Factory — see README.md#keyless-create2-factory. */
export const CREATE2_FACTORY = "0x0000000000ffe8b47b3e2130213b802212439497";

/**
 * Libraries that v3.3 links but does NOT redeploy. Identical on every supported
 * network.
 *
 * `V3FlexLib` is unchanged at the source level in v3.3, so the deployment
 * already in use by v3.2.10 is reused. A fresh compile produces different
 * initcode only because interfaces it transitively imports changed, which moves
 * the appended metadata hash; the executable runtime is identical. Redeploying
 * would burn gas on six networks to land identical logic at a new address, and
 * would fragment which Flex lib a given core links.
 */
export const REUSED_LIBRARIES = {
  /** Linker key is fully qualified: two contracts in the repo export this name. */
  "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
    "0x000000000016A5A5ff2FA7799C4BEe89bA59B74e",
  V3FlexLib: "0x00000000Db6f2EBe627260e411E6c973B7c48A62",
} as const;

/**
 * Libraries introduced by v3.3, deployed once per network at a single address.
 *
 * Populate after phase 1 of `1_prepare-deployments.ts`. Until both are set, the
 * scripts refuse to compute implementation initcode, because linking against a
 * placeholder would produce an initcode hash that mines to an address the
 * implementation can never be deployed at.
 */
export const NEW_LIBRARIES: Record<string, string> = {
  V3EngineLib: "0x000000001d81F6Ed8c3646293bD485Cef06416db",
  V3TransferHookLib: "0x0000000020458d4C18397517bA13E43B54Baa56C",
};

/**
 * First-party `ITransferHook` implementations shipped with v3.3, deployed once
 * per network at a single address.
 *
 * These link nothing and take no constructor arguments, so they carry no
 * dependency on the rest of the rollout and are deployed alongside phase 1.
 * They are inert until an artist points a project at one with
 * `configureProjectTransferHook`.
 */
export const REFERENCE_HOOKS: Record<string, string> = {
  OwnerHistoryTransferHook: "0x00000000cb60788043f4F779bfC192F1c5bd09FA",
};

export type ImplementationSpec = {
  /** Hardhat contract name, also the name passed to `create2-deploy`. */
  contractName: string;
  /** `coreVersion()` of the implementation, asserted against the local build. */
  version: string;
  /** Populate after phase 2 of `1_prepare-deployments.ts`. */
  address: string;
};

export const IMPLEMENTATIONS: {
  engine: ImplementationSpec;
  flex: ImplementationSpec;
} = {
  engine: {
    contractName: "GenArt721CoreV3_Engine",
    version: "v3.3.0",
    address: "0x00000000E8227826CB865a4ee37B1300C6b6120E",
  },
  flex: {
    contractName: "GenArt721CoreV3_Engine_Flex",
    version: "v3.3.1",
    address: "0x00000000824067A9E7fcB6CB084eCcd8f3Cb8399",
  },
};

/**
 * Salts mined for each contract, keyed by contract name.
 *
 * All are zero-prefixed, so the `ImmutableCreate2Factory` accepts them from any
 * sender and each contract is reproducible on a new chain by anyone — the same
 * convention as `V3FlexLib` and `PMPV1`. Each lands the contract at an address
 * with four leading zero bytes.
 *
 * A salt is only valid for the exact initcode it was mined against. Any change
 * to the source, the compiler settings, or a linked library address invalidates
 * every salt downstream of it: the implementations link the libraries, and the
 * factories take the implementations as constructor arguments.
 */
export const MINED_SALTS: Record<string, string> = {
  V3EngineLib:
    "0x00000000000000000000000000000000000000005ae836bdd80f0bd662040000",
  V3TransferHookLib:
    "0x0000000000000000000000000000000000000000ed7f80cab01c7f0b3c2500d0",
  OwnerHistoryTransferHook:
    "0x0000000000000000000000000000000000000000e732a9f0bd54b03294010080",
  GenArt721CoreV3_Engine:
    "0x000000000000000000000000000000000000000085b2bef74c3bcdbd3f1b0058",
  GenArt721CoreV3_Engine_Flex:
    "0x0000000000000000000000000000000000000000620e2b0a53b438d8ea200040",
};

/**
 * Replacement `EngineFactoryV0` addresses, keyed by `FactoryEnvironment.label`.
 *
 * Populate after phase 3 of `1_prepare-deployments.ts`. Unlike the libraries and
 * implementations, the factory is intentionally at a different address on every
 * network: `coreRegistry`, `owner`, `defaultBaseURIHost` and
 * `universalBytecodeStorageReader` are all network-specific constructor
 * arguments, so one address across chains is not achievable and not desirable.
 */
export const NEW_FACTORIES: Record<string, string> = {
  mainnet: "0x00000000a337ce098Bf11265176a2bDDA1f41060",
  arbitrum: "0x00000000d5dE2813d00C972eB95941196a1FafeC",
  base: "0x000000003baa376C3d7B7E757e89B195815D8006",
  shape: "0x00000000498832081b5827d11AFbBD0ee8C9f2D8",
  staging: "0x000000007c4b0a672854cEC09812aE3564aA57a6",
  dev: "0x00000000c031Da9C81530457C5CACdd781Efb689",
};

/**
 * Salt mined for each network's factory, keyed by `FactoryEnvironment.label`.
 *
 * Separate from `MINED_SALTS` because all six contracts are `EngineFactoryV0`
 * and differ only in their constructor arguments, so a name is not a key here.
 * Each was mined against the initcode built from that network's live factory
 * state, captured by `0_inspect.ts`.
 */
export const FACTORY_SALTS: Record<string, string> = {
  mainnet: "0x00000000000000000000000000000000000000000623ffa546602abdf60100c0",
  arbitrum:
    "0x000000000000000000000000000000000000000022c0c239ef16d165e5010078",
  base: "0x000000000000000000000000000000000000000058be3e8927289424402800c0",
  shape: "0x00000000000000000000000000000000000000004e8cd0a96d159eaeea210060",
  staging: "0x0000000000000000000000000000000000000000c1cee9156aaeb892181d0040",
  dev: "0x00000000000000000000000000000000000000004b21b383ef40b6883b18000a",
};

export type FactoryEnvironment = {
  /**
   * Label used in deployment record and Safe batch file names. Matches the
   * existing naming under
   * `deployments/engine/V3/factory-and-implementations/`, which labels the two
   * sepolia environments `staging` and `dev` rather than by network.
   */
  label: string;
  /** Hardhat network name, as passed to `--network`. */
  network: string;
  /** `MAIN_CONFIG` environment key in `scripts/util/constants.ts`. */
  environment: string;
  chainId: number;
  explorer: string;
  /** Safe Transaction Service, for uploading the handoff batch. */
  transactionServiceUrl: string;
};

export const FACTORY_ENVIRONMENTS: FactoryEnvironment[] = [
  {
    label: "mainnet",
    network: "mainnet",
    environment: "prod",
    chainId: 1,
    explorer: "https://etherscan.io",
    transactionServiceUrl: "https://safe-transaction-mainnet.safe.global",
  },
  {
    label: "arbitrum",
    network: "arbitrum",
    environment: "prod",
    chainId: 42161,
    explorer: "https://arbiscan.io",
    transactionServiceUrl: "https://safe-transaction-arbitrum.safe.global",
  },
  {
    label: "base",
    network: "base",
    environment: "prod",
    chainId: 8453,
    explorer: "https://basescan.org",
    transactionServiceUrl: "https://safe-transaction-base.safe.global",
  },
  {
    label: "shape",
    network: "shape",
    environment: "prod",
    chainId: 360,
    explorer: "https://shapescan.xyz",
    transactionServiceUrl: "https://transaction.safe.shape.network",
  },
  {
    label: "staging",
    network: "sepolia",
    environment: "staging",
    chainId: 11155111,
    explorer: "https://sepolia.etherscan.io",
    transactionServiceUrl: "https://safe-transaction-sepolia.safe.global",
  },
  {
    label: "dev",
    network: "sepolia",
    environment: "dev",
    chainId: 11155111,
    explorer: "https://sepolia.etherscan.io",
    transactionServiceUrl: "https://safe-transaction-sepolia.safe.global",
  },
];

/**
 * Resolve the environment for the current run.
 *
 * Both sepolia environments share a network, so `NODE_ENV` disambiguates them —
 * the same selector the `deploy:v3-engine:*` package scripts use.
 */
export function getEnvironment(
  networkName: string,
  nodeEnv: string | undefined = process.env.NODE_ENV
): FactoryEnvironment {
  const candidates = FACTORY_ENVIRONMENTS.filter(
    (env) => env.network === networkName
  );
  if (candidates.length === 0) {
    throw new Error(
      `No Engine Factory environment configured for network ${networkName}. ` +
        `Configured networks: ${Array.from(
          new Set(FACTORY_ENVIRONMENTS.map((e) => e.network))
        ).join(", ")}`
    );
  }
  if (candidates.length === 1) {
    return candidates[0];
  }
  const match = candidates.find((env) => env.environment === nodeEnv);
  if (!match) {
    throw new Error(
      `Network ${networkName} hosts more than one environment ` +
        `(${candidates.map((c) => c.environment).join(", ")}). ` +
        `Set NODE_ENV to select one; got ${nodeEnv ?? "<unset>"}.`
    );
  }
  return match;
}

/** Throws unless every v3.3 library address has been filled in. */
export function requireNewLibraries(): Record<string, string> {
  const missing = Object.entries(NEW_LIBRARIES)
    .filter(([, address]) => !address)
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(
      `NEW_LIBRARIES is missing an address for: ${missing.join(", ")}. ` +
        `Deploy the libraries (phase 1) and record their addresses in ` +
        `scripts/engine/V3/factory-upgrade/config.ts before continuing.`
    );
  }
  return { ...NEW_LIBRARIES };
}

/** Library links for an implementation, reused + new. */
export function implementationLibraries(
  contractName: string
): Record<string, string> {
  const libraries: Record<string, string> = {
    "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
      REUSED_LIBRARIES[
        "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader"
      ],
    ...requireNewLibraries(),
  };
  // @dev only the Flex core stores external asset dependencies, so only it
  // links V3FlexLib. Linking it into the standard Engine core would fail.
  if (contractName === IMPLEMENTATIONS.flex.contractName) {
    libraries.V3FlexLib = REUSED_LIBRARIES.V3FlexLib;
  }
  return libraries;
}

/** Throws unless both v3.3 implementation addresses have been filled in. */
export function requireImplementations(): {
  engine: string;
  flex: string;
} {
  const missing = Object.entries(IMPLEMENTATIONS)
    .filter(([, spec]) => !spec.address)
    .map(([key, spec]) => `${key} (${spec.contractName} ${spec.version})`);
  if (missing.length > 0) {
    throw new Error(
      `IMPLEMENTATIONS is missing an address for: ${missing.join(", ")}. ` +
        `Deploy the implementations (phase 2) and record their addresses in ` +
        `scripts/engine/V3/factory-upgrade/config.ts before continuing.`
    );
  }
  return {
    engine: IMPLEMENTATIONS.engine.address,
    flex: IMPLEMENTATIONS.flex.address,
  };
}

/** Throws unless the replacement factory address for `label` has been filled in. */
export function requireNewFactory(label: string): string {
  const address = NEW_FACTORIES[label];
  if (!address) {
    throw new Error(
      `NEW_FACTORIES has no address for environment "${label}". Deploy the ` +
        `factory (phase 3) and record its address in ` +
        `scripts/engine/V3/factory-upgrade/config.ts before continuing.`
    );
  }
  return address;
}
