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

describe(`GenArt721GeneratorV0`, async function () {
  const p5NameAndVersion = "p5js@1.0.0";
  const p5NameAndVersionBytes =
    ethers.utils.formatBytes32String(p5NameAndVersion);
  const jsNameAndVersion = "js@na";
  const jsNameAndVersionBytes =
    ethers.utils.formatBytes32String(jsNameAndVersion);
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
    config.dependencyRegistry = (await deployWithStorageLibraryAndGet(
      config,
      "DependencyRegistryV0"
    )) as DependencyRegistryV0;
    await config.dependencyRegistry
      .connect(config.accounts.deployer)
      .initialize(config.adminACL!.address);

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

    // Add p5 to registry
    await config.dependencyRegistry.addDependency(
      p5NameAndVersionBytes,
      mitLicenseTypeBytes,
      preferredCDN,
      p5PreferredRepository,
      p5DependencyWebsite
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
          `let tokenData = JSON.parse(\`{"tokenId":"0","hashes":["${hash}"]}\`, (key, value) => key === "data" && value !== null ? value.startsWith("#web3call#") ? Object.entries(JSON.parse(atob(value.slice(10)))).reduce((acc, [k, v]) => ((acc[atob(k)] = atob(v)), acc), {}) : atob(value) : value);`
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
          `let tokenData = JSON.parse(\`{"tokenId":"${tokenId}","hash":"${hash}"}\`, (key, value) => key === "data" && value !== null ? value.startsWith("#web3call#") ? Object.entries(JSON.parse(atob(value.slice(10)))).reduce((acc, [k, v]) => ((acc[atob(k)] = atob(v)), acc), {}) : atob(value) : value);`
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
          `let tokenData = JSON.parse(\`{"tokenId":"${tokenId}","hash":"${hash}"}\`, (key, value) => key === "data" && value !== null ? value.startsWith("#web3call#") ? Object.entries(JSON.parse(atob(value.slice(10)))).reduce((acc, [k, v]) => ((acc[atob(k)] = atob(v)), acc), {}) : atob(value) : value);`
        )
      );
      // Project script
      expect(tokenHtml).to.include(getScriptTag(projectScript));

      // Base64 encoded data uri
      expect(encodedTokenHtml).to.equal(
        `data:text/html;base64,${Buffer.from(tokenHtml).toString("base64")}`
      );
    });

    it("gets html for a given V3 core contract token with dependency on chain", async function () {
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
          `let tokenData = JSON.parse(\`{"tokenId":"${tokenId}","hash":"${hash}"}\`, (key, value) => key === "data" && value !== null ? value.startsWith("#web3call#") ? Object.entries(JSON.parse(atob(value.slice(10)))).reduce((acc, [k, v]) => ((acc[atob(k)] = atob(v)), acc), {}) : atob(value) : value);`
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
          `let tokenData = JSON.parse(\`{"tokenId":"${tokenId}","hash":"${hash}"}\`, (key, value) => key === "data" && value !== null ? value.startsWith("#web3call#") ? Object.entries(JSON.parse(atob(value.slice(10)))).reduce((acc, [k, v]) => ((acc[atob(k)] = atob(v)), acc), {}) : atob(value) : value);`
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
            `let tokenData = JSON.parse(\`{"tokenId":"${tokenId}","hash":"${hash}","preferredArweaveGateway":"${preferredArweaveGateway}","preferredIPFSGateway":"${preferredIpfsGateway}","externalAssetDependencies":[{"dependency_type":"IPFS","cid":"${ipfsCid}","data":""},{"dependency_type":"ARWEAVE","cid":"${arweaveCid}","data":""},{"dependency_type":"ONCHAIN","cid":"","data":"${btoa(onchainData)}"},{"dependency_type":"ART_BLOCKS_DEPENDENCY_REGISTRY","cid":"${onchainLibraryName}","data":""}]}\`, (key, value) => key === "data" && value !== null ? value.startsWith("#web3call#") ? Object.entries(JSON.parse(atob(value.slice(10)))).reduce((acc, [k, v]) => ((acc[atob(k)] = atob(v)), acc), {}) : atob(value) : value);`
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
        const pmp = (await deployAndGet(config, "PMPV0", [])) as PMPV0;

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
      { name: "js", version: "na", expectedId: "js-canvas", skipAdd: true },
      { name: "babylon", version: "1.0.0", expectedId: "babylon-canvas" },
      { name: "tone", version: "1.0.0", expectedId: "tone-canvas" },
      { name: "zdog", version: "1.0.0", expectedId: "zdog-canvas" },
      {
        name: "processing-js",
        version: "1.4.6",
        expectedId: "processing-js-canvas",
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

      const newDependencyRegistry = (await deployWithStorageLibraryAndGet(
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

      const newDependencyRegistry = (await deployWithStorageLibraryAndGet(
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
