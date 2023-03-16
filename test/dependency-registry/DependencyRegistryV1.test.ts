import { expectRevert, constants } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  AdminACLV0,
  AdminACLV0__factory,
  DependencyRegistryV1,
  GenArt721Core,
  GenArt721CoreV2PBAB,
  GenArt721CoreV1,
  GenArt721CoreV3,
  MinterFilterV1,
  GenArt721MinterPBAB,
  MinterSetPriceV2,
  GenArt721,
  MinterFilterV0,
} from "../../scripts/contracts";
import zlib from "zlib";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  RemoveIndex,
  deployAndGetPBAB,
} from "../util/common";

const ONLY_ADMIN_ACL_ERROR = "Only Admin ACL allowed";
const ONLY_EXISTING_DEPENDENCY_TYPE_ERROR = "Dependency type does not exist";
const ONLY_NON_EMPTY_STRING_ERROR = "Must input non-empty string";

interface DependencyRegistryV1TestConfig extends T_Config {
  dependencyRegistry?: DependencyRegistryV1;
  genArt721Core?: GenArt721CoreV3;
  minter?: MinterSetPriceV2;
  minterFilter?: MinterFilterV1;
  adminACL?: AdminACLV0;
  genArt721CoreV0?: GenArt721;
  genArt721CoreV1?: GenArt721CoreV1;
  genArt721CoreV1Minter?: MinterSetPriceV2;
  genArt721CoreV1MinterFilter?: MinterFilterV0;
  genArt721CoreV2?: GenArt721CoreV2PBAB;
  genArt721CoreV2Minter?: GenArt721MinterPBAB;
}

/**
 * Tests for code shared between dependency registry versions.
 */
