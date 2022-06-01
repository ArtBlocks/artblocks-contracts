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

/**
 * @notice This tests MinterFilter events when integrating with a V2_PRTNR
 * core contract.
 */
describe("MinterFilterV0Events_V2PRTNRCore", async function () {
  beforeEach(async function () {
    const [deployer] = await ethers.getSigners();
    this.accounts = {
      deployer: deployer,
    };
    const randomizerFactory = await ethers.getContractFactory(
      "BasicRandomizer"
    );
    this.randomizer = await randomizerFactory.deploy();
    const coreFactory = await ethers.getContractFactory(
      "GenArt721CoreV2_PRTNR"
    );
    this.genArt721Core = await coreFactory
      .connect(deployer)
      .deploy("Test Contract", "TEST", this.randomizer.address);
    await this.genArt721Core
      .connect(deployer)
      .addProject("project0", deployer.address, 0);
    const minterFilterFactory = await ethers.getContractFactory(
      "MinterFilterV0"
    );
    this.minterFilter = await minterFilterFactory.deploy(
      this.genArt721Core.address
    );
    const minterFactory = await ethers.getContractFactory(
      "MinterSetPriceERC20V1"
    );
    this.minter = await minterFactory.deploy(
      this.genArt721Core.address,
      this.minterFilter.address
    );
    await this.minterFilter
      .connect(this.accounts.deployer)
      .addApprovedMinter(this.minter.address);
    // deploy all types of filtered minters
    const minterFactoryETH = await ethers.getContractFactory(
      "MinterSetPriceV0"
    );
    this.minterETH = await minterFactoryETH.deploy(
      this.genArt721Core.address,
      this.minterFilter.address
    );
    const minterFactoryETHAuction = await ethers.getContractFactory(
      "MinterDALinV0"
    );
    this.minterETHAuction = await minterFactoryETHAuction.deploy(
      this.genArt721Core.address,
      this.minterFilter.address
    );
  });

  describe("addApprovedMinter", async function () {
    it("emits an event for MinterSetPriceERC20V1", async function () {
      const minterType = "MinterSetPriceERC20V1";
      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minter.address)
      )
        .to.emit(this.minterFilter, "MinterApproved")
        .withArgs(this.minter.address, minterType);
    });

    it("emits an event for MinterSetPriceV0", async function () {
      const minterType = "MinterSetPriceV0";
      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minterETH.address)
      )
        .to.emit(this.minterFilter, "MinterApproved")
        .withArgs(this.minterETH.address, minterType);
    });

    it("emits an event for MinterDALinV0", async function () {
      const minterType = "MinterDALinV0";
      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minterETHAuction.address)
      )
        .to.emit(this.minterFilter, "MinterApproved")
        .withArgs(this.minterETHAuction.address, minterType);
    });
  });

  describe("removeApprovedMinter", async function () {
    it("emits an event", async function () {
      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .removeApprovedMinter(this.minter.address)
      )
        .to.emit(this.minterFilter, "MinterRevoked")
        .withArgs(this.minter.address);
    });
  });

  describe("removeMinterForProject", async function () {
    it("emits an event", async function () {
      // assign a minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(0, this.minter.address);
      // verify event when removing minter for project
      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .removeMinterForProject(0)
      )
        .to.emit(this.minterFilter, "ProjectMinterRemoved")
        .withArgs(0);
    });
  });

  describe("setMinterForProject", async function () {
    const minterType = "MinterSetPriceERC20V1";
    it("emits an event", async function () {
      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(0, this.minter.address)
      )
        .to.emit(this.minterFilter, "ProjectMinterRegistered")
        .withArgs(0, this.minter.address, minterType);
      // add project 1
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .addProject("project1", this.accounts.deployer.address, 0);
      // set minter for project 1
      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(1, this.minter.address)
      )
        .to.emit(this.minterFilter, "ProjectMinterRegistered")
        .withArgs(1, this.minter.address, minterType);
    });
  });

  describe("alertAsCanonicalMinterFilter", async function () {
    it("emits event alerting as canonical minter", async function () {
      // allowlist MinterFilter on core
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .addMintWhitelisted(this.minterFilter.address);
      // expect proper event
      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .alertAsCanonicalMinterFilter()
      )
        .to.emit(this.minterFilter, "IsCanonicalMinterFilter")
        .withArgs(this.genArt721Core.address);
    });
  });
});
