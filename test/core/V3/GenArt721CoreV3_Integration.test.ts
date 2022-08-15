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

/**
 * General Integration tests for V3 core.
 */
describe("GenArt721CoreV3 Integration", async function () {
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
      "GenArt721CoreV3",
      "MinterFilterV1"
    ));

    this.minter = await deployAndGet.call(this, "MinterSetPriceV2", [
      this.genArt721Core.address,
      this.minterFilter.address,
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
  });

  describe("artblocksAddress", function () {
    it("returns expected artblocksAddress", async function () {
      expect(await this.genArt721Core.artblocksAddress()).to.be.equal(
        this.accounts.deployer.address
      );
    });
  });

  describe("owner", function () {
    it("returns expected owner", async function () {
      expect(await this.genArt721Core.owner()).to.be.equal(
        this.adminACL.address
      );
    });
  });

  describe("admin", function () {
    it("returns expected backwards-compatible admin (owner)", async function () {
      expect(await this.genArt721Core.admin()).to.be.equal(
        this.adminACL.address
      );
    });
  });

  describe("adminACLContract", function () {
    it("returns expected adminACLContract address", async function () {
      expect(await this.genArt721Core.adminACLContract()).to.be.equal(
        this.adminACL.address
      );
    });

    it("behaves as expected when transferring ownership", async function () {
      // deploy new ACL with user as superAdmin
      const userAdminACLFactory = await ethers.getContractFactory(
        "MockAdminACLV0Events"
      );
      const userAdminACL = await userAdminACLFactory
        .connect(this.accounts.user)
        .deploy();
      // update owner of core to new userAdminACL, expect OwnershipTransferred event
      expect(
        await this.adminACL
          .connect(this.accounts.deployer)
          .transferOwnershipOn(this.genArt721Core.address, userAdminACL.address)
      )
        .to.emit(this.genArt721Core, "OwnershipTransferred")
        .withArgs(this.adminACL.address, userAdminACL.address);
      // ensure owner + public adminACLContract has been updated
      expect(await this.genArt721Core.owner()).to.be.equal(
        userAdminACL.address
      );
      expect(await this.genArt721Core.adminACLContract()).to.be.equal(
        userAdminACL.address
      );
      // ensure new userAdminACL may update project
      await this.genArt721Core
        .connect(this.accounts.user)
        .addProject("new project", this.accounts.artist2.address);
    });

    it("behaves as expected when renouncing ownership", async function () {
      // update owner of core to null address, expect OwnershipTransferred event
      expect(
        await this.adminACL
          .connect(this.accounts.deployer)
          .renounceOwnershipOn(this.genArt721Core.address)
      )
        .to.emit(this.genArt721Core, "OwnershipTransferred")
        .withArgs(this.adminACL.address, constants.ZERO_ADDRESS);
      // ensure owner + public adminACLContract has been updated
      expect(await this.genArt721Core.owner()).to.be.equal(
        constants.ZERO_ADDRESS
      );
      expect(await this.genArt721Core.adminACLContract()).to.be.equal(
        constants.ZERO_ADDRESS
      );
      // ensure prior adminACL may not perform an admin function
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.deployer)
          .addProject("new project", this.accounts.artist2.address),
        "Only Admin ACL allowed"
      );
    });
  });

  describe("reverts on project locked", async function () {
    it("reverts if try to add script", async function () {
      await mintProjectUntilRemaining.call(
        this,
        this.projectZero,
        this.accounts.artist,
        0
      );
      // wait until project is locked
      await advanceEVMByTime(FOUR_WEEKS + 1);
      // expect revert
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.artist)
          .addProjectScript(this.projectZero, "lorem ipsum"),
        "Only if unlocked"
      );
    });
  });

  describe("coreVersion", function () {
    it("returns expected value", async function () {
      const coreVersion = await this.genArt721Core
        .connect(this.accounts.deployer)
        .coreVersion();
      expect(coreVersion).to.be.equal("v3.0.0");
    });
  });

  describe("coreType", function () {
    it("returns expected value", async function () {
      const coreType = await this.genArt721Core
        .connect(this.accounts.deployer)
        .coreType();
      expect(coreType).to.be.equal("GenArt721CoreV3");
    });
  });

  describe("setTokenHash_8PT", function () {
    it("does not allow non-randomizer to call", async function () {
      // mint token zero so it is a valid token
      await this.minter
        .connect(this.accounts.artist)
        .purchase(this.projectZero);

      // call directly from non-randomizer account and expect revert
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.artist)
          .setTokenHash_8PT(
            this.projectZeroTokenZero.toNumber(),
            ethers.constants.MaxInt256
          ),
        "Only randomizer may set"
      );
    });

    it("does allow randomizer to call, and updates token hash", async function () {
      // ensure token hash is initially zero
      expect(
        await this.genArt721Core.tokenIdToHash(
          this.projectZeroTokenZero.toNumber()
        )
      ).to.be.equal(ethers.constants.HashZero);
      // mint a token and expect token hash to be updated to a non-zero hash
      await this.minter
        .connect(this.accounts.artist)
        .purchase(this.projectZero);
      expect(
        await this.genArt721Core.tokenIdToHash(
          this.projectZeroTokenZero.toNumber()
        )
      ).to.not.be.equal(ethers.constants.HashZero);
    });

    it("does not allow randomizer to call once a token hash has been set", async function () {
      // ensure token hash is initially zero
      expect(
        await this.genArt721Core.tokenIdToHash(
          this.projectZeroTokenZero.toNumber()
        )
      ).to.be.equal(ethers.constants.HashZero);
      // update randomizer to be a special mock randomizer for this test (seperate mint from token hash assignment)
      // deploy new RandomizerV2_NoAssignMock randomizer
      const mockRandomizer = await deployAndGet.call(
        this,
        "RandomizerV2_NoAssignMock",
        []
      );
      // update randomizer to new randomizer
      await mockRandomizer
        .connect(this.accounts.deployer)
        .assignCoreAndRenounce(this.genArt721Core.address);
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .updateRandomizerAddress(mockRandomizer.address);
      // mint a token and expect token hash to not be updated (due to the alternate randomizer)
      await this.minter
        .connect(this.accounts.artist)
        .purchase(this.projectZero);
      // set token hash and expect success
      await mockRandomizer.actuallyAssignTokenHash(
        this.projectZeroTokenZero.toNumber()
      );
      // expect revert when attempting to overwrite the token hash
      await expectRevert(
        mockRandomizer.actuallyAssignTokenHash(
          this.projectZeroTokenZero.toNumber()
        ),
        "Token hash already set"
      );
    });

    it("does not allow randomizer to assign hash if token does not yet exist", async function () {
      // update randomizer to be a special mock randomizer for this test (seperate mint from token hash assignment)
      // deploy new RandomizerV2_NoAssignMock randomizer
      const mockRandomizer = await deployAndGet.call(
        this,
        "RandomizerV2_NoAssignMock",
        []
      );
      // update randomizer to new randomizer
      await mockRandomizer
        .connect(this.accounts.deployer)
        .assignCoreAndRenounce(this.genArt721Core.address);
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .updateRandomizerAddress(mockRandomizer.address);
      // expect revert when attempting to set token hash of non-existing token
      await expectRevert(
        mockRandomizer.actuallyAssignTokenHash(
          this.projectZeroTokenZero.toNumber()
        ),
        "Token ID does not exist"
      );
    });
  });
});
