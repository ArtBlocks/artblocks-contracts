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

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  mintProjectUntilRemaining,
  advanceEVMByTime,
} from "../../util/common";
import { FOUR_WEEKS } from "../../util/constants";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

/**
 * General Integration tests for Polyptych Randomizer V0 with V3 core.
 */
describe("PolyptychRandomizerV0 w/V3 core", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this);

    // deploy and configure minter filter and minter
    ({
      genArt721Core: this.genArt721Core,
      minterFilter: this.minterFilter,
      randomizer: this.randomizer,
      adminACL: this.adminACL,
    } = await deployCoreWithMinterFilter.call(
      this,
      "GenArt721CoreV3_Engine",
      "MinterFilterV1",
      false,
      undefined,
      "BasicPolyptychRandomizerV0"
    ));

    this.delegationRegistry = await deployAndGet.call(
      this,
      "DelegationRegistry",
      []
    );

    this.minter = await deployAndGet.call(this, "MinterSetPriceV2", [
      this.genArt721Core.address,
      this.minterFilter.address,
    ]);

    ({
      genArt721Core: this.genArt721CorePolyptych,
      minterFilter: this.minterFilterPolyptych,
      randomizer: this.randomizerPolyptych,
      adminACL: this.adminACLPolyptych,
    } = await deployCoreWithMinterFilter.call(
      this,
      "GenArt721CoreV3_Engine",
      "MinterFilterV1",
      false,
      undefined,
      "BasicPolyptychRandomizerV0"
    ));

    this.minterPolyptych = await deployAndGet.call(this, "MinterPolyptychV0", [
      this.genArt721CorePolyptych.address,
      this.minterFilterPolyptych.address,
      this.delegationRegistry.address,
    ]);

    // add project
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("name", this.accounts.artist.address);
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectZero);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);
    await this.genArt721CorePolyptych
      .connect(this.accounts.deployer)
      .addProject("name", this.accounts.artist.address);
    await this.genArt721CorePolyptych
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectZero);
    await this.genArt721CorePolyptych
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);

    // configure minter for project zero
    await this.minterFilter
      .connect(this.accounts.deployer)
      .addApprovedMinter(this.minter.address);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .setMinterForProject(this.projectZero, this.minter.address);
    await this.minter
      .connect(this.accounts.artist)
      .updatePricePerTokenInWei(this.projectZero, 0);
    await this.minterFilterPolyptych
      .connect(this.accounts.deployer)
      .addApprovedMinter(this.minterPolyptych.address);
    await this.minterFilterPolyptych
      .connect(this.accounts.deployer)
      .setMinterForProject(this.projectZero, this.minterPolyptych.address);
    await this.minterPolyptych
      .connect(this.accounts.artist)
      .updatePricePerTokenInWei(this.projectZero, 0);
  });

  describe("Polyptych project hash seed settings", function () {
    it("only the artist can set a project as polyptych", async function () {
      await this.randomizerPolyptych
        .connect(this.accounts.artist)
        .toggleProjectIsPolyptych(0);
      await expectRevert(
        this.randomizerPolyptych
          .connect(this.accounts.deployer)
          .toggleProjectIsPolyptych(0),
        "Only Artist"
      );
    });
    it("requires the hash seed setter contract to be configured", async function () {
      await expectRevert(
        this.randomizerPolyptych
          .connect(this.accounts.deployer)
          .setPolyptychHashSeed(0, "0x000000000000000000000000"),
        "Only hashSeedSetterContract"
      );
      await this.randomizerPolyptych.setHashSeedSetterContract(
        this.accounts.deployer.address
      );
      await this.randomizerPolyptych
        .connect(this.accounts.deployer)
        .setPolyptychHashSeed(0, "0x000000000000000000000000");
    });
  });

  describe("assignCoreAndRenounce", function () {
    it("does not allow non-owner to call", async function () {
      // deploy new randomizer
      const randomizer = await deployAndGet.call(
        this,
        "BasicPolyptychRandomizerV0",
        []
      );
      // expect failure when non-owner calls renounce and assign core
      await expectRevert(
        randomizer
          .connect(this.accounts.user)
          .assignCoreAndRenounce(this.genArt721Core.address),
        "Ownable: caller is not the owner"
      );
    });

    it("allows owner to call", async function () {
      // deploy new randomizer
      const randomizer = await deployAndGet.call(
        this,
        "BasicPolyptychRandomizerV0",
        []
      );
      // expect success when owner calls renounce and assign core
      await randomizer
        .connect(this.accounts.deployer)
        .assignCoreAndRenounce(this.genArt721Core.address);
    });

    it("does not allow owner to call twice", async function () {
      // deploy new randomizer
      const randomizer = await deployAndGet.call(
        this,
        "BasicPolyptychRandomizerV0",
        []
      );
      // expect failure when owner calls renounce and assign core twice
      await randomizer
        .connect(this.accounts.deployer)
        .assignCoreAndRenounce(this.genArt721Core.address);
      await expectRevert(
        randomizer
          .connect(this.accounts.deployer)
          .assignCoreAndRenounce(this.genArt721Core.address),
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("assignTokenHash", function () {
    it("does not allow address that is not the assigned core to assign hash", async function () {
      // expect revert when non-core calls assignTokenHash
      await expectRevert(
        this.randomizer
          .connect(this.accounts.deployer)
          .assignTokenHash(this.projectZeroTokenZero.toNumber()),
        "Only core may call"
      );
      // expect token hash of unminted token to be unassigned (0x0)
      expect(
        await this.genArt721Core.tokenIdToHash(
          this.projectZeroTokenZero.toNumber()
        )
      ).to.be.equal(ethers.constants.HashZero);
    });

    it("does allow address that is the assigned core to assign hash", async function () {
      // expect successful mint
      await this.minter
        .connect(this.accounts.artist)
        .purchase(this.projectZero);
      // expect token hash to be assigned
      expect(
        await this.genArt721Core.tokenIdToHash(
          this.projectZeroTokenZero.toNumber()
        )
      ).to.not.be.equal(ethers.constants.HashZero);
    });

    it("multiple tokens minted have different hashes", async function () {
      // expect 2 successful mints
      await this.minter
        .connect(this.accounts.artist)
        .purchase(this.projectZero);
      await this.minter
        .connect(this.accounts.artist)
        .purchase(this.projectZero);
      // expect token hash to be assigned
      const projectZeroTokenZeroHash = await this.genArt721Core.tokenIdToHash(
        this.projectZeroTokenZero.toNumber()
      );
      const projectZeroTokenOneHash = await this.genArt721Core.tokenIdToHash(
        this.projectZeroTokenOne.toNumber()
      );
      expect(projectZeroTokenZeroHash).to.not.be.equal(projectZeroTokenOneHash);
      console.info(`projectZeroTokenZeroHash: ${projectZeroTokenZeroHash}`);
      console.info(`projectZeroTokenOneHash: ${projectZeroTokenOneHash}`);
    });

    it("copies the token hash from a previous token as expected", async function () {
      await this.minterPolyptych
        .connect(this.accounts.deployer)
        .registerNFTAddress(this.genArt721Core.address);
      await this.minterPolyptych
        .connect(this.accounts.artist)
        .allowHoldersOfProjects(
          this.projectZero,
          [this.genArt721Core.address],
          [this.projectZero]
        );
      await this.randomizerPolyptych
        .connect(this.accounts.deployer)
        .setHashSeedSetterContract(this.minterPolyptych.address);
      await this.randomizerPolyptych
        .connect(this.accounts.artist)
        .toggleProjectIsPolyptych(0);

      await expectRevert(
        this.minterPolyptych
          .connect(this.accounts.artist)
          ["purchase(uint256,address,uint256)"](
            this.projectZero,
            this.genArt721Core.address,
            0,
            {
              value: 0,
            }
          ),
        "Cannot have an empty hash seed to copy."
      );

      await this.minter.connect(this.accounts.artist).purchase(0);

      // mint a token
      await this.minterPolyptych
        .connect(this.accounts.artist)
        ["purchase(uint256,address,uint256)"](
          this.projectZero,
          this.genArt721Core.address,
          0,
          {
            value: 0,
          }
        );
    });
  });

  describe("owner", function () {
    it("returns null owner after being configured and renounced", async function () {
      expect(await this.randomizer.owner()).to.be.equal(constants.ZERO_ADDRESS);
    });

    it("returns deployer prior to being configured and renounced", async function () {
      // deploy new randomizer
      const randomizer = await deployAndGet.call(
        this,
        "BasicPolyptychRandomizerV0",
        []
      );
      // expect owner to be deployer prior to being configured and renounced
      expect(await randomizer.owner()).to.be.equal(
        this.accounts.deployer.address
      );
    });
  });
});
