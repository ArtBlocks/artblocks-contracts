// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Deployment topology for the on-chain generator.
 *
 * Every GenArt721GeneratorV0 proxy sits behind an OpenZeppelin ProxyAdmin whose
 * owner is a Gnosis Safe, so no environment can be upgraded by an EOA directly —
 * a direct call reverts with `Ownable: caller is not the owner`. Both sepolia
 * proxies share a single ProxyAdmin and Safe, so they upgrade in one batch.
 */

export type GeneratorProxy = {
  /** Environment label, used in file names and log output. */
  label: string;
  address: string;
};

export type GeneratorEnvironment = {
  /** hardhat network name, as passed to `--network`. */
  network: string;
  chainId: number;
  explorer: string;
  proxyAdmin: string;
  /** Owner of the ProxyAdmin. All upgrades execute from here. */
  safe: {
    address: string;
    threshold: number;
    owners: number;
  };
  proxies: GeneratorProxy[];
};

export const GENERATOR_ENVIRONMENTS: GeneratorEnvironment[] = [
  {
    network: "sepolia",
    chainId: 11155111,
    explorer: "https://sepolia.etherscan.io",
    proxyAdmin: "0xb71b829185159AB5B26D7F0BB7f991D0E17d5a7a",
    safe: {
      address: "0xbaD99DdBa319639e0e9FB2E42935BfE5b2a1B6a8",
      threshold: 1,
      owners: 1,
    },
    proxies: [
      { label: "dev", address: "0x705E55FCD5CB00eB727213aa777C914B814817Be" },
      {
        label: "staging",
        address: "0xdC862938cA0a2D8dcabe5733C23e54ac7aAFFF27",
      },
    ],
  },
  {
    network: "mainnet",
    chainId: 1,
    explorer: "https://etherscan.io",
    proxyAdmin: "0x5705023921B577e5BAeFF66f1fC7d52f5ccF1232",
    safe: {
      address: "0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA",
      threshold: 2,
      owners: 4,
    },
    proxies: [
      {
        label: "mainnet",
        address: "0x953D288708bB771F969FCfD9BA0819eF506Ac718",
      },
    ],
  },
];

export function getEnvironment(network: string): GeneratorEnvironment {
  const environment = GENERATOR_ENVIRONMENTS.find(
    (e) => e.network === network
  );
  if (!environment) {
    throw new Error(
      `No on-chain generator is deployed on "${network}". Supported: ${GENERATOR_ENVIRONMENTS.map(
        (e) => e.network
      ).join(", ")}`
    );
  }
  return environment;
}

/** 0age immutable CREATE2 factory, at the same address on every supported chain. */
export const CREATE2_FACTORY = "0x0000000000ffe8b47b3e2130213b802212439497";

/**
 * An all-zero salt is permissionless on the 0age factory, which is what lets the
 * implementation land at the same address on every chain even though mainnet and
 * sepolia are deployed by different EOAs. A caller-bound (vanity) salt would bind
 * the address to one deployer and break that.
 */
export const IMPLEMENTATION_SALT = "0x" + "0".repeat(64);

export const CONTRACT_NAME = "GenArt721GeneratorV0";

/**
 * Projects used to confirm the upgrade landed. The `custom@na` projects store a
 * complete HTML document and must be injected verbatim; the controls are ordinary
 * JavaScript and must be byte-identical to their pre-upgrade output.
 */
export type CheckProject = {
  name: string;
  core: string;
  projectId: number;
  tokenId: number;
  expect: "raw" | "wrapped";
};

export const MAINNET_CHECK_PROJECTS: CheckProject[] = [
  {
    name: "Quine",
    core: "0xab00000000002ade39f58f9d8278a31574ffbe77",
    projectId: 506,
    tokenId: 506000239,
    expect: "raw",
  },
  {
    name: "send/receive",
    core: "0xababababab20053426ad1c782de9ea8444358070",
    projectId: 5,
    tokenId: 5000000,
    expect: "raw",
  },
  {
    name: "SpiroFlakes",
    core: "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    projectId: 136,
    tokenId: 136000000,
    expect: "raw",
  },
  {
    name: "Paramecircle",
    core: "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",
    projectId: 195,
    tokenId: 195000000,
    expect: "raw",
  },
  {
    name: "Overture",
    core: "0x000000dab303a194b3f55d4702b24740ad5a2f00",
    projectId: 0,
    tokenId: 0,
    expect: "raw",
  },
  {
    name: "PRELUDES",
    core: "0xea698596b6009a622c3ed00dd5a8b5d1cae4fc36",
    projectId: 5,
    tokenId: 5000000,
    expect: "wrapped",
  },
  {
    name: "Crypt",
    core: "0x99a9b7c1116f9ceeb1652de04d5969cce509b069",
    projectId: 453,
    tokenId: 453000000,
    expect: "wrapped",
  },
];
