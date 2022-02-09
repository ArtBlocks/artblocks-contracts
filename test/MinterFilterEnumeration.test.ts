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

describe("MinterFilterEnumeration", async function () {
  beforeEach(async function () {
    // Deployment
    const [deployer, artist, misc] = await ethers.getSigners();
    this.accounts = {
      deployer: deployer,
      artist: artist,
      misc: misc,
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

    // Project setup
    const pricePerTokenInWei = ethers.utils.parseEther("1");
    await this.genArt721Core
      .connect(deployer)
      .addProject(
        "Test Project",
        this.accounts.artist.address,
        pricePerTokenInWei
      );
  });

  describe("no projects configured", async function () {
    const indexErrorMessage =
      "Array accessed at an out-of-bounds or negative index";

    it("returns correct length when no projects assigned minter", async function () {
      const numProjects = await this.minterFilter
        .connect(this.accounts.deployer)
        .getNumProjectsWithMinters();
      expect(numProjects).to.be.equal(0);
    });

    it("throws when getting info at non-existent index", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.deployer)
          .getProjectAndMinterInfoAt(0),
        indexErrorMessage
      );
    });
  });

  describe("project is configured", async function () {
    it("returns correct length when one project assigned minter", async function () {
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(0, this.minter.address);
      // expect length to reflect configured project
      const numProjects = await this.minterFilter
        .connect(this.accounts.deployer)
        .getNumProjectsWithMinters();
      expect(numProjects).to.be.equal(1);
    });

    it("returns correct info for project at existing index", async function () {
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(0, this.minter.address);
      // expect appropriate info when getting at index that exists
      const results = await this.minterFilter
        .connect(this.accounts.deployer)
        .getProjectAndMinterInfoAt(0);
      const expectedMinterType = await this.minter
        .connect(this.accounts.deployer)
        .minterType();
      expect(expectedMinterType).to.not.be.equal(undefined);
      expect(results.projectId).to.be.equal(0);
      expect(results.minterAddress).to.be.equal(this.minter.address);
      expect(results.minterType).to.be.equal(expectedMinterType);
    });
  });

  describe("project has minter", async function () {
    it("returns true when project has a minter", async function () {
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(0, this.minter.address);
      // expect projectHasMinter to be true
      const _projectHasMinter = await this.minterFilter
        .connect(this.accounts.deployer)
        .projectHasMinter(0);
      expect(_projectHasMinter).to.be.true;
    });

    it("returns false when project does not have a minter", async function () {
      // expect projectHasMinter to be false
      const _projectHasMinter = await this.minterFilter
        .connect(this.accounts.deployer)
        .projectHasMinter(0);
      expect(_projectHasMinter).to.be.false;
    });
  });
});
