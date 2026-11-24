// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * The AB500 dependency libraries stored on ABX FS, and the registry dependency each one backs.
 *
 * All 13 files were uploaded as one ABX FS directory (gzip codec, raw chunks) to Ethereum,
 * Ethereum Sepolia, Base, Base Sepolia, Arbitrum One and Robinhood. ABX FS CIDs are
 * content-derived, so every CID below is identical on each of those chains. The uploads are
 * recorded in `deployments/abxfs/`.
 *
 * `sha256` is the SHA-256 of the decoded (gunzipped) file. Each one was checked against the
 * dependency's preferred CDN URL: all 13 match, zdog against the version-pinned
 * `zdog@1.1.2` URL (the registry's `zdog@1` URL now resolves to 1.1.3).
 */

/** ABX FS FileStore: immutable, CREATE2-deployed at this address on every supported chain. */
export const ABXFS_CANONICAL_FILE_STORE =
  "0x8b6077a1d6953D96687005B9408D56A655b4d155";

/**
 * ABX FS FileDataReader companion, through which the generator reads dependency files. Stateless,
 * deployed through the keyless CREATE2 deployer, so its address is the same on every chain.
 * Must equal the generator's `ABXFS_FILE_DATA_READER`; the scripts check it.
 */
export const ABXFS_FILE_DATA_READER =
  "0xb13D24967aB9B41787E2280D22d1d43a286c197a";

/** The AB500 ABX FS directory holding all 13 files. */
export const AB500_ABXFS_ROOT =
  "0x60cdc71765dc6954ebc3dcc4545d92a04d5a09ebd891bb02333d95ba0c39fa2d";

export type AbxfsDependencyFile = {
  /** Registry dependency, "name@version". */
  dependency: string;
  /** File name within the AB500 ABX FS directory. */
  file: string;
  /** ABX FS file CID. */
  cid: string;
  /** SHA-256 of the decoded file. */
  sha256: string;
  /**
   * Whether the rollout sets this CID on the registry. False only for ES module dependencies,
   * which the generator never inlines.
   */
  set: boolean;
  note?: string;
};

export const AB500_ABXFS_FILES: AbxfsDependencyFile[] = [
  {
    dependency: "aframe@1.2.0",
    file: "aframe-1.2.0.min.js",
    cid: "0x4b19abdc4864b0fcc271f96dd32d4a95cd7431d5353cf39eca32c014ec42344a",
    sha256: "4319c2f3619c1e9a5858caeea4c9b49517d7f129f372fe1addbf259f3e21533d",
    set: true,
  },
  {
    dependency: "babylon@5.0.0",
    file: "babylon-5.0.0.min.js",
    cid: "0xf8ca7bcb6f5409c87668a00b6e3781a5c2bfc5d584b6956770872bf46c444dea",
    sha256: "bf49c6dd83df78f67dff170fe5eb6de849073ba1844353992930adaa4af78e2d",
    set: true,
  },
  {
    dependency: "p5@1.0.0",
    file: "p5-1.0.0.min.js",
    cid: "0xd51a97d197e052299e2ef11718c4185435ea3d14ec04ec3276c807dc5d1654d0",
    sha256: "3e0d5d8be7c1179dd16e1f68651fc5783d71b05cd32c2f7ade571a7350f489ab",
    set: true,
    note: "the file matches the CDN; the registry's former on-chain copy differed only in its header comment (v1.0.0 vs the CDN file's v0.10.2)",
  },
  {
    dependency: "p5@1.9.0",
    file: "p5-1.9.0.min.js",
    cid: "0x844bec3f01d7c791ff6a3fde5fb5abcde35d9e615abbe0560df62ca0d7fe9578",
    sha256: "726ac96626b93f5bcaff83a910b6c60d3a9728f063e0eb73b5d0819ffc356915",
    set: true,
  },
  {
    dependency: "paper@0.12.15",
    file: "paper-0.12.15.min.js",
    cid: "0x0d5097971b2cd7c7dc59d2213bd442d2526e45f50fe3e8ca1d6ae0cc9d439826",
    sha256: "7cef19f56270df49c30d5c6246f3806e3990d847ff9e3b6f9cdf1e4db72d16e9",
    set: true,
  },
  {
    dependency: "processing-js@1.4.6",
    file: "processing-1.4.6.min.js",
    cid: "0xa33cd228c16aba9b2a86b472f597b94337c4dd5518b5c118ea64046be9fbf35a",
    sha256: "5fe82ab91f2aa66bc7c736e4a5b50981b9e694318472217457b1b2acead6b1f6",
    set: true,
  },
  {
    dependency: "regl@2.1.0",
    file: "regl-2.1.0.min.js",
    cid: "0xbf30a9ec155317aa59f566a10586e806aedb8fd4c81d8b3e03daed11f2446ec1",
    sha256: "1e85c84ef254125921378d82f4da4e457a0a399bc315880c8c997dd5af8c534d",
    set: true,
  },
  {
    dependency: "three@0.124.0",
    file: "three-0.124.0.min.js",
    cid: "0x9c778204e85837626dd358d1bde277a92b77aa1e0b57907d5c29ab607d2ecdde",
    sha256: "a8a966c3de0bac23630957e8b6ceb1330725bc2889a0b2dad952d710797ba179",
    set: true,
    note: "the file matches the CDN; the registry's former on-chain copy lacked its trailing newline",
  },
  {
    dependency: "three@0.160.0",
    file: "three-0.160.0.min.js",
    cid: "0xb365a3d2493703623eeaa3ed28d0bdacbc12ee85e0b68027e3466f8a4a34ffd8",
    sha256: "170c6789f43217c96b3170f4b42fafe135de7f7cd48497a4218f9757ee1d49fa",
    set: true,
  },
  {
    dependency: "three@0.167.0",
    file: "three-0.167.0.module.min.js",
    cid: "0x46fe31692681614abe4d030fbc978b11e87c651605a1da9180dc1806da1447a5",
    sha256: "54a7a52ddce0ad06fbd1d021fd03b1e1812d946114a2111e1260bcd490c6b840",
    set: false,
    note: "ES module: stays on its CDN through the import map",
  },
  {
    dependency: "tone@14.8.15",
    file: "tone-14.8.15.js",
    cid: "0x327cd7e8d6b062e9405d5c5f695818adfb6d0d3f21b03184d9dbefffc23db2cd",
    sha256: "4d7c4cf19549784271e12048a2492326cfddd1f1f769b8e414f683f409d33890",
    set: true,
    note: "the registry's former on-chain copy was byte-identical gzip",
  },
  {
    dependency: "twemoji@14.0.2",
    file: "twemoji-14.0.2.min.js",
    cid: "0x30ab39eed50b480765c45231a9e0ea677847de7a3c07f482c5e6b7c7ff3cda23",
    sha256: "706224d8dc5440460f8ed91c1a6aad25d732af6e0ee6fb31151b157ab485babb",
    set: true,
  },
  {
    dependency: "zdog@1.1.2",
    file: "zdog-1.1.2.min.js",
    cid: "0x5ce0603da3175336e4c7a1e92d23065245f8e80e4ed6808591f94d4bb4d25890",
    sha256: "cb62c9957be311598a1ab0a5cfb722cf64618e4c610bea18ab51ca5491f76580",
    set: true,
  },
];

/**
 * Preferred CDN corrections sent in the same batch. zdog's registered URL floats on the major
 * version (`zdog@1`), so it now serves 1.1.3 for a dependency named 1.1.2; the pinned URL serves
 * the exact file stored on ABX FS. 1.1.3 differs from 1.1.2 only in whitespace and comments.
 */
export const PREFERRED_CDN_FIXES: {
  dependency: string;
  from: string;
  to: string;
}[] = [
  {
    dependency: "zdog@1.1.2",
    from: "https://unpkg.com/zdog@1/dist/zdog.dist.min.js",
    to: "https://unpkg.com/zdog@1.1.2/dist/zdog.dist.min.js",
  },
];

/**
 * Generator configuration corrected in the same superAdmin batch, keyed by network.
 * Sepolia's staging generator points at a ScriptyBuilder that reverts every render; the dev
 * generator's is the working one. The planner only adds the call while the value is `from`.
 */
export const GENERATOR_CONFIG_FIXES: Record<
  string,
  {
    label: string;
    generator: string;
    scriptyBuilder: { from: string; to: string };
  }[]
> = {
  sepolia: [
    {
      label: "staging",
      generator: "0xdC862938cA0a2D8dcabe5733C23e54ac7aAFFF27",
      scriptyBuilder: {
        from: "0xb205DFfE32259E2F1c3C0cba855250134147C083",
        to: "0xD7587F110E08F4D120A231bA97d3B577A81Df022",
      },
    },
  ],
  mainnet: [],
};

export type CheckToken = {
  /** The dependency the token's project resolves to. */
  dependency: string;
  core: string;
  tokenId: string;
};

/**
 * One live mainnet token per dependency, from the registry-driven rendering rollout's
 * baseline. The fork check renders each before and after the rollout. Includes controls whose
 * dependency has no ABX FS file, which must stay byte-identical.
 */
export const MAINNET_CHECK_TOKENS: CheckToken[] = [
  {
    dependency: "aframe@1.2.0",
    core: "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270",
    tokenId: "145000000",
  },
  {
    dependency: "babylon@5.0.0",
    core: "0x1353fd9d3dC70d1a18149C8FB2ADB4FB906DE4E8",
    tokenId: "4000000",
  },
  {
    dependency: "p5@1.0.0",
    core: "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270",
    tokenId: "3000000",
  },
  {
    dependency: "p5@1.9.0",
    core: "0xAB0000000000aa06f89B268D604a9c1C41524Ac6",
    tokenId: "497000000",
  },
  {
    dependency: "paper@0.12.15",
    core: "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270",
    tokenId: "161000000",
  },
  {
    dependency: "processing-js@1.4.6",
    core: "0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a",
    tokenId: "1000000",
  },
  {
    dependency: "regl@2.1.0",
    core: "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270",
    tokenId: "32000000",
  },
  {
    dependency: "three@0.124.0",
    core: "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270",
    tokenId: "22000000",
  },
  {
    dependency: "three@0.160.0",
    core: "0xAB0000000000aa06f89B268D604a9c1C41524Ac6",
    tokenId: "495000000",
  },
  {
    dependency: "three@0.167.0",
    core: "0xAB00000000002ADE39f58F9D8278a31574fFBe77",
    tokenId: "505000000",
  },
  {
    dependency: "tone@14.8.15",
    core: "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270",
    tokenId: "64000000",
  },
  {
    dependency: "twemoji@14.0.2",
    core: "0x99a9B7c1116f9ceEB1652de04d5969CcE509B069",
    tokenId: "457000000",
  },
  {
    dependency: "zdog@1.1.2",
    core: "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270",
    tokenId: "76000000",
  },
  // controls
  {
    dependency: "custom@na",
    core: "0xAB00000000002ADE39f58F9D8278a31574fFBe77",
    tokenId: "506000239",
  },
  {
    dependency: "js@na",
    core: "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270",
    tokenId: "8000000",
  },
  {
    dependency: "svg@na",
    core: "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270",
    tokenId: "12000000",
  },
];

/**
 * One live sepolia token per dependency, discovered by the registry-driven rendering rollout
 * (`deployments/generator/rollout-baselines/sepolia-checks.json`). Sepolia has no project on
 * aframe, babylon@5.0.0, paper, processing-js, twemoji or zdog; the mainnet fork covers those.
 * `dependency` is what the project resolves to on sepolia, including spellings that are not
 * registered there (rendered with defaults) and must not change.
 */
export const SEPOLIA_CHECK_TOKENS: CheckToken[] = [
  {
    dependency: "babylon@6.36.0",
    core: "0xd9F14781F6cBA1F4FFB0743BcFd5fC860d1da847",
    tokenId: "41000000",
  },
  {
    dependency: "custom@na",
    core: "0x12f976648178b0c37E7b7Ab218059b12b29dc78D",
    tokenId: "19000000",
  },
  {
    dependency: "js@na",
    core: "0x12f976648178b0c37E7b7Ab218059b12b29dc78D",
    tokenId: "119000000",
  },
  {
    dependency: "js@1.0.0",
    core: "0x8651eFeBA58F94A3785113B6Bc60a50Aa305df4c",
    tokenId: "24000000",
  },
  {
    dependency: "js@na",
    core: "0x12f976648178b0c37E7b7Ab218059b12b29dc78D",
    tokenId: "32000000",
  },
  {
    dependency: "p5@",
    core: "0xD574E7C79325ac6124EC58ef746ab285d72755a1",
    tokenId: "129000000",
  },
  {
    dependency: "p5@1.0.0",
    core: "0x12f976648178b0c37E7b7Ab218059b12b29dc78D",
    tokenId: "4000000",
  },
  {
    dependency: "p5@1.11.11",
    core: "0x12f976648178b0c37E7b7Ab218059b12b29dc78D",
    tokenId: "33000000",
  },
  {
    dependency: "p5@1.9.0",
    core: "0x12f976648178b0c37E7b7Ab218059b12b29dc78D",
    tokenId: "0",
  },
  {
    dependency: "regl@2.1.0",
    core: "0x12f976648178b0c37E7b7Ab218059b12b29dc78D",
    tokenId: "17000000",
  },
  {
    dependency: "svg@na",
    core: "0x12f976648178b0c37E7b7Ab218059b12b29dc78D",
    tokenId: "110000000",
  },
  {
    dependency: "three@",
    core: "0xD574E7C79325ac6124EC58ef746ab285d72755a1",
    tokenId: "98000000",
  },
  {
    dependency: "three@0.124.0",
    core: "0x12f976648178b0c37E7b7Ab218059b12b29dc78D",
    tokenId: "1000000",
  },
  {
    dependency: "three@0.160.0",
    core: "0xD574E7C79325ac6124EC58ef746ab285d72755a1",
    tokenId: "27000000",
  },
  {
    dependency: "three@0.167.0",
    core: "0x12f976648178b0c37E7b7Ab218059b12b29dc78D",
    tokenId: "78000000",
  },
  {
    dependency: "tone@14.8.15",
    core: "0x12f976648178b0c37E7b7Ab218059b12b29dc78D",
    tokenId: "277000000",
  },
];

export const CHECK_TOKENS: Record<string, CheckToken[]> = {
  mainnet: MAINNET_CHECK_TOKENS,
  sepolia: SEPOLIA_CHECK_TOKENS,
};
