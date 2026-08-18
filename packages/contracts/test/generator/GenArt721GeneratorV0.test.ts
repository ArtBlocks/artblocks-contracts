import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import zlib from "zlib";
import { expectRevert } from "@openzeppelin/test-helpers";

import {
  AdminACLV0,
  CoreRegistryV1,
  DependencyRegistryV0,
  MinterSetPriceV2,
  GenArt721GeneratorV0,
  GenArt721,
  BytecodeStorageV2Writer,
  UniversalBytecodeStorageReader,
  PMPV0,
} from "../../scripts/contracts";

import { constants } from "ethers";
import {
  getPMPInputConfig,
  getPMPInput,
  PMP_AUTH_ENUM,
  PMP_PARAM_TYPE_ENUM,
} from "../web3call/PMP/pmpTestUtils";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployWithStorageLibraryAndGet,
  deployAndGetUniversalReader,
  deployCoreWithMinterFilter,
  deployAndGetPBAB,
} from "../util/common";
import { StorageContractCreatedEvent } from "../../scripts/contracts/BytecodeStorageV2Writer";
import { GUNZIP_SCRIPT_BASE64 } from "../../scripts/util/constants";

const NO_OVERRIDE_ERROR =
  "Contract does not implement projectScriptDetails and has no override set.";
const ONLY_DEPENDENCY_REGISTRY_ADMIN_ACL_ERROR =
  "Only DependencyRegistry AdminACL";
const INVALID_DEPENDENCY_REGISTRY_ERROR =
  "Contract at the provided address is not a valid DependencyRegistry";

const ONE_MILLION = 1000000;

const CANVAS_TAG_TYPE = {
  NoCanvasTag: 0,
  CanvasBeforeProjectScript: 1,
  CanvasAfterProjectScript: 2,
} as const;

const PROJECT_SCRIPT_TAG_TYPE = {
  ClassicScript: 0,
  Module: 1,
  SpecialType: 2,
  RawHtml: 3,
} as const;

// Default styles injected by genArt721Generator
const STYLE_TAG =
  "<style>html{height:100%}body{min-height:100%;margin:0;padding:0}canvas{padding:0;margin:auto;display:block;position:absolute;top:0;bottom:0;left:0;right:0}</style>";

function getScriptTag(script: string) {
  return `<script>${script}</script>`;
}

function getScriptTagWithSrc(src: string) {
  return `<script type="text/javascript" src="${src}"></script>`;
}

function getScriptBase64DataUriScriptTag(script: string) {
  return `<script src="data:text/javascript;base64,${script}"></script>`;
}

function getGzipBase64DataUriScriptTag(script: string) {
  return `<script type="text/javascript+gzip" src="data:text/javascript;base64,${script}"></script>`;
}

function containsSpecificBetween(text, start, target, end) {
  const regex = new RegExp(`${start}.*?${target}.*?${end}`);
  return regex.test(text);
}

interface GenArt721GeneratorV0TestConfig extends T_Config {
  dependencyRegistry: DependencyRegistryV0;
  genArt721Generator: GenArt721GeneratorV0;
  scriptyBuilder: Contract;
  universalReader: UniversalBytecodeStorageReader;
}

// the json parser's reviver script used when parsing the token data
const REVIVER_SCRIPT =
  '(key, value) => key === "data" && value !== null ? value.startsWith("#web3call#") ? Object.entries(JSON.parse(atob(value.slice(10)))).reduce((acc, [k, v]) => ((acc[atob(k)] = atob(v)), acc), {}) : atob(value) : value)';

