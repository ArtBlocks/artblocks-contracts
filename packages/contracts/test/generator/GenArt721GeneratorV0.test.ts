import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import zlib from "zlib";

import {
  AdminACLV0,
  DependencyRegistryV0,
  MinterSetPriceV2,
  GenArt721GeneratorV0,
  GenArt721,
} from "../../scripts/contracts";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployWithStorageLibraryAndGet,
  deployCoreWithMinterFilter,
  deployAndGetPBAB,
} from "../util/common";

const NO_OVERRIDE_ERROR =
  "Contract does not implement projectScriptDetails and has no override set.";
const ONE_MILLION = 1000000;

// Default styles injected by genArt721Generator
const STYLE_TAG =
  "<style>html{height:100%}body{min-height:100%;margin:0;padding:0}canvas{padding:0;margin:auto;display:block;position:absolute;top:0;bottom:0;left:0;right:0}</style>";

const GUNZIP_SCRIPT_BASE64 =
  "InVzZSBzdHJpY3QiOygoKT0+e3ZhciB2PVVpbnQ4QXJyYXksQT1VaW50MTZBcnJheSxfPVVpbnQzMkFycmF5LHJyPW5ldyB2KFswLDAsMCwwLDAsMCwwLDAsMSwxLDEsMSwyLDIsMiwyLDMsMywzLDMsNCw0LDQsNCw1LDUsNSw1LDAsMCwwLDBdKSxucj1uZXcgdihbMCwwLDAsMCwxLDEsMiwyLDMsMyw0LDQsNSw1LDYsNiw3LDcsOCw4LDksOSwxMCwxMCwxMSwxMSwxMiwxMiwxMywxMywwLDBdKSxscj1uZXcgdihbMTYsMTcsMTgsMCw4LDcsOSw2LDEwLDUsMTEsNCwxMiwzLDEzLDIsMTQsMSwxNV0pLHRyPWZ1bmN0aW9uKHIsbil7Zm9yKHZhciB0PW5ldyBBKDMxKSxlPTA7ZTwzMTsrK2UpdFtlXT1uKz0xPDxyW2UtMV07Zm9yKHZhciBhPW5ldyBfKHRbMzBdKSxlPTE7ZTwzMDsrK2UpZm9yKHZhciB1PXRbZV07dTx0W2UrMV07Kyt1KWFbdV09dS10W2VdPDw1fGU7cmV0dXJuW3QsYV19LGVyPXRyKHJyLDIpLGlyPWVyWzBdLGNyPWVyWzFdO2lyWzI4XT0yNTgsY3JbMjU4XT0yODt2YXIgYXI9dHIobnIsMCkscHI9YXJbMF0sVXI9YXJbMV0scT1uZXcgQSgzMjc2OCk7Zm9yKG89MDtvPDMyNzY4OysrbyltPShvJjQzNjkwKT4+PjF8KG8mMjE4NDUpPDwxLG09KG0mNTI0MjgpPj4+MnwobSYxMzEwNyk8PDIsbT0obSY2MTY4MCk+Pj40fChtJjM4NTUpPDw0LHFbb109KChtJjY1MjgwKT4+Pjh8KG0mMjU1KTw8OCk+Pj4xO3ZhciBtLG8sRD1mdW5jdGlvbihyLG4sdCl7Zm9yKHZhciBlPXIubGVuZ3RoLGE9MCx1PW5ldyBBKG4pO2E8ZTsrK2EpclthXSYmKyt1W3JbYV0tMV07dmFyIGc9bmV3IEEobik7Zm9yKGE9MDthPG47KythKWdbYV09Z1thLTFdK3VbYS0xXTw8MTt2YXIgcztpZih0KXtzPW5ldyBBKDE8PG4pO3ZhciBpPTE1LW47Zm9yKGE9MDthPGU7KythKWlmKHJbYV0pZm9yKHZhciBmPWE8PDR8clthXSxoPW4tclthXSxsPWdbclthXS0xXSsrPDxoLHc9bHwoMTw8aCktMTtsPD13OysrbClzW3FbbF0+Pj5pXT1mfWVsc2UgZm9yKHM9bmV3IEEoZSksYT0wO2E8ZTsrK2EpclthXSYmKHNbYV09cVtnW3JbYV0tMV0rK10+Pj4xNS1yW2FdKTtyZXR1cm4gc30sRT1uZXcgdigyODgpO2ZvcihvPTA7bzwxNDQ7KytvKUVbb109ODt2YXIgbztmb3Iobz0xNDQ7bzwyNTY7KytvKUVbb109OTt2YXIgbztmb3Iobz0yNTY7bzwyODA7KytvKUVbb109Nzt2YXIgbztmb3Iobz0yODA7bzwyODg7KytvKUVbb109ODt2YXIgbyxvcj1uZXcgdigzMik7Zm9yKG89MDtvPDMyOysrbylvcltvXT01O3ZhciBvO3ZhciBncj1EKEUsOSwxKTt2YXIgeXI9RChvciw1LDEpLFI9ZnVuY3Rpb24ocil7Zm9yKHZhciBuPXJbMF0sdD0xO3Q8ci5sZW5ndGg7Kyt0KXJbdF0+biYmKG49clt0XSk7cmV0dXJuIG59LHA9ZnVuY3Rpb24ocixuLHQpe3ZhciBlPW4vOHwwO3JldHVybihyW2VdfHJbZSsxXTw8OCk+PihuJjcpJnR9LCQ9ZnVuY3Rpb24ocixuKXt2YXIgdD1uLzh8MDtyZXR1cm4oclt0XXxyW3QrMV08PDh8clt0KzJdPDwxNik+PihuJjcpfSx3cj1mdW5jdGlvbihyKXtyZXR1cm4ocis3KS84fDB9LG1yPWZ1bmN0aW9uKHIsbix0KXsobj09bnVsbHx8bjwwKSYmKG49MCksKHQ9PW51bGx8fHQ+ci5sZW5ndGgpJiYodD1yLmxlbmd0aCk7dmFyIGU9bmV3KHIuQllURVNfUEVSX0VMRU1FTlQ9PTI/QTpyLkJZVEVTX1BFUl9FTEVNRU5UPT00P186dikodC1uKTtyZXR1cm4gZS5zZXQoci5zdWJhcnJheShuLHQpKSxlfTt2YXIgeHI9WyJ1bmV4cGVjdGVkIEVPRiIsImludmFsaWQgYmxvY2sgdHlwZSIsImludmFsaWQgbGVuZ3RoL2xpdGVyYWwiLCJpbnZhbGlkIGRpc3RhbmNlIiwic3RyZWFtIGZpbmlzaGVkIiwibm8gc3RyZWFtIGhhbmRsZXIiLCwibm8gY2FsbGJhY2siLCJpbnZhbGlkIFVURi04IGRhdGEiLCJleHRyYSBmaWVsZCB0b28gbG9uZyIsImRhdGUgbm90IGluIHJhbmdlIDE5ODAtMjA5OSIsImZpbGVuYW1lIHRvbyBsb25nIiwic3RyZWFtIGZpbmlzaGluZyIsImludmFsaWQgemlwIGRhdGEiXSx4PWZ1bmN0aW9uKHIsbix0KXt2YXIgZT1uZXcgRXJyb3Iobnx8eHJbcl0pO2lmKGUuY29kZT1yLEVycm9yLmNhcHR1cmVTdGFja1RyYWNlJiZFcnJvci5jYXB0dXJlU3RhY2tUcmFjZShlLHgpLCF0KXRocm93IGU7cmV0dXJuIGV9LHpyPWZ1bmN0aW9uKHIsbix0KXt2YXIgZT1yLmxlbmd0aDtpZighZXx8dCYmdC5mJiYhdC5sKXJldHVybiBufHxuZXcgdigwKTt2YXIgYT0hbnx8dCx1PSF0fHx0Lmk7dHx8KHQ9e30pLG58fChuPW5ldyB2KGUqMykpO3ZhciBnPWZ1bmN0aW9uKFYpe3ZhciBYPW4ubGVuZ3RoO2lmKFY+WCl7dmFyIGI9bmV3IHYoTWF0aC5tYXgoWCoyLFYpKTtiLnNldChuKSxuPWJ9fSxzPXQuZnx8MCxpPXQucHx8MCxmPXQuYnx8MCxoPXQubCxsPXQuZCx3PXQubSxUPXQubixJPWUqODtkb3tpZighaCl7cz1wKHIsaSwxKTt2YXIgQj1wKHIsaSsxLDMpO2lmKGkrPTMsQilpZihCPT0xKWg9Z3IsbD15cix3PTksVD01O2Vsc2UgaWYoQj09Mil7dmFyIEc9cChyLGksMzEpKzI1NyxZPXAocixpKzEwLDE1KSs0LFc9RytwKHIsaSs1LDMxKSsxO2krPTE0O2Zvcih2YXIgQz1uZXcgdihXKSxPPW5ldyB2KDE5KSxjPTA7YzxZOysrYylPW2xyW2NdXT1wKHIsaStjKjMsNyk7aSs9WSozO2Zvcih2YXIgaj1SKE8pLHNyPSgxPDxqKS0xLHVyPUQoTyxqLDEpLGM9MDtjPFc7KXt2YXIgZD11cltwKHIsaSxzcildO2krPWQmMTU7dmFyIHk9ZD4+PjQ7aWYoeTwxNilDW2MrK109eTtlbHNle3ZhciBTPTAsRj0wO2Zvcih5PT0xNj8oRj0zK3AocixpLDMpLGkrPTIsUz1DW2MtMV0pOnk9PTE3PyhGPTMrcChyLGksNyksaSs9Myk6eT09MTgmJihGPTExK3AocixpLDEyNyksaSs9Nyk7Ri0tOylDW2MrK109U319dmFyIEo9Qy5zdWJhcnJheSgwLEcpLHo9Qy5zdWJhcnJheShHKTt3PVIoSiksVD1SKHopLGg9RChKLHcsMSksbD1EKHosVCwxKX1lbHNlIHgoMSk7ZWxzZXt2YXIgeT13cihpKSs0LFo9clt5LTRdfHJbeS0zXTw8OCxrPXkrWjtpZihrPmUpe3UmJngoMCk7YnJlYWt9YSYmZyhmK1opLG4uc2V0KHIuc3ViYXJyYXkoeSxrKSxmKSx0LmI9Zis9Wix0LnA9aT1rKjgsdC5mPXM7Y29udGludWV9aWYoaT5JKXt1JiZ4KDApO2JyZWFrfX1hJiZnKGYrMTMxMDcyKTtmb3IodmFyIHZyPSgxPDx3KS0xLGhyPSgxPDxUKS0xLEw9aTs7TD1pKXt2YXIgUz1oWyQocixpKSZ2cl0sTT1TPj4+NDtpZihpKz1TJjE1LGk+SSl7dSYmeCgwKTticmVha31pZihTfHx4KDIpLE08MjU2KW5bZisrXT1NO2Vsc2UgaWYoTT09MjU2KXtMPWksaD1udWxsO2JyZWFrfWVsc2V7dmFyIEs9TS0yNTQ7aWYoTT4yNjQpe3ZhciBjPU0tMjU3LFU9cnJbY107Sz1wKHIsaSwoMTw8VSktMSkraXJbY10saSs9VX12YXIgUD1sWyQocixpKSZocl0sTj1QPj4+NDtQfHx4KDMpLGkrPVAmMTU7dmFyIHo9cHJbTl07aWYoTj4zKXt2YXIgVT1ucltOXTt6Kz0kKHIsaSkmKDE8PFUpLTEsaSs9VX1pZihpPkkpe3UmJngoMCk7YnJlYWt9YSYmZyhmKzEzMTA3Mik7Zm9yKHZhciBRPWYrSztmPFE7Zis9NCluW2ZdPW5bZi16XSxuW2YrMV09bltmKzEtel0sbltmKzJdPW5bZisyLXpdLG5bZiszXT1uW2YrMy16XTtmPVF9fXQubD1oLHQucD1MLHQuYj1mLHQuZj1zLGgmJihzPTEsdC5tPXcsdC5kPWwsdC5uPVQpfXdoaWxlKCFzKTtyZXR1cm4gZj09bi5sZW5ndGg/bjptcihuLDAsZil9O3ZhciBBcj1uZXcgdigwKTt2YXIgU3I9ZnVuY3Rpb24ocil7KHJbMF0hPTMxfHxyWzFdIT0xMzl8fHJbMl0hPTgpJiZ4KDYsImludmFsaWQgZ3ppcCBkYXRhIik7dmFyIG49clszXSx0PTEwO24mNCYmKHQrPXJbMTBdfChyWzExXTw8OCkrMik7Zm9yKHZhciBlPShuPj4zJjEpKyhuPj40JjEpO2U+MDtlLT0hclt0KytdKTtyZXR1cm4gdCsobiYyKX0sTXI9ZnVuY3Rpb24ocil7dmFyIG49ci5sZW5ndGg7cmV0dXJuKHJbbi00XXxyW24tM108PDh8cltuLTJdPDwxNnxyW24tMV08PDI0KT4+PjB9O2Z1bmN0aW9uIEgocixuKXtyZXR1cm4genIoci5zdWJhcnJheShTcihyKSwtOCksbnx8bmV3IHYoTXIocikpKX12YXIgVHI9dHlwZW9mIFRleHREZWNvZGVyPCJ1IiYmbmV3IFRleHREZWNvZGVyLENyPTA7dHJ5e1RyLmRlY29kZShBcix7c3RyZWFtOiEwfSksQ3I9MX1jYXRjaHt9dmFyIGZyPSgpPT57dmFyIG47bGV0IHI9ZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnc2NyaXB0W3R5cGU9InRleHQvamF2YXNjcmlwdCtnemlwIl1bc3JjXScpO2ZvcihsZXQgdCBvZiByKXRyeXtsZXQgZT10LnNyYy5tYXRjaCgvXmRhdGE6KC4qPykoPzo7KGJhc2U2NCkpPywoLiopJC8pO2lmKCFlKWNvbnRpbnVlO2xldFthLHUsZyxzXT1lLGk9VWludDhBcnJheS5mcm9tKGc/YXRvYihzKTpkZWNvZGVVUklDb21wb25lbnQocyksdz0+dy5jaGFyQ29kZUF0KDApKSxoPW5ldyBUZXh0RGVjb2RlcigpLmRlY29kZShIKGkpKSxsPWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoInNjcmlwdCIpO2wudGV4dENvbnRlbnQ9aCwobj10LnBhcmVudE5vZGUpPT1udWxsfHxuLnJlcGxhY2VDaGlsZChsLHQpfWNhdGNoKGUpe2NvbnNvbGUuZXJyb3IoIkNvdWxkIG5vdCBndW56aXAgc2NyaXB0Iix0LGUpfX07ZnIoKTt3aW5kb3cuZ3VuemlwU3luYz1IO3dpbmRvdy5ndW56aXBTY3JpcHRzPWZyO30pKCk7";

