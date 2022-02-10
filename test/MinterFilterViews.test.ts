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

describe("MinterFilterViews", async function () {
  const pricePerTokenInWei = ethers.utils.parseEther("1");

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
    await this.genArt721Core
      .connect(deployer)
      .addProject(
        "Test Project",
        this.accounts.artist.address,
        pricePerTokenInWei
      );
    // Project 1 setup
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject(
        "Test Project One",
        this.accounts.artist.address,
        pricePerTokenInWei
      );
  });

  describe("projectHasMinter", async function () {
    it("returns false when project does not have minter", async function () {
      let result = await this.minterFilter
        .connect(this.accounts.deployer)
        .projectHasMinter(0);
      expect(result).to.be.equal(false);
    });

    it("returns true when project has minter", async function () {
      // approve minter and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(0, this.minter.address);
      // expect project zero to have minter
      let result = await this.minterFilter
        .connect(this.accounts.deployer)
        .projectHasMinter(0);
      expect(result).to.be.equal(true);
    });
  });

  describe("getMinterForProject", async function () {
    const noMinterAssignedErrorMessage = "No minter assigned";

    it("reverts when project does not have minter", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.deployer)
          .getMinterForProject(0),
        noMinterAssignedErrorMessage
      );
    });

    it("returns correct minter when project has minter", async function () {
      // approve minter and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(0, this.minter.address);
      // expect appropriate result
      const result = await this.minterFilter
        .connect(this.accounts.deployer)
        .getMinterForProject(0);
      expect(result).to.be.equal(this.minter.address);
    });

    it("reverts when project has minter previously removed", async function () {
      // approve minter and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(0, this.minter.address);
      // remove minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .removeMintersForProjects([0]);
      // expect appropriate result
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.deployer)
          .getMinterForProject(0),
        noMinterAssignedErrorMessage
      );
    });
  });
});
