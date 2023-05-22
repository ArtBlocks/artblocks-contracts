import { Coder } from "@ethersproject/abi/lib/coders/abstract-coder";
import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  ether,
} from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
} from "../util/common";
import { GenArt721MinterV1V2PRTNR_Common } from "./GenArt721CoreV1V2PRTNR.common";

/**
 * These tests are intended to check integration of the MinterFilter suite with
 * the V2 PRTNR core contract.
 * Some basic core tests, and basic functional tests to ensure purchase
 * does in fact mint tokens to purchaser.
 */
describe("GenArt721CoreV2_PBAB_FLEX_Integration", async function () {
  async function _beforeEach() {
    let config: T_Config = {
      accounts: await getAccounts(),
    };
    config = await assignDefaultConstants(config);
    // deploy and configure minter filter and minter
    ({
      genArt721Core: config.genArt721Core,
      minterFilter: config.minterFilter,
    } = await deployCoreWithMinterFilter(
      config,
      "GenArt721CoreV2_ENGINE_FLEX",
      "MinterFilterV0"
    ));
    config.minter = await deployAndGet(config, "MinterSetPriceV1", [
      config.genArt721Core.address,
      config.minterFilter.address,
    ]);
    await config.minterFilter
      .connect(config.accounts.deployer)
      .addApprovedMinter(config.minter.address);
    // add project
    await config.genArt721Core
      .connect(config.accounts.deployer)
      .addProject("name", config.accounts.artist.address, 0);
    await config.genArt721Core
      .connect(config.accounts.deployer)
      .toggleProjectIsActive(config.projectZero);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);
    // set project's minter and price
    await config.minter
      .connect(config.accounts.artist)
      .updatePricePerTokenInWei(config.projectZero, config.pricePerTokenInWei);
    await config.minterFilter
      .connect(config.accounts.artist)
      .setMinterForProject(config.projectZero, config.minter.address);
    // get project's info
    config.projectZeroInfo = await config.genArt721Core.projectTokenInfo(
      config.projectZero
    );
    return config;
  }

  describe("common tests", async function () {
    await GenArt721MinterV1V2PRTNR_Common(_beforeEach);
  });

  describe("external asset dependencies", async function () {
    it("can add an external asset dependency", async function () {
      const config = await loadFixture(_beforeEach);
      // add external asset dependency to project 0
      await expect(
        config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectExternalAssetDependency(
            config.projectZero,
            "QmbCdEwHebtpLZSRLGnELbJmmVVJQJPfMEVo1vq2QBEoEo",
            0
          )
      )
        .to.emit(config.genArt721Core, "ExternalAssetDependencyUpdated")
        .withArgs(0, 0, "QmbCdEwHebtpLZSRLGnELbJmmVVJQJPfMEVo1vq2QBEoEo", 0, 1);
      const externalAssetDependency = await config.genArt721Core
        .connect(config.accounts.artist)
        .projectExternalAssetDependencyByIndex(0, 0);

      expect(externalAssetDependency[0]).to.equal(
        "QmbCdEwHebtpLZSRLGnELbJmmVVJQJPfMEVo1vq2QBEoEo"
      );
      expect(externalAssetDependency[1]).to.equal(0);
    });

    it("can remove an external asset dependency", async function () {
      const config = await loadFixture(_beforeEach);
      // add assets for project 0 at index 0, 1, 2
      await config.genArt721Core
        .connect(config.accounts.artist)
        .addProjectExternalAssetDependency(
          config.projectZero,
          "QmbCdEwHebtpLZSRLGnELbJmmVVJQJPfMEVo1vq2QBEoEo",
          0
        );
      await config.genArt721Core
        .connect(config.accounts.artist)
        .addProjectExternalAssetDependency(
          config.projectZero,
          "QmbCdEwHebtpLZSRLGnELbJmmVVJQJPfMEVo1vq2QBEoEo2",
          1
        );
      await config.genArt721Core
        .connect(config.accounts.artist)
        .addProjectExternalAssetDependency(
          config.projectZero,
          "QmbCdEwHebtpLZSRLGnELbJmmVVJQJPfMEVo1vq2QBEoEo3",
          0
        );
      // remove external asset at index 1
      await config.genArt721Core
        .connect(config.accounts.artist)
        .removeProjectExternalAssetDependency(0, 1);

      // project external asset info at index 2 should be set back to default values as a result of being deleted
      const externalAssetDependency = await config.genArt721Core
        .connect(config.accounts.artist)
        .projectExternalAssetDependencyByIndex(0, 2);
      expect(externalAssetDependency[0]).to.equal("");
      expect(externalAssetDependency[1]).to.equal(0);

      // project external asset info at index 1 should be set be set to the same values as index 2, prior to removal
      // config test also validates the deepy copy of the shifted external asset dependency
      const externalAssetDependencyAtIndex1 = await config.genArt721Core
        .connect(config.accounts.artist)
        .projectExternalAssetDependencyByIndex(0, 1);
      expect(externalAssetDependencyAtIndex1[0]).to.equal(
        "QmbCdEwHebtpLZSRLGnELbJmmVVJQJPfMEVo1vq2QBEoEo3"
      );
      expect(externalAssetDependencyAtIndex1[1]).to.equal(0);

      const externalAssetDependencyCount = await config.genArt721Core
        .connect(config.accounts.artist)
        .projectExternalAssetDependencyCount(0);
      expect(externalAssetDependencyCount).to.equal(2);
    });

    it("can update an external asset dependency", async function () {
      const config = await loadFixture(_beforeEach);
      // add assets for project 0 at index 0
      await config.genArt721Core
        .connect(config.accounts.artist)
        .addProjectExternalAssetDependency(
          config.projectZero,
          "QmbCdEwHebtpLZSRLGnELbJmmVVJQJPfMEVo1vq2QBEoEo",
          0
        );
      // get asset info at index 0 for project 0
      const externalAssetDependency = await config.genArt721Core
        .connect(config.accounts.artist)
        .projectExternalAssetDependencyByIndex(0, 0);
      console.log(externalAssetDependency);
      expect(externalAssetDependency[0]).to.equal(
        "QmbCdEwHebtpLZSRLGnELbJmmVVJQJPfMEVo1vq2QBEoEo"
      );
      expect(externalAssetDependency[1]).to.equal(0);
      // update asset info at index 0 for project 0
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectExternalAssetDependency(
          0,
          0,
          "QmbCdEwHebtpLZSRLGnELbJmmVVJQJPfMEVo1vq2QBEoEo2",
          1
        );

      const externalAssetDependency2 = await config.genArt721Core
        .connect(config.accounts.artist)
        .projectExternalAssetDependencyByIndex(0, 0);
      expect(externalAssetDependency2[0]).to.equal(
        "QmbCdEwHebtpLZSRLGnELbJmmVVJQJPfMEVo1vq2QBEoEo2"
      );
      expect(externalAssetDependency2[1]).to.equal(1);
    });

    it("can lock a projects external asset dependencies", async function () {
      const config = await loadFixture(_beforeEach);
      // add assets for project 0 at index 0
      await config.genArt721Core
        .connect(config.accounts.artist)
        .addProjectExternalAssetDependency(
          config.projectZero,
          "QmbCdEwHebtpLZSRLGnELbJmmVVJQJPfMEVo1vq2QBEoEo",
          0
        );
      // lock external asset dependencies for project 0
      await config.genArt721Core
        .connect(config.accounts.artist)
        .lockProjectExternalAssetDependencies(0);

      // get asset info at index 0 for project 0
      const externalAssetDependency = await config.genArt721Core
        .connect(config.accounts.artist)
        .projectExternalAssetDependencyByIndex(0, 0);

      expect(externalAssetDependency[0]).to.equal(
        "QmbCdEwHebtpLZSRLGnELbJmmVVJQJPfMEVo1vq2QBEoEo"
      );
      expect(externalAssetDependency[1]).to.equal(0);

      await expectRevert(
        config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectExternalAssetDependency(
            0,
            0,
            "QmbCdEwHebtpLZSRLGnELbJmmVVJQJPfMEVo1vq2QBEoEo2",
            1
          ),
        "Project external asset dependencies are locked"
      );
    });

    it("can use projectExternalAssetDependencyCount getter", async function () {
      const config = await loadFixture(_beforeEach);
      const externalAssetDependencyCountA = await config.genArt721Core
        .connect(config.accounts.artist)
        .projectExternalAssetDependencyCount(0);
      expect(externalAssetDependencyCountA).to.equal(0);
      // add assets for project 0 at index 0
      await config.genArt721Core
        .connect(config.accounts.artist)
        .addProjectExternalAssetDependency(
          config.projectZero,
          "QmbCdEwHebtpLZSRLGnELbJmmVVJQJPfMEVo1vq2QBEoEo",
          0
        );

      const externalAssetDependencyCountB = await config.genArt721Core
        .connect(config.accounts.artist)
        .projectExternalAssetDependencyCount(0);
      expect(externalAssetDependencyCountB).to.equal(1);
    });

    it("can update contract preferred IPFS & Arweave gateways", async function () {
      const config = await loadFixture(_beforeEach);
      // setting IPFS gateway
      await expect(
        config.genArt721Core
          .connect(config.accounts.deployer)
          .updateIPFSGateway("https://ipfs.io/ipfs/")
      )
        .to.emit(config.genArt721Core, "GatewayUpdated")
        .withArgs(0, "https://ipfs.io/ipfs/");

      // setting Arweave gateway
      await expect(
        config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArweaveGateway("https://arweave.net/")
      )
        .to.emit(config.genArt721Core, "GatewayUpdated")
        .withArgs(1, "https://arweave.net/");
    });
  });
});
