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

describe("MinterFilterEvents", async function () {
  beforeEach(async function () {
    const [deployer] = await ethers.getSigners();
    this.accounts = {
      deployer: deployer,
    };
    const randomizerFactory = await ethers.getContractFactory("Randomizer");
    this.randomizer = await randomizerFactory.deploy();
    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV3");
    this.genArt721Core = await artblocksFactory
      .connect(deployer)
      .deploy("Test Contract", "TEST", this.randomizer.address);
    await this.genArt721Core
      .connect(deployer)
      .addProject("project0", deployer.address);
    const minterFilterFactory = await ethers.getContractFactory("MinterFilter");
    this.minterFilter = await minterFilterFactory.deploy(
      this.genArt721Core.address
    );
    const minterFactory = await ethers.getContractFactory(
      "GenArt721FilteredMinter"
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
      "GenArt721FilteredMinterETH"
    );
    this.minterETH = await minterFactoryETH.deploy(
      this.genArt721Core.address,
      this.minterFilter.address
    );
    const minterFactoryETHAuction = await ethers.getContractFactory(
      "GenArt721FilteredMinterETHAuction"
    );
    this.minterETHAuction = await minterFactoryETHAuction.deploy(
      this.genArt721Core.address,
      this.minterFilter.address
    );
  });

  describe("addApprovedMinter", async function () {
    it("emits an event for GenArt721FilteredMinter", async function () {
      const minterType = "GenArt721FilteredMinter";
      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minter.address)
      )
        .to.emit(this.minterFilter, "MinterApproved")
        .withArgs(this.minter.address, minterType);
    });

    it("emits an event for GenArt721FilteredMinterETH", async function () {
      const minterType = "GenArt721FilteredMinterETH";
      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minterETH.address)
      )
        .to.emit(this.minterFilter, "MinterApproved")
        .withArgs(this.minterETH.address, minterType);
    });

    it("emits an event for GenArt721FilteredMinterETHAuction", async function () {
      const minterType = "GenArt721FilteredMinterETHAuction";
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
    const minterType = "GenArt721FilteredMinter";
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
        .addProject("project1", this.accounts.deployer.address);
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
        .updateMinterContract(this.minterFilter.address);
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