describe(`GenArt721GeneratorV0`, async function () {
  const p5NameAndVersion = "p5js@1.0.0";
  const p5NameAndVersionBytes =
    ethers.utils.formatBytes32String(p5NameAndVersion);
  const jsNameAndVersion = "js@na";
  const jsNameAndVersionBytes =
    ethers.utils.formatBytes32String(jsNameAndVersion);
  const customNameAndVersion = "custom@na";
  const customNameAndVersionBytes =
    ethers.utils.formatBytes32String(customNameAndVersion);
  const mitLicenseType = "MIT";
  const mitLicenseTypeBytes = ethers.utils.formatBytes32String(mitLicenseType);
  const naLicenseType = "NA";
  const naLicenseTypeBytes = ethers.utils.formatBytes32String(naLicenseType);
  const preferredCDN =
    "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.0.0/p5.min.js";
  const p5PreferredRepository = "https://github.com/processing/p5.js";
  const p5DependencyWebsite = "https://p5js.org/";
  // Arbitrary dependency script to test with
  const compressedDepScript = zlib
    .gzipSync(
      new Uint8Array(Buffer.from('let blah = "hello";let bleh = "goodbye";'))
    )
    .toString("base64");

  async function _beforeEach() {
    let config: T_Config & Partial<GenArt721GeneratorV0TestConfig> = {
      accounts: await getAccounts(),
    };
    config = (await assignDefaultConstants(config)) as T_Config &
      Partial<GenArt721GeneratorV0TestConfig>;

    config.adminACL = (await deployAndGet(config, "AdminACLV0")) as AdminACLV0;

    // Deploy and initialize dependency registry
    config.dependencyRegistry = (await deployAndGet(
      config,
      "DependencyRegistryV0"
    )) as DependencyRegistryV0;
    await config.dependencyRegistry
      .connect(config.accounts.deployer)
      .initialize(config.adminACL!.address);

    // assign universal reader
    const bytecodeStorageLibFactory = await ethers.getContractFactory(
      "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader"
    );
    const library = await bytecodeStorageLibFactory
      .connect(config.accounts.deployer)
      .deploy(/* no args for library ever */);
    const versionedReaderFactory = await ethers.getContractFactory(
      "BytecodeStorageReaderContractV2_Web3Call",
      { libraries: { BytecodeStorageReader: library.address } }
    );
    const versionedReader = await versionedReaderFactory
      .connect(config.accounts.deployer)
      .deploy();

    config.universalReader = await deployAndGet(
      config,
      "UniversalBytecodeStorageReader",
      [config.accounts.deployer.address]
    );
    await config.universalReader
      .connect(config.accounts.deployer)
      .updateBytecodeStorageReaderContract(versionedReader.address);

    // assign universal reader
    await config.dependencyRegistry
      .connect(config.accounts.deployer)
      .updateUniversalBytecodeStorageReader(config.universalReader?.address);

    // Add MIT license type to registry
    await config.dependencyRegistry
      .connect(config.accounts.deployer)
      .addLicenseType(mitLicenseTypeBytes);

    // Add "NA" license type to registry
    await config.dependencyRegistry.addLicenseType(naLicenseTypeBytes);

    // Add js to registry
    await config.dependencyRegistry.addDependency(
      jsNameAndVersionBytes,
      naLicenseTypeBytes,
      "",
      "",
      ""
    );

    // Add custom to registry
    await config.dependencyRegistry.addDependency(
      customNameAndVersionBytes,
      naLicenseTypeBytes,
      "",
      "",
      ""
    );

    // Add p5 to registry
    await config.dependencyRegistry.addDependency(
      p5NameAndVersionBytes,
      mitLicenseTypeBytes,
      preferredCDN,
      p5PreferredRepository,
      p5DependencyWebsite
    );

    // Configure rendering directives to match the registry's production state:
    // js@na projects draw into a canvas the generator provides, and custom@na project
    // scripts are complete HTML documents that must be injected verbatim.
    await config.dependencyRegistry.updateDependencyCanvasTagType(
      jsNameAndVersionBytes,
      CANVAS_TAG_TYPE.CanvasBeforeProjectScript
    );
    await config.dependencyRegistry.updateDependencyProjectScriptTagType(
      customNameAndVersionBytes,
      PROJECT_SCRIPT_TAG_TYPE.RawHtml,
      ""
    );

    // Add compressed dependency script to registry in two parts
    await config.dependencyRegistry.addDependencyScript(
      p5NameAndVersionBytes,
      compressedDepScript.slice(0, Math.floor(compressedDepScript.length / 2))
    );
    await config.dependencyRegistry.addDependencyScript(
      p5NameAndVersionBytes,
      compressedDepScript.slice(Math.floor(compressedDepScript.length / 2))
    );

    // Deploy BytecodeStorageV2Writer contract
    const bytecodeStorageV2Writer = (await deployWithStorageLibraryAndGet(
      config,
      "BytecodeStorageV2Writer"
    )) as BytecodeStorageV2Writer;

    // Use BytecodeStorageV2Writer to upload gunzip script
    const gunzipUploadTransaction =
      await bytecodeStorageV2Writer.writeStringToBytecodeStorage(
        GUNZIP_SCRIPT_BASE64
      );

    // Get address of gunzip storage contract from StorageContractCreated event
    const gunzipUploadReceipt = await gunzipUploadTransaction.wait();
    const storageContractCreatedEvent = gunzipUploadReceipt.events?.find(
      (event) => {
        if (event.event === "StorageContractCreated") {
          return true;
        }
      }
    );
    if (!storageContractCreatedEvent) {
      throw new Error("Failed to find StorageContractCreated event");
    }
    const gunzipStorageContractAddress = (
      storageContractCreatedEvent as StorageContractCreatedEvent
    ).args.storageContract;

    // Deploy scripty builder
    config.scriptyBuilder = await deployAndGet(config, "ScriptyBuilderV2");

    // deploy and get universalReader to use as input arg
    config.universalReader = await deployAndGetUniversalReader(config);

    // Deploy GenArt721GeneratorV0
    config.genArt721Generator = (await deployAndGet(
      config,
      "GenArt721GeneratorV0"
    )) as GenArt721GeneratorV0;

    await config.genArt721Generator!.initialize(
      config.dependencyRegistry.address,
      config.scriptyBuilder.address,
      gunzipStorageContractAddress,
      config.universalReader.address
    );

    // deploy core registry
    config.coreRegistry = (await deployAndGet(
      config,
      "CoreRegistryV1",
      []
    )) as CoreRegistryV1;

    // update core registry address on dependency registry
    await config.dependencyRegistry
      .connect(config.accounts.deployer)
      .updateCoreRegistryAddress(config.coreRegistry.address);

    return config as GenArt721GeneratorV0TestConfig;
  }

  // Deploys a V3 core with a single project whose script/type are configurable,
  // mints token 0, and returns the generator's HTML for it.
  async function setupProjectAndGetHtml(
    config: GenArt721GeneratorV0TestConfig,
    projectScript: string,
    scriptTypeBytes: string
  ) {
    const { genArt721Core: genArt721CoreV3, minterFilter } =
      await deployCoreWithMinterFilter(
        config,
        "GenArt721CoreV3",
        "MinterFilterV1"
      );

    const minter = (await deployAndGet(config, "MinterSetPriceV2", [
      genArt721CoreV3.address,
      minterFilter.address,
    ])) as MinterSetPriceV2;
    await minterFilter
      .connect(config.accounts.deployer)
      .addApprovedMinter(minter.address);

    const projectId = await genArt721CoreV3.nextProjectId();
    await genArt721CoreV3
      .connect(config.accounts.deployer)
      .addProject("name", config.accounts.artist.address);
    await genArt721CoreV3
      .connect(config.accounts.artist)
      .addProjectScript(projectId, projectScript);
    await genArt721CoreV3
      .connect(config.accounts.artist)
      .updateProjectScriptType(projectId, scriptTypeBytes);

    await minterFilter
      .connect(config.accounts.artist)
      .setMinterForProject(projectId, minter.address);
    await minter
      .connect(config.accounts.artist)
      .updatePricePerTokenInWei(projectId, 0);
    await minter.connect(config.accounts.artist).purchase(projectId);

    const tokenId = projectId.mul(ONE_MILLION);
    await config.coreRegistry
      ?.connect(config.accounts.deployer)
      .registerContract(
        genArt721CoreV3.address,
        ethers.utils.formatBytes32String("DUMMY_VERSION"),
        ethers.utils.formatBytes32String("DUMMY_TYPE")
      );

    return {
      tokenHtml: await config.genArt721Generator.getTokenHtml(
        genArt721CoreV3.address,
        tokenId
      ),
      genArt721CoreV3,
      tokenId,
    };
  }

  describe("getTokenHtml", function () {
    it("gets html for a given V0 core contract token with dependency on chain", async function () {
      const config = await loadFixture(_beforeEach);

      // Deploy core
      const genArt721CoreV0 = (await deployAndGet(config, "GenArt721", [
        config.name,
        config.symbol,
      ])) as GenArt721;

      // Add and configure project
      await genArt721CoreV0
        .connect(config.accounts.deployer)
        .addProject(0, true);

      await genArt721CoreV0
        .connect(config.accounts.deployer)
        .updateProjectArtistAddress(0, config.accounts.artist.address);

      await genArt721CoreV0
        .connect(config.accounts.artist)
        .updateProjectPricePerTokenInWei(0, 0);

      const projectScript =
        "console.log(tokenData); console.log(blah); console.log(bleh);";
      await genArt721CoreV0
        .connect(config.accounts.artist)
        .addProjectScript(0, projectScript);

      // Mint token 0
      await genArt721CoreV0.connect(config.accounts.artist).purchase(0);

      // Add contract to core registry
      await config.coreRegistry
        ?.connect(config.accounts.deployer)
        .registerContract(
          genArt721CoreV0.address,
          ethers.utils.formatBytes32String("DUMMY_VERSION"),
          ethers.utils.formatBytes32String("DUMMY_TYPE")
        );

      // Expect revert if dependency override not set for pre-V3 core contracts
      await expect(
        config.genArt721Generator.getTokenHtml(genArt721CoreV0.address, 0)
      ).to.be.revertedWith(NO_OVERRIDE_ERROR);

      // Add dependency override to dependency registry, necessary for V0 core contracts
      await config.dependencyRegistry
        .connect(config.accounts.deployer)
        .addProjectDependencyOverride(
          genArt721CoreV0.address,
          0,
          p5NameAndVersionBytes
        );

      // Get token html
      const tokenHtml = await config.genArt721Generator.getTokenHtml(
        genArt721CoreV0.address,
        0
      );
      const encodedTokenHtml =
        await config.genArt721Generator.getTokenHtmlBase64EncodedDataUri(
          genArt721CoreV0.address,
          0
        );

      // Default style
      expect(tokenHtml).to.include(STYLE_TAG);
      // Gzipped dependency script
      expect(tokenHtml).to.include(
        getGzipBase64DataUriScriptTag(compressedDepScript)
      );
      // Gunzip script
      expect(tokenHtml).to.include(
        getScriptBase64DataUriScriptTag(GUNZIP_SCRIPT_BASE64)
      );

      // Token data
      const hashes = await genArt721CoreV0.showTokenHashes(0);
      const hash = hashes[0];
      expect(tokenHtml).to.include(
        getScriptTag(
          `let tokenData = JSON.parse(\`{"tokenId":"0","hashes":["${hash}"]}\`, ${REVIVER_SCRIPT};`
        )
      );

      // Project script
      expect(tokenHtml).to.include(getScriptTag(projectScript));

      // Base64 encoded data uri
      expect(encodedTokenHtml).to.equal(
        `data:text/html;base64,${Buffer.from(tokenHtml).toString("base64")}`
      );
    });

    it("gets html for a given V1 core contract token with dependency on chain", async function () {
      const config = await loadFixture(_beforeEach);

      const {
        genArt721Core: genArt721CoreV1,
        minterFilter,
        randomizer,
      } = await deployCoreWithMinterFilter(
        config,
        "GenArt721CoreV1",
        "MinterFilterV0"
      );

      const minter = (await deployAndGet(config, "MinterSetPriceV2", [
        genArt721CoreV1.address,
        minterFilter.address,
      ])) as MinterSetPriceV2;

      await minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(minter.address);

      const projectId = await genArt721CoreV1.nextProjectId();
      // Add and configure project
      await genArt721CoreV1
        .connect(config.accounts.deployer)
        .addProject("name", config.accounts.artist.address, 0, true);

      const projectScript =
        "console.log(tokenData); console.log(blah); console.log(bleh);";
      await genArt721CoreV1
        .connect(config.accounts.artist)
        .addProjectScript(projectId, projectScript);

      // Mint token 0
      await minterFilter
        .connect(config.accounts.artist)
        .setMinterForProject(projectId, minter.address);
      await minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(projectId, 0);
      await minter.connect(config.accounts.artist).purchase(projectId);

      const tokenId = projectId.mul(ONE_MILLION);

      // Add contract to core registry
      await config.coreRegistry
        ?.connect(config.accounts.deployer)
        .registerContract(
          genArt721CoreV1.address,
          ethers.utils.formatBytes32String("DUMMY_VERSION"),
          ethers.utils.formatBytes32String("DUMMY_TYPE")
        );

      // Expect revert if dependency override not set for pre-V3 core contracts
      await expect(
        config.genArt721Generator.getTokenHtml(genArt721CoreV1.address, tokenId)
      ).to.be.revertedWith(NO_OVERRIDE_ERROR);

      // Add dependency override to dependency registry, necessary for V0 core contracts
      await config.dependencyRegistry
        .connect(config.accounts.deployer)
        .addProjectDependencyOverride(
          genArt721CoreV1.address,
          projectId,
          p5NameAndVersionBytes
        );

      // Get token html
      const tokenHtml = await config.genArt721Generator.getTokenHtml(
        genArt721CoreV1.address,
        tokenId
      );

      // Default style
      expect(tokenHtml).to.include(STYLE_TAG);
      // Gzipped dependency script
      expect(tokenHtml).to.include(
        getGzipBase64DataUriScriptTag(compressedDepScript)
      );
      // Gunzip script
      expect(tokenHtml).to.include(
        getScriptBase64DataUriScriptTag(GUNZIP_SCRIPT_BASE64)
      );
      // Token data
      const hash = await genArt721CoreV1.tokenIdToHash(tokenId);
      expect(tokenHtml).to.include(
        getScriptTag(
          `let tokenData = JSON.parse(\`{"tokenId":"${tokenId}","hash":"${hash}"}\`, ${REVIVER_SCRIPT};`
        )
      );
      // Project script
      expect(tokenHtml).to.include(getScriptTag(projectScript));
    });

    it("gets html for a given V2 core contract token with dependency on chain", async function () {
      const config = await loadFixture(_beforeEach);
      const { pbabToken: genArt721CoreV2, pbabMinter: minter } =
        await deployAndGetPBAB(config);

      const projectId = await genArt721CoreV2.nextProjectId();

      // Add and configure project
      await genArt721CoreV2
        .connect(config.accounts.deployer)
        .addProject("name", config.accounts.artist.address, 0);

      const projectScript =
        "console.log(tokenData); console.log(blah); console.log(bleh);";
      await genArt721CoreV2
        .connect(config.accounts.artist)
        .addProjectScript(projectId, projectScript);

      // Mint token 0
      await minter
        .connect(config.accounts.artist)
        ["purchase(uint256)"](projectId);

      const tokenId = projectId.mul(ONE_MILLION);

      // Add contract to core registry
      await config.coreRegistry
        ?.connect(config.accounts.deployer)
        .registerContract(
          genArt721CoreV2.address,
          ethers.utils.formatBytes32String("DUMMY_VERSION"),
          ethers.utils.formatBytes32String("DUMMY_TYPE")
        );

      // Expect revert if dependency override not set for pre-V3 core contracts
      await expect(
        config.genArt721Generator.getTokenHtml(genArt721CoreV2.address, tokenId)
      ).to.be.revertedWith(NO_OVERRIDE_ERROR);

      // Add dependency override to dependency registry, necessary for V0 core contracts
      await config.dependencyRegistry
        .connect(config.accounts.deployer)
        .addProjectDependencyOverride(
          genArt721CoreV2.address,
          projectId,
          p5NameAndVersionBytes
        );

      // Get token html
      const tokenHtml = await config.genArt721Generator.getTokenHtml(
        genArt721CoreV2.address,
        tokenId
      );

      const encodedTokenHtml =
        await config.genArt721Generator.getTokenHtmlBase64EncodedDataUri(
          genArt721CoreV2.address,
          tokenId
        );

      // Default style
      expect(tokenHtml).to.include(STYLE_TAG);
      // Gzipped dependency script
      expect(tokenHtml).to.include(
        getGzipBase64DataUriScriptTag(compressedDepScript)
      );
      // Gunzip script
      expect(tokenHtml).to.include(
        getScriptBase64DataUriScriptTag(GUNZIP_SCRIPT_BASE64)
      );
      // Token data
      const hash = await genArt721CoreV2.tokenIdToHash(tokenId);
      expect(tokenHtml).to.include(
        getScriptTag(
          `let tokenData = JSON.parse(\`{"tokenId":"${tokenId}","hash":"${hash}"}\`, ${REVIVER_SCRIPT};`
        )
      );
      // Project script
      expect(tokenHtml).to.include(getScriptTag(projectScript));

      // Base64 encoded data uri
      expect(encodedTokenHtml).to.equal(
        `data:text/html;base64,${Buffer.from(tokenHtml).toString("base64")}`
      );
    });

    it("gets html for a given V3 core contract token with dependency on chain [ @skip-on-coverage ]", async function () {
      const config = await loadFixture(_beforeEach);

      const {
        genArt721Core: genArt721CoreV3,
        minterFilter,
        randomizer,
      } = await deployCoreWithMinterFilter(
        config,
        "GenArt721CoreV3",
        "MinterFilterV1"
      );

      const minter = (await deployAndGet(config, "MinterSetPriceV2", [
        genArt721CoreV3.address,
        minterFilter.address,
      ])) as MinterSetPriceV2;

      await minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(minter.address);

      const projectId = await genArt721CoreV3.nextProjectId();
      // Add and configure project
      await genArt721CoreV3
        .connect(config.accounts.deployer)
        .addProject("name", config.accounts.artist.address);

      const projectScript =
        "console.log(tokenData); console.log(blah); console.log(bleh);";
      await genArt721CoreV3
        .connect(config.accounts.artist)
        .addProjectScript(projectId, projectScript);
      await genArt721CoreV3
        .connect(config.accounts.artist)
        .updateProjectScriptType(projectId, p5NameAndVersionBytes);

      // Mint token 0
      await minterFilter
        .connect(config.accounts.artist)
        .setMinterForProject(projectId, minter.address);
      await minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(projectId, 0);
      await minter.connect(config.accounts.artist).purchase(projectId);

      const tokenId = projectId.mul(ONE_MILLION);

      // Add contract to core registry
      await config.coreRegistry
        ?.connect(config.accounts.deployer)
        .registerContract(
          genArt721CoreV3.address,
          ethers.utils.formatBytes32String("DUMMY_VERSION"),
          ethers.utils.formatBytes32String("DUMMY_TYPE")
        );

      // Get token html
      const tokenHtml = await config.genArt721Generator.getTokenHtml(
        genArt721CoreV3.address,
        tokenId
      );

      const encodedTokenHtml =
        await config.genArt721Generator.getTokenHtmlBase64EncodedDataUri(
          genArt721CoreV3.address,
          tokenId
        );

      // Default style
      expect(tokenHtml).to.include(STYLE_TAG);
      // Gzipped dependency script
      expect(tokenHtml).to.include(
        getGzipBase64DataUriScriptTag(compressedDepScript)
      );
      // Gunzip script
      expect(tokenHtml).to.include(
        getScriptBase64DataUriScriptTag(GUNZIP_SCRIPT_BASE64)
      );
      // Token data
      const hash = await genArt721CoreV3.tokenIdToHash(tokenId);
      expect(tokenHtml).to.include(
        getScriptTag(
          `let tokenData = JSON.parse(\`{"tokenId":"${tokenId}","hash":"${hash}"}\`, ${REVIVER_SCRIPT};`
        )
      );
      // Project script
      expect(tokenHtml).to.include(getScriptTag(projectScript));

      // Base64 encoded data uri
      expect(encodedTokenHtml).to.equal(
        `data:text/html;base64,${Buffer.from(tokenHtml).toString("base64")}`
      );
    });

    it("gets html for a given V3 core contract using script compression", async function () {
      const config = await loadFixture(_beforeEach);

      const {
        genArt721Core: genArt721CoreV3,
        minterFilter,
        randomizer,
      } = await deployCoreWithMinterFilter(
        config,
        "GenArt721CoreV3_Engine",
        "MinterFilterV1"
      );

      const minter = (await deployAndGet(config, "MinterSetPriceV2", [
        genArt721CoreV3.address,
        minterFilter.address,
      ])) as MinterSetPriceV2;

      await minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(minter.address);

      const projectId = await genArt721CoreV3.nextProjectId();
      // Add and configure project
      await genArt721CoreV3
        .connect(config.accounts.deployer)
        .addProject("name", config.accounts.artist.address);

      const projectScript =
        "console.log(tokenData); console.log(blah); console.log(bleh);";
      const projectScriptCompressed =
        await genArt721CoreV3.getCompressed(projectScript);
      await genArt721CoreV3
        .connect(config.accounts.artist)
        .addProjectScriptCompressed(projectId, projectScriptCompressed);
      await genArt721CoreV3
        .connect(config.accounts.artist)
        .updateProjectScriptType(projectId, p5NameAndVersionBytes);

      // Mint token 0
      await minterFilter
        .connect(config.accounts.artist)
        .setMinterForProject(projectId, minter.address);
      await minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(projectId, 0);
      await minter.connect(config.accounts.artist).purchase(projectId);

      const tokenId = projectId.mul(ONE_MILLION);

      // Add contract to core registry
      await config.coreRegistry
        ?.connect(config.accounts.deployer)
        .registerContract(
          genArt721CoreV3.address,
          ethers.utils.formatBytes32String("DUMMY_VERSION"),
          ethers.utils.formatBytes32String("DUMMY_TYPE")
        );

      // Get token html
      const tokenHtml = await config.genArt721Generator.getTokenHtml(
        genArt721CoreV3.address,
        tokenId
      );

      const encodedTokenHtml =
        await config.genArt721Generator.getTokenHtmlBase64EncodedDataUri(
          genArt721CoreV3.address,
          tokenId
        );

      // Default style
      expect(tokenHtml).to.include(STYLE_TAG);
      // Gzipped dependency script
      expect(tokenHtml).to.include(
        getGzipBase64DataUriScriptTag(compressedDepScript)
      );
      // Gunzip script
      expect(tokenHtml).to.include(
        getScriptBase64DataUriScriptTag(GUNZIP_SCRIPT_BASE64)
      );
      // Token data
      const hash = await genArt721CoreV3.tokenIdToHash(tokenId);
      expect(tokenHtml).to.include(
        getScriptTag(
          `let tokenData = JSON.parse(\`{"tokenId":"${tokenId}","hash":"${hash}"}\`, ${REVIVER_SCRIPT};`
        )
      );
      // Project script
      expect(tokenHtml).to.include(getScriptTag(projectScript));

      // Base64 encoded data uri
      expect(encodedTokenHtml).to.equal(
        `data:text/html;base64,${Buffer.from(tokenHtml).toString("base64")}`
      );
    });

    describe("flex", function () {
      it("gets html for a V3 flex with all flex dependency types", async function () {
        const config = await loadFixture(_beforeEach);

        const {
          genArt721Core: genArt721CoreV3,
          minterFilter,
          randomizer,
        } = await deployCoreWithMinterFilter(
          config,
          "GenArt721CoreV3_Engine_Flex",
          "MinterFilterV1"
        );

        const minter = (await deployAndGet(config, "MinterSetPriceV2", [
          genArt721CoreV3.address,
          minterFilter.address,
        ])) as MinterSetPriceV2;

        await minterFilter
          .connect(config.accounts.deployer)
          .addApprovedMinter(minter.address);

        const projectId = await genArt721CoreV3.nextProjectId();
        // Add and configure project
        await genArt721CoreV3
          .connect(config.accounts.deployer)
          .addProject("name", config.accounts.artist.address);

        const projectScript =
          "console.log(tokenData); console.log(blah); console.log(bleh);";
        const projectScriptCompressed =
          await genArt721CoreV3.getCompressed(projectScript);
        await genArt721CoreV3
          .connect(config.accounts.artist)
          .addProjectScriptCompressed(projectId, projectScriptCompressed);
        await genArt721CoreV3
          .connect(config.accounts.artist)
          .updateProjectScriptType(projectId, p5NameAndVersionBytes);

        // Mint token 0
        await minterFilter
          .connect(config.accounts.artist)
          .setMinterForProject(projectId, minter.address);
        await minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(projectId, 0);
        await minter.connect(config.accounts.artist).purchase(projectId);

        const tokenId = projectId.mul(ONE_MILLION);

        // Add contract to core registry
        await config.coreRegistry
          ?.connect(config.accounts.deployer)
          .registerContract(
            genArt721CoreV3.address,
            ethers.utils.formatBytes32String("DUMMY_VERSION"),
            ethers.utils.formatBytes32String("DUMMY_TYPE")
          );

        // define preferred gateways
        const preferredIpfsGateway = "https://ipfs.io/ipfs/";
        const preferredArweaveGateway = "https://arweave.net/";
        await genArt721CoreV3.updateIPFSGateway(preferredIpfsGateway);
        await genArt721CoreV3.updateArweaveGateway(preferredArweaveGateway);
        // add all flex dependencies
        // 0 - IPFS
        const ipfsCid = "cidIpfsTest";
        await genArt721CoreV3.addProjectExternalAssetDependency(
          projectId,
          ipfsCid,
          0 // IPFS
        );
        // 1 - ARWEAVE
        const arweaveCid = "cidArweaveTest";
        await genArt721CoreV3.addProjectExternalAssetDependency(
          projectId,
          arweaveCid,
          1 // ARWEAVE
        );
        // 2 - ONCHAIN
        const onchainData = "1234567890123456789012345678901234567890";
        await genArt721CoreV3.addProjectExternalAssetDependency(
          projectId,
          onchainData,
          2 // ONCHAIN
        );
        // 3 - ART_BLOCKS_DEPENDENCY_REGISTRY
        const onchainLibraryName = "p5js@1.0.0";
        await genArt721CoreV3.addProjectExternalAssetDependency(
          projectId,
          onchainLibraryName,
          3 // ART_BLOCKS_DEPENDENCY_REGISTRY
        );

        // Get token html
        const tokenHtml = await config.genArt721Generator.getTokenHtml(
          genArt721CoreV3.address,
          tokenId
        );

        const encodedTokenHtml =
          await config.genArt721Generator.getTokenHtmlBase64EncodedDataUri(
            genArt721CoreV3.address,
            tokenId
          );

        // Default style
        expect(tokenHtml).to.include(STYLE_TAG);
        // Gzipped dependency script
        expect(tokenHtml).to.include(
          getGzipBase64DataUriScriptTag(compressedDepScript)
        );
        // Gunzip script
        expect(tokenHtml).to.include(
          getScriptBase64DataUriScriptTag(GUNZIP_SCRIPT_BASE64)
        );
        // Token data
        const hash = await genArt721CoreV3.tokenIdToHash(tokenId);
        console.log("TOKEN_HTML", tokenHtml);
        expect(tokenHtml).to.include(
          getScriptTag(
            `let tokenData = JSON.parse(\`{"tokenId":"${tokenId}","hash":"${hash}","preferredArweaveGateway":"${preferredArweaveGateway}","preferredIPFSGateway":"${preferredIpfsGateway}","externalAssetDependencies":[{"dependency_type":"IPFS","cid":"${ipfsCid}","data":""},{"dependency_type":"ARWEAVE","cid":"${arweaveCid}","data":""},{"dependency_type":"ONCHAIN","cid":"","data":"${btoa(onchainData)}"},{"dependency_type":"ART_BLOCKS_DEPENDENCY_REGISTRY","cid":"${onchainLibraryName}","data":""}]}\`, ${REVIVER_SCRIPT};`
          )
        );
        // flex Dependency Registry injected script was injected in the head element (whereas the project script was injected in the body element)
        expect(
          containsSpecificBetween(
            tokenHtml,
            "<head>",
            compressedDepScript,
            "</head>"
          )
        ).to.be.true;
        // typical dependency script was injected in the body element
        expect(
          containsSpecificBetween(
            tokenHtml,
            "<body>",
            compressedDepScript,
            "</body>"
          )
        );
        expect(tokenHtml).to.include;
        // Project script
        expect(tokenHtml).to.include(getScriptTag(projectScript));

        // Base64 encoded data uri
        expect(encodedTokenHtml).to.equal(
          `data:text/html;base64,${Buffer.from(tokenHtml).toString("base64")}`
        );
      });

      it("injects web3call parameters for a web3call flex dependency", async function () {
        const config = await loadFixture(_beforeEach);

        const {
          genArt721Core: genArt721CoreV3,
          minterFilter,
          randomizer,
        } = await deployCoreWithMinterFilter(
          config,
          "GenArt721CoreV3_Engine_Flex",
          "MinterFilterV1"
        );

        const minter = (await deployAndGet(config, "MinterSetPriceV2", [
          genArt721CoreV3.address,
          minterFilter.address,
        ])) as MinterSetPriceV2;

        await minterFilter
          .connect(config.accounts.deployer)
          .addApprovedMinter(minter.address);

        const projectId = await genArt721CoreV3.nextProjectId();
        // Add and configure project
        await genArt721CoreV3
          .connect(config.accounts.deployer)
          .addProject("name", config.accounts.artist.address);

        const projectScript =
          "console.log(tokenData); console.log(blah); console.log(bleh);";
        const projectScriptCompressed =
          await genArt721CoreV3.getCompressed(projectScript);
        await genArt721CoreV3
          .connect(config.accounts.artist)
          .addProjectScriptCompressed(projectId, projectScriptCompressed);
        await genArt721CoreV3
          .connect(config.accounts.artist)
          .updateProjectScriptType(projectId, p5NameAndVersionBytes);

        // Mint token 0
        await minterFilter
          .connect(config.accounts.artist)
          .setMinterForProject(projectId, minter.address);
        await minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(projectId, 0);
        await minter.connect(config.accounts.artist).purchase(projectId);

        const tokenId = projectId.mul(ONE_MILLION);

        // Add contract to core registry
        await config.coreRegistry
          ?.connect(config.accounts.deployer)
          .registerContract(
            genArt721CoreV3.address,
            ethers.utils.formatBytes32String("DUMMY_VERSION"),
            ethers.utils.formatBytes32String("DUMMY_TYPE")
          );

        // deploy PMP contract as our web3call contract
        const delegateRegistryV2 = await deployAndGet(
          config,
          "DelegateRegistry",
          []
        );
        const pmp = (await deployAndGet(config, "PMPV0", [
          delegateRegistryV2.address,
        ])) as PMPV0;

        // add PMP as a web3call contract
        await genArt721CoreV3.addProjectAssetDependencyOnChainAtAddress(
          projectId,
          pmp.address
        );

        // get token html
        const tokenHtml = await config.genArt721Generator.getTokenHtml(
          genArt721CoreV3.address,
          tokenId
        );

        // check that the token html includes empty web3call parameters, encoded as base64
        // @dev "e30=" is the base64 encoded empty json object, "{}"
        expect(tokenHtml).to.include('"data":"#web3call#e30="');

        // artist configures project with PMP parameters
        const pmpConfig1 = getPMPInputConfig(
          "param1",
          PMP_AUTH_ENUM.ArtistAndTokenOwner,
          PMP_PARAM_TYPE_ENUM.String,
          0,
          constants.AddressZero,
          [],
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
        await pmp
          .connect(config.accounts.artist)
          .configureProject(genArt721CoreV3.address, projectId, [pmpConfig1]);

        // should still be empty object because unconfigured for tokens
        // get token html
        const tokenHtml2 = await config.genArt721Generator.getTokenHtml(
          genArt721CoreV3.address,
          tokenId
        );
        // check that the token html includes the web3call parameters
        expect(tokenHtml2).to.include('"data":"#web3call#e30="');

        // artist configures PMP for token 0
        const pmpInput = getPMPInput(
          "param1",
          PMP_PARAM_TYPE_ENUM.String,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          false,
          `]Handle This {[,'"@#$@#%@#$%#%$%`
        );
        await pmp
          .connect(config.accounts.artist)
          .configureTokenParams(genArt721CoreV3.address, tokenId, [pmpInput]);

        // get token html
        const tokenHtml3 = await config.genArt721Generator.getTokenHtml(
          genArt721CoreV3.address,
          tokenId
        );
        // verify that the token html includes the web3call parameters
        // @dev eyJjR0Z5WVcweCI6IlhVaGhibVJzWlNCVWFHbHpJSHRiTENjaVFDTWtRQ01sUUNNa0pTTWxKQ1U9In0= is base64 encoded json object of prescribed base64 encoded key/value pair
        expect(tokenHtml3).to.include(
          '"externalAssetDependencies":[{"dependency_type":"ONCHAIN","cid":"","data":"#web3call#eyJjR0Z5WVcweCI6IlhVaGhibVJzWlNCVWFHbHpJSHRiTENjaVFDTWtRQ01sUUNNa0pTTWxKQ1U9In0="}]'
        );
      });
    });

    describe("custom@na raw HTML injection", function () {
      // @dev mirrors the shape of real custom@na projects (e.g. Quine, send/receive):
      // a complete HTML document that itself contains "</script>"
      const rawHtmlProjectScript = [
        "<!DOCTYPE html>",
        "<html><head><style>body{background:#000}</style></head><body>",
        "<script>const early = tokenData.hash;</script>",
        "<script>console.log(early);</script>",
        "</body></html>",
      ].join("\n");

      it("injects the project script verbatim, without a wrapping script tag", async function () {
        const config = await loadFixture(_beforeEach);
        const { tokenHtml } = await setupProjectAndGetHtml(
          config,
          rawHtmlProjectScript,
          customNameAndVersionBytes
        );

        // the document is present byte-for-byte, and is NOT wrapped in a script tag
        expect(tokenHtml).to.include(rawHtmlProjectScript);
        expect(tokenHtml).to.not.include(getScriptTag(rawHtmlProjectScript));
        // the project's own script tags survive as real, parseable tags
        expect(tokenHtml).to.include(
          "<script>const early = tokenData.hash;</script>"
        );
        // the document is the final element of the body, immediately before </body>
        expect(tokenHtml).to.include(`${rawHtmlProjectScript}</body></html>`);
      });

      it("omits the default style reset for raw HTML documents", async function () {
        const config = await loadFixture(_beforeEach);
        const { tokenHtml } = await setupProjectAndGetHtml(
          config,
          rawHtmlProjectScript,
          customNameAndVersionBytes
        );

        expect(tokenHtml).to.not.include(STYLE_TAG);
        // the generator contributes no styling of its own; the only <style> in the
        // output is the one belonging to the project's own document
        const generatorEmitted = tokenHtml.slice(
          0,
          tokenHtml.indexOf(rawHtmlProjectScript)
        );
        expect(generatorEmitted).to.not.include("<style>");
      });

      it("still injects tokenData so the raw document can consume it", async function () {
        const config = await loadFixture(_beforeEach);
        const { tokenHtml, genArt721CoreV3, tokenId } =
          await setupProjectAndGetHtml(
            config,
            rawHtmlProjectScript,
            customNameAndVersionBytes
          );

        const hash = await genArt721CoreV3.tokenIdToHash(tokenId);
        expect(tokenHtml).to.include(
          getScriptTag(
            `let tokenData = JSON.parse(\`{"tokenId":"${tokenId}","hash":"${hash}"}\`, ${REVIVER_SCRIPT};`
          )
        );
        // tokenData must be defined before the raw document runs
        expect(tokenHtml.indexOf("let tokenData")).to.be.lessThan(
          tokenHtml.indexOf(rawHtmlProjectScript)
        );
      });

      it("does not add a canvas tag for custom@na", async function () {
        const config = await loadFixture(_beforeEach);
        const { tokenHtml } = await setupProjectAndGetHtml(
          config,
          rawHtmlProjectScript,
          customNameAndVersionBytes
        );

        expect(tokenHtml).to.not.include("<canvas id=");
      });

      it("leaves non-custom@na dependencies wrapped and unescaped", async function () {
        const config = await loadFixture(_beforeEach);
        // @dev some live projects (e.g. PRELUDES, Crypt) deliberately close the
        // wrapping script tag to append their own markup, and must keep working
        const breakoutScript =
          "let a = 1;</script><style>body{margin:0}</style><body><canvas></canvas>";
        const { tokenHtml } = await setupProjectAndGetHtml(
          config,
          breakoutScript,
          p5NameAndVersionBytes
        );

        expect(tokenHtml).to.include(getScriptTag(breakoutScript));
        expect(tokenHtml).to.include(STYLE_TAG);
      });
    });

    // @dev these cover the fields that replaced the generator's hardcoded dependency-name
    // branching. Every rendering decision below is data in the registry, so a dependency
    // added in the future is supported by configuration rather than a contract upgrade.
    describe("registry-driven rendering", function () {
      const moduleNameAndVersion = "three@0.167.0";
      const moduleNameAndVersionBytes =
        ethers.utils.formatBytes32String(moduleNameAndVersion);
      const moduleCDN =
        "https://unpkg.com/three@0.167.0/build/three.module.min.js";
      const projectScript = "console.log(tokenData);";

      // Registers a dependency with no on-chain script and all rendering directives
      // left at their default values.
      async function addDependency(
        config: GenArt721GeneratorV0TestConfig,
        nameAndVersionBytes: string,
        cdn: string
      ) {
        await config.dependencyRegistry
          .connect(config.accounts.deployer)
          .addDependency(nameAndVersionBytes, mitLicenseTypeBytes, cdn, "", "");
      }

      const importMapTag = (name: string, url: string) =>
        `<script type="importmap">{"imports":{"${name}":"${url}"}}</script>`;

      describe("projectScriptTagType", function () {
        it("wraps the project script in a classic script tag by default", async function () {
          const config = await loadFixture(_beforeEach);
          await addDependency(config, moduleNameAndVersionBytes, moduleCDN);

          const { tokenHtml } = await setupProjectAndGetHtml(
            config,
            projectScript,
            moduleNameAndVersionBytes
          );

          expect(tokenHtml).to.include(getScriptTag(projectScript));
        });

        it("wraps the project script in a module script tag when prescribed", async function () {
          const config = await loadFixture(_beforeEach);
          await addDependency(config, moduleNameAndVersionBytes, moduleCDN);
          await config.dependencyRegistry
            .connect(config.accounts.deployer)
            .updateDependencyProjectScriptTagType(
              moduleNameAndVersionBytes,
              PROJECT_SCRIPT_TAG_TYPE.Module,
              ""
            );

          const { tokenHtml } = await setupProjectAndGetHtml(
            config,
            projectScript,
            moduleNameAndVersionBytes
          );

          expect(tokenHtml).to.include(
            `<script type="module">${projectScript}</script>`
          );
          expect(tokenHtml).to.not.include(getScriptTag(projectScript));
        });

        it("uses the dependency's configured type attribute for SpecialType", async function () {
          const config = await loadFixture(_beforeEach);
          await addDependency(config, moduleNameAndVersionBytes, moduleCDN);
          // @dev deliberately not "application/processing" - the generator no longer knows
          // about any particular special type, it only echoes what the registry stores
          await config.dependencyRegistry
            .connect(config.accounts.deployer)
            .updateDependencyProjectScriptTagType(
              moduleNameAndVersionBytes,
              PROJECT_SCRIPT_TAG_TYPE.SpecialType,
              "application/x-example"
            );

          const { tokenHtml } = await setupProjectAndGetHtml(
            config,
            projectScript,
            moduleNameAndVersionBytes
          );

          expect(tokenHtml).to.include(
            `<script type='application/x-example'>${projectScript}</script>`
          );
        });

        it("injects the project script verbatim for RawHtml", async function () {
          const config = await loadFixture(_beforeEach);
          await addDependency(config, moduleNameAndVersionBytes, moduleCDN);
          await config.dependencyRegistry
            .connect(config.accounts.deployer)
            .updateDependencyProjectScriptTagType(
              moduleNameAndVersionBytes,
              PROJECT_SCRIPT_TAG_TYPE.RawHtml,
              ""
            );

          const rawDocument = "<html><body>hi</body></html>";
          const { tokenHtml } = await setupProjectAndGetHtml(
            config,
            rawDocument,
            moduleNameAndVersionBytes
          );

          expect(tokenHtml).to.include(rawDocument);
          expect(tokenHtml).to.not.include(getScriptTag(rawDocument));
          expect(tokenHtml).to.not.include(STYLE_TAG);
        });
      });

      describe("loadAsModule", function () {
        it("emits an import map keyed on the dependency name", async function () {
          const config = await loadFixture(_beforeEach);
          await addDependency(config, moduleNameAndVersionBytes, moduleCDN);
          await config.dependencyRegistry
            .connect(config.accounts.deployer)
            .updateDependencyLoadAsModule(moduleNameAndVersionBytes, true);
          await config.dependencyRegistry
            .connect(config.accounts.deployer)
            .updateDependencyProjectScriptTagType(
              moduleNameAndVersionBytes,
              PROJECT_SCRIPT_TAG_TYPE.Module,
              ""
            );

          const { tokenHtml } = await setupProjectAndGetHtml(
            config,
            projectScript,
            moduleNameAndVersionBytes
          );

          expect(tokenHtml).to.include(importMapTag("three", moduleCDN));
          // the import map must be parsed before any module is evaluated
          expect(tokenHtml.indexOf("importmap")).to.be.lessThan(
            tokenHtml.indexOf('<script type="module">')
          );
        });

        it("omits the dependency's own script tag, which the import map replaces", async function () {
          const config = await loadFixture(_beforeEach);
          await addDependency(config, moduleNameAndVersionBytes, moduleCDN);
          await config.dependencyRegistry
            .connect(config.accounts.deployer)
            .updateDependencyLoadAsModule(moduleNameAndVersionBytes, true);

          const { tokenHtml } = await setupProjectAndGetHtml(
            config,
            projectScript,
            moduleNameAndVersionBytes
          );

          // loading an ES module as a classic script raises a syntax error on its exports
          expect(tokenHtml).to.not.include(getScriptTagWithSrc(moduleCDN));
          expect(tokenHtml).to.include(importMapTag("three", moduleCDN));
        });

        it("omits an on-chain module dependency's script, deferring to its CDN", async function () {
          const config = await loadFixture(_beforeEach);
          await addDependency(config, moduleNameAndVersionBytes, moduleCDN);
          await config.dependencyRegistry
            .connect(config.accounts.deployer)
            .addDependencyScript(
              moduleNameAndVersionBytes,
              compressedDepScript
            );
          await config.dependencyRegistry
            .connect(config.accounts.deployer)
            .updateDependencyLoadAsModule(moduleNameAndVersionBytes, true);

          const { tokenHtml } = await setupProjectAndGetHtml(
            config,
            projectScript,
            moduleNameAndVersionBytes
          );

          // @dev on-chain ES modules require inflating to a blob URL before the import map
          // is built, which is not supported yet; the CDN is authoritative for modules
          expect(tokenHtml).to.not.include(
            getGzipBase64DataUriScriptTag(compressedDepScript)
          );
          expect(tokenHtml).to.include(importMapTag("three", moduleCDN));
        });

        it("emits no import map for a non-module dependency", async function () {
          const config = await loadFixture(_beforeEach);
          await addDependency(config, moduleNameAndVersionBytes, moduleCDN);

          const { tokenHtml } = await setupProjectAndGetHtml(
            config,
            projectScript,
            moduleNameAndVersionBytes
          );

          expect(tokenHtml).to.not.include("importmap");
          expect(tokenHtml).to.include(getScriptTagWithSrc(moduleCDN));
        });
      });

      describe("canvasTagType", function () {
        it("emits no canvas by default", async function () {
          const config = await loadFixture(_beforeEach);
          await addDependency(config, moduleNameAndVersionBytes, moduleCDN);

          const { tokenHtml } = await setupProjectAndGetHtml(
            config,
            projectScript,
            moduleNameAndVersionBytes
          );

          expect(tokenHtml).to.not.include("<canvas id=");
        });

        it("places the canvas before the project script when prescribed", async function () {
          const config = await loadFixture(_beforeEach);
          await addDependency(config, moduleNameAndVersionBytes, moduleCDN);
          await config.dependencyRegistry
            .connect(config.accounts.deployer)
            .updateDependencyCanvasTagType(
              moduleNameAndVersionBytes,
              CANVAS_TAG_TYPE.CanvasBeforeProjectScript
            );

          const { tokenHtml } = await setupProjectAndGetHtml(
            config,
            projectScript,
            moduleNameAndVersionBytes
          );

          // the canvas is named for the dependency, not the project
          expect(tokenHtml).to.include("<canvas id='three-canvas'></canvas>");
          expect(
            tokenHtml.indexOf("<canvas id='three-canvas'>")
          ).to.be.lessThan(tokenHtml.indexOf(getScriptTag(projectScript)));
        });

        it("places the canvas after the project script when prescribed", async function () {
          const config = await loadFixture(_beforeEach);
          await addDependency(config, moduleNameAndVersionBytes, moduleCDN);
          await config.dependencyRegistry
            .connect(config.accounts.deployer)
            .updateDependencyCanvasTagType(
              moduleNameAndVersionBytes,
              CANVAS_TAG_TYPE.CanvasAfterProjectScript
            );

          const { tokenHtml } = await setupProjectAndGetHtml(
            config,
            projectScript,
            moduleNameAndVersionBytes
          );

          expect(
            tokenHtml.indexOf("<canvas id='three-canvas'>")
          ).to.be.greaterThan(tokenHtml.indexOf(getScriptTag(projectScript)));
        });
      });

      it("changes rendering when the registry changes, with no generator upgrade", async function () {
        const config = await loadFixture(_beforeEach);
        await addDependency(config, moduleNameAndVersionBytes, moduleCDN);

        const { tokenHtml, genArt721CoreV3, tokenId } =
          await setupProjectAndGetHtml(
            config,
            projectScript,
            moduleNameAndVersionBytes
          );
        expect(tokenHtml).to.include(getScriptTag(projectScript));
        expect(tokenHtml).to.not.include("<canvas id=");

        await config.dependencyRegistry
          .connect(config.accounts.deployer)
          .updateDependencyCanvasTagType(
            moduleNameAndVersionBytes,
            CANVAS_TAG_TYPE.CanvasBeforeProjectScript
          );
        await config.dependencyRegistry
          .connect(config.accounts.deployer)
          .updateDependencyProjectScriptTagType(
            moduleNameAndVersionBytes,
            PROJECT_SCRIPT_TAG_TYPE.Module,
            ""
          );
        await config.dependencyRegistry
          .connect(config.accounts.deployer)
          .updateDependencyLoadAsModule(moduleNameAndVersionBytes, true);

        const updatedHtml = await config.genArt721Generator.getTokenHtml(
          genArt721CoreV3.address,
          tokenId
        );

        expect(updatedHtml).to.include(
          `<script type="module">${projectScript}</script>`
        );
        expect(updatedHtml).to.include("<canvas id='three-canvas'></canvas>");
        expect(updatedHtml).to.include(importMapTag("three", moduleCDN));
      });
    });
  });

  it("gets html for a given V3 core contract token with dependency script not on-chain", async function () {
    const config = await loadFixture(_beforeEach);

    const threeNameAndVersion = "three@0.124.0";
    const threeNameAndVersionBytes =
      ethers.utils.formatBytes32String(threeNameAndVersion);
    const threePreferredCDN =
      "https://cdnjs.cloudflare.com/ajax/libs/three.js/r124/three.min.js";

    // Add new dependency without script
    await config.dependencyRegistry.addDependency(
      threeNameAndVersionBytes,
      mitLicenseTypeBytes,
      threePreferredCDN,
      "",
      ""
    );

    const {
      genArt721Core: genArt721CoreV3,
      minterFilter,
      randomizer,
    } = await deployCoreWithMinterFilter(
      config,
      "GenArt721CoreV3",
      "MinterFilterV1"
    );

    const minter = (await deployAndGet(config, "MinterSetPriceV2", [
      genArt721CoreV3.address,
      minterFilter.address,
    ])) as MinterSetPriceV2;

    await minterFilter
      .connect(config.accounts.deployer)
      .addApprovedMinter(minter.address);

    const projectId = await genArt721CoreV3.nextProjectId();
    // Add and configure project
    await genArt721CoreV3
      .connect(config.accounts.deployer)
      .addProject("name", config.accounts.artist.address);

    const projectScript = "console.log(tokenData); console.log(THREE);";
    await genArt721CoreV3
      .connect(config.accounts.artist)
      .addProjectScript(projectId, projectScript);
    await genArt721CoreV3
      .connect(config.accounts.artist)
      .updateProjectScriptType(projectId, threeNameAndVersionBytes);

    // Mint token 0
    await minterFilter
      .connect(config.accounts.artist)
      .setMinterForProject(projectId, minter.address);
    await minter
      .connect(config.accounts.artist)
      .updatePricePerTokenInWei(projectId, 0);
    await minter.connect(config.accounts.artist).purchase(projectId);

    const tokenId = projectId.mul(ONE_MILLION);

    // Add contract to core registry
    await config.coreRegistry
      ?.connect(config.accounts.deployer)
      .registerContract(
        genArt721CoreV3.address,
        ethers.utils.formatBytes32String("DUMMY_VERSION"),
        ethers.utils.formatBytes32String("DUMMY_TYPE")
      );

    // Get token html
    const tokenHtml = await config.genArt721Generator.getTokenHtml(
      genArt721CoreV3.address,
      tokenId
    );
    const encodedTokenHtml =
      await config.genArt721Generator.getTokenHtmlBase64EncodedDataUri(
        genArt721CoreV3.address,
        tokenId
      );

    // Default style
    expect(tokenHtml).to.include(STYLE_TAG);
    // Dependency cdn script
    expect(tokenHtml).to.include(getScriptTagWithSrc(threePreferredCDN));
    // Gunzip script
    expect(tokenHtml).to.include(
      getScriptBase64DataUriScriptTag(GUNZIP_SCRIPT_BASE64)
    );
    // Project script
    expect(tokenHtml).to.include(getScriptTag(projectScript));

    // Base64 encoded data uri
    expect(encodedTokenHtml).to.equal(
      `data:text/html;base64,${Buffer.from(tokenHtml).toString("base64")}`
    );
  });

  it("includes canvas tag for relevant dependencies", async function () {
    const config = await loadFixture(_beforeEach);
    const { genArt721Core: genArt721CoreV3, minterFilter } =
      await deployCoreWithMinterFilter(
        config,
        "GenArt721CoreV3",
        "MinterFilterV1"
      );

    const minter = (await deployAndGet(config, "MinterSetPriceV2", [
      genArt721CoreV3.address,
      minterFilter.address,
    ])) as MinterSetPriceV2;

    await minterFilter
      .connect(config.accounts.deployer)
      .addApprovedMinter(minter.address);

    const projectId = await genArt721CoreV3.nextProjectId();
    const projectScript = "console.log('test')";

    // Create project
    await genArt721CoreV3
      .connect(config.accounts.deployer)
      .addProject("Test Project", config.accounts.artist.address);

    // Add project script
    await genArt721CoreV3
      .connect(config.accounts.artist)
      .addProjectScript(projectId, projectScript);

    // Mint token 0
    await minterFilter
      .connect(config.accounts.artist)
      .setMinterForProject(projectId, minter.address);
    await minter
      .connect(config.accounts.artist)
      .updatePricePerTokenInWei(projectId, 0);
    await minter.connect(config.accounts.artist).purchase(projectId);

    const tokenId = projectId.mul(ONE_MILLION);

    // Add contract to core registry
    await config.coreRegistry
      ?.connect(config.accounts.deployer)
      .registerContract(
        genArt721CoreV3.address,
        ethers.utils.formatBytes32String("DUMMY_VERSION"),
        ethers.utils.formatBytes32String("DUMMY_TYPE")
      );

    // Test each dependency that should have a canvas
    const dependenciesToTest = [
      {
        name: "js",
        version: "na",
        expectedId: "js-canvas",
        skipAdd: true,
        canvasTagType: CANVAS_TAG_TYPE.CanvasBeforeProjectScript,
      },
      {
        name: "babylon",
        version: "1.0.0",
        expectedId: "babylon-canvas",
        canvasTagType: CANVAS_TAG_TYPE.CanvasBeforeProjectScript,
      },
      {
        name: "tone",
        version: "1.0.0",
        expectedId: "tone-canvas",
        canvasTagType: CANVAS_TAG_TYPE.CanvasBeforeProjectScript,
      },
      {
        name: "zdog",
        version: "1.0.0",
        expectedId: "zdog-canvas",
        canvasTagType: CANVAS_TAG_TYPE.CanvasBeforeProjectScript,
      },
      {
        name: "processing-js",
        version: "1.4.6",
        expectedId: "processing-js-canvas",
        canvasTagType: CANVAS_TAG_TYPE.CanvasAfterProjectScript,
      },
    ];

    for (const dep of dependenciesToTest) {
      const nameAndVersion = `${dep.name}@${dep.version}`;
      const nameAndVersionBytes =
        ethers.utils.formatBytes32String(nameAndVersion);

      // Add dependency to registry
      if (!dep.skipAdd) {
        await config.dependencyRegistry
          .connect(config.accounts.deployer)
          .addDependency(nameAndVersionBytes, mitLicenseTypeBytes, "", "", "");
      }

      await config.dependencyRegistry
        .connect(config.accounts.deployer)
        .updateDependencyCanvasTagType(nameAndVersionBytes, dep.canvasTagType);

      if (dep.name === "processing-js") {
        await config.dependencyRegistry
          .connect(config.accounts.deployer)
          .updateDependencyProjectScriptTagType(
            nameAndVersionBytes,
            PROJECT_SCRIPT_TAG_TYPE.SpecialType,
            "application/processing"
          );
      }

      // Update project script type
      await genArt721CoreV3
        .connect(config.accounts.artist)
        .updateProjectScriptType(projectId, nameAndVersionBytes);

      // Get token html
      const tokenHtml = await config.genArt721Generator.getTokenHtml(
        genArt721CoreV3.address,
        tokenId
      );

      // Check for canvas tag with correct id
      expect(tokenHtml).to.include(`<canvas id='${dep.expectedId}'>`);

      // For processing-js, check that canvas comes after script
      if (dep.name === "processing-js") {
        const scriptIndex = tokenHtml.indexOf(
          "<script type='application/processing'>"
        );
        const canvasIndex = tokenHtml.indexOf(
          `<canvas id='${dep.expectedId}'>`
        );
        expect(scriptIndex).to.be.lessThan(canvasIndex);
      } else {
        // For other dependencies, canvas should come before script
        const scriptIndex = tokenHtml.indexOf(getScriptTag(projectScript));
        const canvasIndex = tokenHtml.indexOf(
          `<canvas id='${dep.expectedId}'>`
        );

        expect(canvasIndex).to.be.lessThan(scriptIndex);
      }
    }
  });

  describe("getDependencyScript", function () {
    it("returns dependency script when available", async function () {
      const config = await loadFixture(_beforeEach);

      // Get script for p5js which was added in beforeEach with compressed script
      const script =
        await config.genArt721Generator.getDependencyScript("p5js@1.0.0");
      expect(script).to.equal(compressedDepScript);
    });

    it("returns empty string when script count is zero", async function () {
      const config = await loadFixture(_beforeEach);

      // js@na was added in beforeEach with no scripts
      const script =
        await config.genArt721Generator.getDependencyScript("js@na");
      expect(script).to.equal("");
    });
  });

  describe("getProjectScript", function () {
    it("returns project script when available", async function () {
      const config = await loadFixture(_beforeEach);
      // Deploy core contract
      const { genArt721Core: genArt721CoreV3 } =
        await deployCoreWithMinterFilter(
          config,
          "GenArt721CoreV3",
          "MinterFilterV1"
        );

      // Add contract to core registry
      await config.coreRegistry
        ?.connect(config.accounts.deployer)
        .registerContract(
          genArt721CoreV3.address,
          ethers.utils.formatBytes32String("DUMMY_VERSION"),
          ethers.utils.formatBytes32String("DUMMY_TYPE")
        );

      // Create project with script
      const projectId = await genArt721CoreV3.nextProjectId();
      await genArt721CoreV3
        .connect(config.accounts.deployer)
        .addProject("name", config.accounts.artist.address);

      const projectScript = "console.log('test');";
      await genArt721CoreV3
        .connect(config.accounts.artist)
        .addProjectScript(projectId, projectScript);

      // get and verify project script from universal reader
      const newUniversalReader = await deployAndGetUniversalReader(config);
      const scriptBytecodeAddress =
        await genArt721CoreV3.projectScriptBytecodeAddressByIndex(projectId, 0);
      const projectScriptFromUniversalReader =
        await newUniversalReader.readFromBytecode(scriptBytecodeAddress);
      expect(projectScriptFromUniversalReader).to.equal(projectScript);

      // Get project script
      const script = await config.genArt721Generator.getProjectScript(
        genArt721CoreV3.address,
        projectId
      );
      expect(script).to.equal(projectScript);
    });

    it("returns empty string when script count is zero", async function () {
      const config = await loadFixture(_beforeEach);

      // Deploy core contract
      const { genArt721Core: genArt721CoreV3 } =
        await deployCoreWithMinterFilter(
          config,
          "GenArt721CoreV3",
          "MinterFilterV1"
        );

      // Add contract to core registry
      await config.coreRegistry
        ?.connect(config.accounts.deployer)
        .registerContract(
          genArt721CoreV3.address,
          ethers.utils.formatBytes32String("DUMMY_VERSION"),
          ethers.utils.formatBytes32String("DUMMY_TYPE")
        );

      // Create project without script
      const projectId = await genArt721CoreV3.nextProjectId();
      await genArt721CoreV3
        .connect(config.accounts.deployer)
        .addProject("name", config.accounts.artist.address);

      // Get project script
      const script = await config.genArt721Generator.getProjectScript(
        genArt721CoreV3.address,
        projectId
      );
      expect(script).to.equal("");

      // Test pre-V3 core contract
      const { genArt721Core: genArt721CoreV1 } =
        await deployCoreWithMinterFilter(
          config,
          "GenArt721CoreV1",
          "MinterFilterV0"
        );
      await config.coreRegistry
        ?.connect(config.accounts.deployer)
        .registerContract(
          genArt721CoreV1.address,
          ethers.utils.formatBytes32String("DUMMY_VERSION"),
          ethers.utils.formatBytes32String("DUMMY_TYPE")
        );
      const projectId2 = await genArt721CoreV1.nextProjectId();
      await genArt721CoreV1
        .connect(config.accounts.deployer)
        .addProject("name", config.accounts.artist.address, 0, true);
      const script2 = await config.genArt721Generator.getProjectScript(
        genArt721CoreV1.address,
        projectId2
      );
      expect(script2).to.equal("");
    });

    it("reverts when core contract is not supported", async function () {
      const config = await loadFixture(_beforeEach);

      // Deploy core contract without adding to dependency registry
      const { genArt721Core: genArt721CoreV3 } =
        await deployCoreWithMinterFilter(
          config,
          "GenArt721CoreV3",
          "MinterFilterV1"
        );

      await expect(
        config.genArt721Generator.getProjectScript(genArt721CoreV3.address, 0)
      ).to.be.revertedWith("Unsupported core contract");
    });
  });

  describe("updateDependencyRegistry", function () {
    it("updates dependencyRegistry", async function () {
      const config = await loadFixture(_beforeEach);

      const newDependencyRegistry = (await deployAndGet(
        config,
        "DependencyRegistryV0"
      )) as DependencyRegistryV0;

      await newDependencyRegistry
        .connect(config.accounts.deployer)
        .initialize(config.adminACL!.address);

      await expect(
        config.genArt721Generator
          .connect(config.accounts.deployer)
          .updateDependencyRegistry(newDependencyRegistry.address)
      )
        .to.emit(config.genArt721Generator, "DependencyRegistryUpdated")
        .withArgs(newDependencyRegistry.address);

      expect(await config.genArt721Generator.dependencyRegistry()).to.equal(
        newDependencyRegistry.address
      );
    });
    it("reverts if not called by admin", async function () {
      const config = await loadFixture(_beforeEach);

      const newDependencyRegistry = (await deployAndGet(
        config,
        "DependencyRegistryV0"
      )) as DependencyRegistryV0;

      await newDependencyRegistry
        .connect(config.accounts.deployer)
        .initialize(config.adminACL!.address);

      await expectRevert(
        config.genArt721Generator
          .connect(config.accounts.artist)
          .updateDependencyRegistry(newDependencyRegistry.address),
        ONLY_DEPENDENCY_REGISTRY_ADMIN_ACL_ERROR
      );
    });
  });
  describe("updateScriptyBuilder", function () {
    it("updates scriptyBuilder", async function () {
      const config = await loadFixture(_beforeEach);
      // Arbitrary address for testing
      const newScriptyBuilderAddress = config.accounts.artist.address;

      await expect(
        config.genArt721Generator
          .connect(config.accounts.deployer)
          .updateScriptyBuilder(newScriptyBuilderAddress)
      )
        .to.emit(config.genArt721Generator, "ScriptyBuilderUpdated")
        .withArgs(newScriptyBuilderAddress);

      expect(await config.genArt721Generator.scriptyBuilder()).to.equal(
        newScriptyBuilderAddress
      );
    });
    it("reverts if not called by admin", async function () {
      const config = await loadFixture(_beforeEach);
      // Arbitrary address for testing
      const newScriptyBuilderAddress = config.accounts.artist.address;

      await expectRevert(
        config.genArt721Generator
          .connect(config.accounts.artist)
          .updateScriptyBuilder(newScriptyBuilderAddress),
        ONLY_DEPENDENCY_REGISTRY_ADMIN_ACL_ERROR
      );
    });
  });
  describe("updateGunzipStorageContract", function () {
    it("updates gunzipStorageContract", async function () {
      const config = await loadFixture(_beforeEach);
      // Arbitrary address for testing
      const newGunzipStorageContractAddress = config.accounts.artist.address;

      await expect(
        config.genArt721Generator
          .connect(config.accounts.deployer)
          .updateGunzipScriptBytecodeAddress(newGunzipStorageContractAddress)
      )
        .to.emit(
          config.genArt721Generator,
          "GunzipScriptBytecodeAddressUpdated"
        )
        .withArgs(newGunzipStorageContractAddress);

      expect(
        await config.genArt721Generator.gunzipScriptBytecodeAddress()
      ).to.equal(newGunzipStorageContractAddress);
    });
    it("reverts if not called by admin", async function () {
      const config = await loadFixture(_beforeEach);
      // Arbitrary address for testing
      const newGunzipStorageContractAddress = config.accounts.artist.address;

      await expectRevert(
        config.genArt721Generator
          .connect(config.accounts.artist)
          .updateGunzipScriptBytecodeAddress(newGunzipStorageContractAddress),
        ONLY_DEPENDENCY_REGISTRY_ADMIN_ACL_ERROR
      );
    });
  });

  describe("getOnChainStatus", function () {
    it("returns true if dependency is on-chain", async function () {
      const config = await loadFixture(_beforeEach);

      const { genArt721Core: genArt721CoreV3 } =
        await deployCoreWithMinterFilter(
          config,
          "GenArt721CoreV3",
          "MinterFilterV1"
        );

      const projectId = await genArt721CoreV3.nextProjectId();
      await genArt721CoreV3
        .connect(config.accounts.deployer)
        .addProject("name", config.accounts.artist.address);

      // update dependency for project
      await genArt721CoreV3
        .connect(config.accounts.artist)
        .updateProjectScriptType(projectId, p5NameAndVersionBytes);

      // add core to core registry
      await config.coreRegistry
        ?.connect(config.accounts.deployer)
        .registerContract(
          genArt721CoreV3.address,
          ethers.utils.formatBytes32String("DUMMY_VERSION"),
          ethers.utils.formatBytes32String("DUMMY_TYPE")
        );

      const onChainStatus = await config.genArt721Generator.getOnChainStatus(
        genArt721CoreV3.address,
        projectId
      );
      expect(onChainStatus.dependencyFullyOnChain).to.be.true;
      expect(onChainStatus.injectsDecentralizedStorageNetworkAssets).to.be
        .false;
      expect(onChainStatus.hasOffChainFlexDepRegDependencies).to.be.false;
    });

    it("returns false if dependency is not on-chain", async function () {
      const config = await loadFixture(_beforeEach);

      const { genArt721Core: genArt721CoreV3 } =
        await deployCoreWithMinterFilter(
          config,
          "GenArt721CoreV3",
          "MinterFilterV1"
        );

      const projectId = await genArt721CoreV3.nextProjectId();
      await genArt721CoreV3
        .connect(config.accounts.deployer)
        .addProject("name", config.accounts.artist.address);

      // update dependency to unknown dependency
      await genArt721CoreV3
        .connect(config.accounts.artist)
        .updateProjectScriptType(
          projectId,
          ethers.utils.formatBytes32String("unknown@1.0.0")
        );

      // add core to core registry
      await config.coreRegistry
        ?.connect(config.accounts.deployer)
        .registerContract(
          genArt721CoreV3.address,
          ethers.utils.formatBytes32String("DUMMY_VERSION"),
          ethers.utils.formatBytes32String("DUMMY_TYPE")
        );

      const onChainStatus = await config.genArt721Generator.getOnChainStatus(
        genArt721CoreV3.address,
        projectId
      );
      expect(onChainStatus.dependencyFullyOnChain).to.be.false;
      expect(onChainStatus.injectsDecentralizedStorageNetworkAssets).to.be
        .false;
      expect(onChainStatus.hasOffChainFlexDepRegDependencies).to.be.false;
    });

    it("returns true if dependency is special cases of js@na or svg@na", async function () {
      const config = await loadFixture(_beforeEach);

      const { genArt721Core: genArt721CoreV3 } =
        await deployCoreWithMinterFilter(
          config,
          "GenArt721CoreV3",
          "MinterFilterV1"
        );

      const projectId = await genArt721CoreV3.nextProjectId();
      await genArt721CoreV3
        .connect(config.accounts.deployer)
        .addProject("name", config.accounts.artist.address);

      // update dependency to unknown dependency
      await genArt721CoreV3
        .connect(config.accounts.artist)
        .updateProjectScriptType(
          projectId,
          ethers.utils.formatBytes32String("js@na")
        );

      // add core to core registry
      await config.coreRegistry
        ?.connect(config.accounts.deployer)
        .registerContract(
          genArt721CoreV3.address,
          ethers.utils.formatBytes32String("DUMMY_VERSION"),
          ethers.utils.formatBytes32String("DUMMY_TYPE")
        );

      const onChainStatus = await config.genArt721Generator.getOnChainStatus(
        genArt721CoreV3.address,
        projectId
      );
      expect(onChainStatus.dependencyFullyOnChain).to.be.true;
      expect(onChainStatus.injectsDecentralizedStorageNetworkAssets).to.be
        .false;
      expect(onChainStatus.hasOffChainFlexDepRegDependencies).to.be.false;

      // update dependency to svg@na
      await genArt721CoreV3
        .connect(config.accounts.artist)
        .updateProjectScriptType(
          projectId,
          ethers.utils.formatBytes32String("svg@na")
        );
      const onChainStatus2 = await config.genArt721Generator.getOnChainStatus(
        genArt721CoreV3.address,
        projectId
      );
      expect(onChainStatus2.dependencyFullyOnChain).to.be.true;
      expect(onChainStatus2.injectsDecentralizedStorageNetworkAssets).to.be
        .false;
      expect(onChainStatus2.hasOffChainFlexDepRegDependencies).to.be.false;
    });

    it("returns ipfs as true if flex and uses a ipfs or arweave asset", async function () {
      const config = await loadFixture(_beforeEach);

      const { genArt721Core: genArt721CoreV3 } =
        await deployCoreWithMinterFilter(
          config,
          "GenArt721CoreV3_Engine_Flex",
          "MinterFilterV1"
        );

      const projectId = await genArt721CoreV3.nextProjectId();
      await genArt721CoreV3
        .connect(config.accounts.deployer)
        .addProject("name", config.accounts.artist.address);

      // update dependency to unknown dependency
      await genArt721CoreV3
        .connect(config.accounts.artist)
        .updateProjectScriptType(projectId, p5NameAndVersionBytes);

      // add core to core registry
      await config.coreRegistry
        ?.connect(config.accounts.deployer)
        .registerContract(
          genArt721CoreV3.address,
          ethers.utils.formatBytes32String("DUMMY_VERSION"),
          ethers.utils.formatBytes32String("DUMMY_TYPE")
        );
      // define preferred gateways
      const preferredIpfsGateway = "https://ipfs.io/ipfs/";
      const preferredArweaveGateway = "https://arweave.net/";
      await genArt721CoreV3.updateIPFSGateway(preferredIpfsGateway);
      await genArt721CoreV3.updateArweaveGateway(preferredArweaveGateway);
      // add ipfs flex dependency
      // 0 - IPFS
      const ipfsCid = "cidIpfsTest";
      await genArt721CoreV3.addProjectExternalAssetDependency(
        projectId,
        ipfsCid,
        0 // IPFS
      );
      // on-chain dependency status should be true for ipfs
      const onChainStatus = await config.genArt721Generator.getOnChainStatus(
        genArt721CoreV3.address,
        projectId
      );
      expect(onChainStatus.dependencyFullyOnChain).to.be.true;
      expect(onChainStatus.injectsDecentralizedStorageNetworkAssets).to.be.true; // ipfs
      expect(onChainStatus.hasOffChainFlexDepRegDependencies).to.be.false;
      // replace ipfs with arweave
      // 1 - ARWEAVE
      const arweaveCid = "cidArweaveTest";
      await genArt721CoreV3.updateProjectExternalAssetDependency(
        projectId,
        0, // index
        arweaveCid,
        1 // ARWEAVE
      );
      // on-chain dependency status should be true for arweave
      const onChainStatus2 = await config.genArt721Generator.getOnChainStatus(
        genArt721CoreV3.address,
        projectId
      );
      expect(onChainStatus2.dependencyFullyOnChain).to.be.true;
      expect(onChainStatus2.injectsDecentralizedStorageNetworkAssets).to.be
        .true; // arweave
      expect(onChainStatus2.hasOffChainFlexDepRegDependencies).to.be.false;
    });

    it("returns appropriately if uses flex ab dependency registry asset that is not fully on-chain", async function () {
      const config = await loadFixture(_beforeEach);

      const { genArt721Core: genArt721CoreV3 } =
        await deployCoreWithMinterFilter(
          config,
          "GenArt721CoreV3_Engine_Flex",
          "MinterFilterV1"
        );

      const projectId = await genArt721CoreV3.nextProjectId();
      await genArt721CoreV3
        .connect(config.accounts.deployer)
        .addProject("name", config.accounts.artist.address);

      // update dependency to unknown dependency
      await genArt721CoreV3
        .connect(config.accounts.artist)
        .updateProjectScriptType(projectId, p5NameAndVersionBytes);

      // add core to core registry
      await config.coreRegistry
        ?.connect(config.accounts.deployer)
        .registerContract(
          genArt721CoreV3.address,
          ethers.utils.formatBytes32String("DUMMY_VERSION"),
          ethers.utils.formatBytes32String("DUMMY_TYPE")
        );
      // add dependency registry flex dependency
      // 3 - ART_BLOCKS_DEPENDENCY_REGISTRY
      const offchainLibraryName = "unknown@1.0.0";
      await genArt721CoreV3.addProjectExternalAssetDependency(
        projectId,
        offchainLibraryName,
        3 // ART_BLOCKS_DEPENDENCY_REGISTRY
      );
      // on-chain dependency status should be false for flex dependency registry asset
      const onChainStatus = await config.genArt721Generator.getOnChainStatus(
        genArt721CoreV3.address,
        projectId
      );
      expect(onChainStatus.dependencyFullyOnChain).to.be.true;
      expect(onChainStatus.injectsDecentralizedStorageNetworkAssets).to.be
        .false;
      expect(onChainStatus.hasOffChainFlexDepRegDependencies).to.be.true; // flex dependency registry asset
    });

    it("returns appropriately if uses flex ab dependency registry asset that is fully on-chain", async function () {
      const config = await loadFixture(_beforeEach);

      const { genArt721Core: genArt721CoreV3 } =
        await deployCoreWithMinterFilter(
          config,
          "GenArt721CoreV3_Engine_Flex",
          "MinterFilterV1"
        );

      const projectId = await genArt721CoreV3.nextProjectId();
      await genArt721CoreV3
        .connect(config.accounts.deployer)
        .addProject("name", config.accounts.artist.address);

      // update dependency to p5 on-chain dependency
      await genArt721CoreV3
        .connect(config.accounts.artist)
        .updateProjectScriptType(projectId, p5NameAndVersionBytes);

      // add core to core registry
      await config.coreRegistry
        ?.connect(config.accounts.deployer)
        .registerContract(
          genArt721CoreV3.address,
          ethers.utils.formatBytes32String("DUMMY_VERSION"),
          ethers.utils.formatBytes32String("DUMMY_TYPE")
        );
      // add dependency registry flex dependency
      // add a new on-chain dependency to the dependency registry
      const dummyNameAndVersion = "dummy@1.0.0";
      const dummyNameAndVersionBytes =
        ethers.utils.formatBytes32String(dummyNameAndVersion);
      await config.dependencyRegistry.addDependency(
        dummyNameAndVersionBytes,
        mitLicenseTypeBytes,
        preferredCDN,
        p5PreferredRepository,
        p5DependencyWebsite
      );
      // add script chunk to the dependency
      const scriptChunk = "console.log('test');";
      await config.dependencyRegistry.addDependencyScript(
        dummyNameAndVersionBytes,
        scriptChunk
      );
      // 3 - ART_BLOCKS_DEPENDENCY_REGISTRY
      await genArt721CoreV3.addProjectExternalAssetDependency(
        projectId,
        dummyNameAndVersion, // on chain dependency, in string form
        3 // ART_BLOCKS_DEPENDENCY_REGISTRY
      );

      // on-chain dependency status should be false for flex dependency registry asset
      const onChainStatus = await config.genArt721Generator.getOnChainStatus(
        genArt721CoreV3.address,
        projectId
      );
      expect(onChainStatus.dependencyFullyOnChain).to.be.true;
      expect(onChainStatus.injectsDecentralizedStorageNetworkAssets).to.be
        .false;
      expect(onChainStatus.hasOffChainFlexDepRegDependencies).to.be.false; // flex dependency registry asset is on chain, so false
    });
  });
});
