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
  fullyMintProject,
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

    const randomizerFactory = await ethers.getContractFactory(
      "BasicRandomizer"
    );
    this.randomizer = await randomizerFactory.deploy();
    const adminACLFactory = await ethers.getContractFactory(
      "MockAdminACLV0Events"
    );
    this.adminACL = await adminACLFactory.deploy();
    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV3");
    this.genArt721Core = await artblocksFactory
      .connect(this.accounts.deployer)
      .deploy(
        this.name,
        this.symbol,
        this.randomizer.address,
        this.adminACL.address
      );

    // TBD - V3 DOES NOT CURRENTLY HAVE A WORKING MINTER

    // allow artist to mint on contract
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .updateMinterContract(this.accounts.artist.address);

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
      await fullyMintProject.call(this, this.projectZero, this.accounts.artist);
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
});
