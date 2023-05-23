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
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  mintProjectUntilRemaining,
  advanceEVMByTime,
} from "../../util/common";
import { FOUR_WEEKS } from "../../util/constants";

/**
 * General Integration tests for Basic Randomizer V2 with V3 core.
 */
describe("BasicRandomizerV2 w/V3 core", async function () {
  async function _beforeEach() {
    let config: T_Config = {
      accounts: await getAccounts(),
    };
    config = await assignDefaultConstants(config);

    // deploy and configure minter filter and minter
    ({
      genArt721Core: config.genArt721Core,
      minterFilter: config.minterFilter,
      randomizer: config.randomizer,
      adminACL: config.adminACL,
    } = await deployCoreWithMinterFilter(
      config,
      "GenArt721CoreV3",
      "MinterFilterV1"
    ));

    config.minter = await deployAndGet(config, "MinterSetPriceV2", [
      config.genArt721Core.address,
      config.minterFilter.address,
    ]);

    // add project
    await config.genArt721Core
      .connect(config.accounts.deployer)
      .addProject("name", config.accounts.artist.address);
    await config.genArt721Core
      .connect(config.accounts.deployer)
      .toggleProjectIsActive(config.projectZero);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);

    // configure minter for project zero
    await config.minterFilter
      .connect(config.accounts.deployer)
      .addApprovedMinter(config.minter.address);
    await config.minterFilter
      .connect(config.accounts.deployer)
      .setMinterForProject(config.projectZero, config.minter.address);
    await config.minter
      .connect(config.accounts.artist)
      .updatePricePerTokenInWei(config.projectZero, 0);
    return config;
  }

  describe("assignCoreAndRenounce", function () {
    it("does not allow non-owner to call", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy new randomizer
      const randomizer = await deployAndGet(config, "BasicRandomizerV2", []);
      // expect failure when non-owner calls renounce and assign core
      await expectRevert(
        randomizer
          .connect(config.accounts.user)
          .assignCoreAndRenounce(config.genArt721Core.address),
        "Ownable: caller is not the owner"
      );
    });

    it("allows owner to call", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy new randomizer
      const randomizer = await deployAndGet(config, "BasicRandomizerV2", []);
      // expect success when owner calls renounce and assign core
      await randomizer
        .connect(config.accounts.deployer)
        .assignCoreAndRenounce(config.genArt721Core.address);
    });

    it("does not allow owner to call twice", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy new randomizer
      const randomizer = await deployAndGet(config, "BasicRandomizerV2", []);
      // expect failure when owner calls renounce and assign core twice
      await randomizer
        .connect(config.accounts.deployer)
        .assignCoreAndRenounce(config.genArt721Core.address);
      await expectRevert(
        randomizer
          .connect(config.accounts.deployer)
          .assignCoreAndRenounce(config.genArt721Core.address),
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("assignTokenHash", function () {
    it("does not allow address that is not the assigned core to assign hash", async function () {
      const config = await loadFixture(_beforeEach);
      // expect revert when non-core calls assignTokenHash
      await expectRevert(
        config.randomizer
          .connect(config.accounts.deployer)
          .assignTokenHash(config.projectZeroTokenZero.toNumber()),
        "Only core may call"
      );
      // expect token hash of unminted token to be unassigned (0x0)
      expect(
        await config.genArt721Core.tokenIdToHash(
          config.projectZeroTokenZero.toNumber()
        )
      ).to.be.equal(ethers.constants.HashZero);
    });

    it("does allow address that is the assigned core to assign hash", async function () {
      const config = await loadFixture(_beforeEach);
      // expect successful mint
      await config.minter
        .connect(config.accounts.artist)
        .purchase(config.projectZero);
      // expect token hash to be assigned
      expect(
        await config.genArt721Core.tokenIdToHash(
          config.projectZeroTokenZero.toNumber()
        )
      ).to.not.be.equal(ethers.constants.HashZero);
    });

    it("multiple tokens minted have different hashes", async function () {
      const config = await loadFixture(_beforeEach);
      // expect 2 successful mints
      await config.minter
        .connect(config.accounts.artist)
        .purchase(config.projectZero);
      await config.minter
        .connect(config.accounts.artist)
        .purchase(config.projectZero);
      // expect token hash to be assigned
      const projectZeroTokenZeroHash = await config.genArt721Core.tokenIdToHash(
        config.projectZeroTokenZero.toNumber()
      );
      const projectZeroTokenOneHash = await config.genArt721Core.tokenIdToHash(
        config.projectZeroTokenOne.toNumber()
      );
      expect(projectZeroTokenZeroHash).to.not.be.equal(projectZeroTokenOneHash);
      console.info(`projectZeroTokenZeroHash: ${projectZeroTokenZeroHash}`);
      console.info(`projectZeroTokenOneHash: ${projectZeroTokenOneHash}`);
    });
  });

  describe("owner", function () {
    it("returns null owner after being configured and renounced", async function () {
      const config = await loadFixture(_beforeEach);
      expect(await config.randomizer.owner()).to.be.equal(
        constants.ZERO_ADDRESS
      );
    });

    it("returns deployer prior to being configured and renounced", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy new randomizer
      const randomizer = await deployAndGet(config, "BasicRandomizerV2", []);
      // expect owner to be deployer prior to being configured and renounced
      expect(await randomizer.owner()).to.be.equal(
        config.accounts.deployer.address
      );
    });
  });
});
