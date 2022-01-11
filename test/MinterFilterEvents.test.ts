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
  });

  describe("addApprovedMinter", async function () {
    it("emits an event", async function () {
      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minter.address)
      )
        .to.emit(this.minterFilter, "MinterApproved")
        .withArgs(this.minter.address);
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

  describe("setDefaultMinter", async function () {
    it("emits an event", async function () {
      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .setDefaultMinter(this.minter.address)
      )
        .to.emit(this.minterFilter, "DefaultMinterRegistered")
        .withArgs(this.minter.address);
    });
  });

  describe("resetMinterForProjectToDefault", async function () {
    it("emits an event", async function () {
      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .resetMinterForProjectToDefault(0)
      )
        .to.emit(this.minterFilter, "ProjectMinterRegistered")
        .withArgs(0, ethers.constants.AddressZero);
    });
  });

  describe("setMinterForProject", async function () {
    it("emits an event", async function () {
      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(0, this.minter.address)
      )
        .to.emit(this.minterFilter, "ProjectMinterRegistered")
        .withArgs(0, this.minter.address);

      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(1, this.minter.address)
      )
        .to.emit(this.minterFilter, "ProjectMinterRegistered")
        .withArgs(1, this.minter.address);
    });
  });
});