describe("DependencyRegistryV1", async function () {
  const dependencyType = "p5js@1.0.0";
  const dependencyTypeBytes = ethers.utils.formatBytes32String(dependencyType);
  const preferredCDN =
    "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.0.0/p5.min.js";
  const preferredRepository = "https://github.com/processing/p5.js";
  const referenceWebsite = "https://p5js.org/";

  async function _beforeEach() {
    let config: DependencyRegistryV1TestConfig = {
      accounts: await getAccounts(),
    };

    config = (await assignDefaultConstants(
      config
    )) as DependencyRegistryV1TestConfig;

    // deploy and configure minter filter and minter
    // V3 Contracts
    ({
      genArt721Core: config.genArt721Core,
      minterFilter: config.minterFilter,
      randomizer: config.randomizer,
      adminACL: config.adminACL,
    } = await deployCoreWithMinterFilter<
      GenArt721CoreV3,
      MinterFilterV1,
      AdminACLV0
    >(config, "GenArt721CoreV3", "MinterFilterV1"));

    config.minter = await deployAndGet(config, "MinterSetPriceV2", [
      config.genArt721Core.address,
      config.minterFilter.address,
    ]);
    await config.minterFilter.addApprovedMinter(config.minter.address);

    // V2 PBAB Contracts
    ({
      pbabToken: config.genArt721CoreV2,
      pbabMinter: config.genArt721CoreV2Minter,
    } = await deployAndGetPBAB(config));

    // V1 Contracts
    const v1Contracts = await deployCoreWithMinterFilter<
      GenArt721CoreV1,
      MinterFilterV0,
      AdminACLV0
    >(config, "GenArt721CoreV1", "MinterFilterV0");
    config.genArt721CoreV1 = v1Contracts.genArt721Core;
    config.genArt721CoreV1MinterFilter = v1Contracts.minterFilter;

    config.genArt721CoreV1Minter = await deployAndGet(
      config,
      "MinterSetPriceV2",
      [v1Contracts.genArt721Core.address, v1Contracts.minterFilter.address]
    );

    await v1Contracts.minterFilter
      .connect(config.accounts.deployer)
      .addApprovedMinter(config.genArt721CoreV1Minter.address);

    // V0 Contract
    config.genArt721CoreV0 = await deployAndGet<GenArt721>(
      config,
      "GenArt721",
      [config.name, config.symbol]
    );

    // Mock File Store in place of EthFS
    const mockFs = await deployAndGet(config, "MockFileStore");
    const scriptyBuilder = await deployAndGet(config, "ScriptyBuilder");

    config.dependencyRegistry = await deployAndGet<DependencyRegistryV1>(
      config,
      "DependencyRegistryV1"
    );
    await config.dependencyRegistry
      .connect(config.accounts.deployer)
      .initialize(config.adminACL.address);
    await config.dependencyRegistry.setEthFsAddress(mockFs.address);
    await config.dependencyRegistry.setScriptyBuilderAddress(
      scriptyBuilder.address
    );

    // add supported core contracts
    await config.dependencyRegistry
      .connect(config.accounts.deployer)
      .addSupportedCoreContract(config.genArt721Core.address);
    await config.dependencyRegistry
      .connect(config.accounts.deployer)
      .addSupportedCoreContract(config.genArt721CoreV2.address);
    await config.dependencyRegistry
      .connect(config.accounts.deployer)
      .addSupportedCoreContract(config.genArt721CoreV1.address);
    await config.dependencyRegistry
      .connect(config.accounts.deployer)
      .addSupportedCoreContract(config.genArt721CoreV0.address);

    return config;
  }

  describe("getTokenHtml", function () {
    it("gets html for a given token", async function () {
      const config = await loadFixture(_beforeEach);

      // Dependency setup
      const depType = ethers.utils.formatBytes32String("p5js@1.0.0");
      await config.dependencyRegistry.addDependency(
        depType,
        preferredCDN,
        "",
        ""
      );
      const compressedDep = zlib
        .gzipSync(
          new Uint8Array(
            Buffer.from('let blah = "hello";let bleh = "goodbye";')
          )
        )
        .toString("base64");

      // await config.dependencyRegistry.addDependencyScript(
      //   depType,
      //   compressedDep.slice(0, Math.floor(compressedDep.length / 2))
      // );

      // await config.dependencyRegistry.addDependencyScript(
      //   depType,
      //   compressedDep.slice(Math.floor(compressedDep.length / 2))
      // );

      // V3 project setup
      const v3ProjectId = await config.genArt721Core.nextProjectId();

      await config.genArt721Core.addProject(
        "name",
        config.accounts.artist.address
      );

      await config.minterFilter.setMinterForProject(
        v3ProjectId,
        config.minter.address
      );

      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(v3ProjectId, 0);

      await config.genArt721Core
        .connect(config.accounts.deployer)
        .updateProjectScriptType(v3ProjectId, depType);

      await config.genArt721Core
        .connect(config.accounts.artist)
        .addProjectScript(
          v3ProjectId,
          "console.log(tokenData); console.log(blah); console.log(bleh);"
        );

      await config.minter.connect(config.accounts.artist).purchase(0);
      const tokenHtml = await config.dependencyRegistry.getTokenHtml(
        config.genArt721Core.address,
        0
      );

      // V2 project setup
      const v2ProjectId = await config.genArt721CoreV2.nextProjectId();
      await config.genArt721CoreV2.addProject(
        "name",
        config.accounts.artist.address,
        0
      );
      await config.dependencyRegistry.addProjectDependencyTypeOverride(
        config.genArt721CoreV2.address,
        v2ProjectId,
        depType
      );

      await config.genArt721CoreV2.addProjectScript(
        v2ProjectId,
        "console.log(tokenData);"
      );
      await config.genArt721CoreV2.addProjectScript(
        v2ProjectId,
        "console.log(blah); console.log(bleh);"
      );

      await config.genArt721CoreV2Minter
        .connect(config.accounts.artist)
        .purchase(v2ProjectId);

      const tokenHtmlV2 = await config.dependencyRegistry.getTokenHtml(
        config.genArt721CoreV2.address,
        Number(v2ProjectId) * 1000000
      );

      // V1 project setup
      const v1ProjectId = await config.genArt721CoreV1.nextProjectId();
      await config.genArt721CoreV1.addProject(
        "name",
        config.accounts.artist.address,
        0,
        true
      );

      await config.dependencyRegistry.addProjectDependencyTypeOverride(
        config.genArt721CoreV1.address,
        v1ProjectId,
        depType
      );

      await config.genArt721CoreV1
        .connect(config.accounts.artist)
        .addProjectScript(v1ProjectId, "console.log(tokenData);");
      await config.genArt721CoreV1
        .connect(config.accounts.artist)
        .addProjectScript(v1ProjectId, "console.log(blah); console.log(bleh);");

      await config.genArt721CoreV1MinterFilter.setMinterForProject(
        v1ProjectId,
        config.genArt721CoreV1Minter.address
      );
      await config.genArt721CoreV1Minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(v1ProjectId, 0);
      await config.genArt721CoreV1Minter
        .connect(config.accounts.artist)
        .purchase(v1ProjectId);

      const tokenHtmlV1 = await config.dependencyRegistry.getTokenHtml(
        config.genArt721CoreV1.address,
        Number(v1ProjectId) * 1000000
      );

      console.log(tokenHtmlV1);
    });
  });
});