function getScriptTag(script: string) {
  return `<script>${script}</script>`;
}

function getScriptTagWithSrc(src: string) {
  return `<script type="text/javascript" src="${src}">// Noop</script>`;
}

function getScriptBase64DataUriScriptTag(script: string) {
  return `<script src="data:text/javascript;base64,${script}"></script>`;
}

function getGzipBase64DataUriScriptTag(script: string) {
  return `<script type="text/javascript+gzip" src="data:text/javascript;base64,${script}"></script>`;
}

interface GenArt721GeneratorV0TestConfig extends T_Config {
  dependencyRegistry: DependencyRegistryV0;
  genArt721Generator: GenArt721GeneratorV0;
  scriptyBuilder: Contract;
}

describe(`GenArt721GeneratorV0`, async function () {
  const p5NameAndVersion = "p5js@1.0.0";
  const p5NameAndVersionBytes =
    ethers.utils.formatBytes32String(p5NameAndVersion);
  const licenseType = "MIT";
  const licenseTypeBytes = ethers.utils.formatBytes32String(licenseType);
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
      .addLicenseType(licenseTypeBytes);

    // Add p5 to registry
    await config.dependencyRegistry.addDependency(
      p5NameAndVersionBytes,
      licenseTypeBytes,
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

    // Deploy mock file store which contains the gunzip script
    const mockFs = await deployAndGet(config, "MockFileStore");

    // Deploy scripty builder
    config.scriptyBuilder = await deployAndGet(config, "ScriptyBuilderV2");

    // Deploy GenArt721GeneratorV0
    config.genArt721Generator = (await deployWithStorageLibraryAndGet(
      config,
      "GenArt721GeneratorV0",
      [
        config.dependencyRegistry.address,
        config.scriptyBuilder.address,
        mockFs.address,
      ]
    )) as GenArt721GeneratorV0;

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

      // Add contract to dependency registry
      await config.dependencyRegistry
        .connect(config.accounts.deployer)
        .addSupportedCoreContract(genArt721CoreV0.address);

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

      // Add contract to dependency registry
      await config.dependencyRegistry
        .connect(config.accounts.deployer)
        .addSupportedCoreContract(genArt721CoreV1.address);

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

      // Add contract to dependency registry
      await config.dependencyRegistry
        .connect(config.accounts.deployer)
        .addSupportedCoreContract(genArt721CoreV2.address);

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

      // Add contract to dependency registry
      await config.dependencyRegistry
        .connect(config.accounts.deployer)
        .addSupportedCoreContract(genArt721CoreV3.address);

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
      // Project script
      expect(tokenHtml).to.include(getScriptTag(projectScript));

      // Base64 encoded data uri
      expect(encodedTokenHtml).to.equal(
        `data:text/html;base64,${Buffer.from(tokenHtml).toString("base64")}`
      );
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
      licenseTypeBytes,
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

    // Add contract to dependency registry
    await config.dependencyRegistry
      .connect(config.accounts.deployer)
      .addSupportedCoreContract(genArt721CoreV3.address);

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
});
