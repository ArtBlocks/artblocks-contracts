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

describe("MinterPermissionsEvents", async function () {
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
    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV2");
    this.genArt721CoreV2 = await artblocksFactory
      .connect(deployer)
      .deploy("Test Contract", "TEST", this.randomizer.address);
    const minterFilterFactory = await ethers.getContractFactory("MinterFilter");
    this.minterFilter = await minterFilterFactory.deploy(
      this.genArt721CoreV2.address
    );
    const minterFactory = await ethers.getContractFactory(
      "GenArt721FilteredMinter"
    );
    this.minter = await minterFactory.deploy(
      this.genArt721CoreV2.address,
      this.minterFilter.address
    );

    // Project setup
    const pricePerTokenInWei = ethers.utils.parseEther("1");
    await this.genArt721CoreV2
      .connect(deployer)
      .addProject(
        "Test Project",
        this.accounts.artist.address,
        pricePerTokenInWei
      );
  });

  describe("`addApprovedMinter`/`removeApprovedMinter`", async function () {
    const permissionErrorMessage = "Only Core whitelisted";
    const approvedMinterErrorMessage = "Only approved minters are allowed";

    it("is callable by 'whitelisted' EOA", async function () {
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .removeApprovedMinter(this.minter.address);
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.deployer)
          .setDefaultMinter(this.minter.address),
        approvedMinterErrorMessage
      );
    });

    it("is *not* callable by 'artist' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.artist)
          .addApprovedMinter(this.minter.address),
        permissionErrorMessage
      );
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.artist)
          .removeApprovedMinter(this.minter.address),
        permissionErrorMessage
      );
    });

    it("is *not* callable by 'misc' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.misc)
          .addApprovedMinter(this.minter.address),
        permissionErrorMessage
      );
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.misc)
          .removeApprovedMinter(this.minter.address),
        permissionErrorMessage
      );
    });
  });

  describe("`setDefaultMinter`", async function () {
    const permissionErrorMessage = "Only Core whitelisted";
    const approvedMinterErrorMessage = "Only approved minters are allowed";

    it("is callable by 'whitelisted' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.deployer)
          .setDefaultMinter(this.minter.address),
        approvedMinterErrorMessage
      );
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setDefaultMinter(this.minter.address);
    });

    it("is *not* callable by 'artist' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.artist)
          .setDefaultMinter(this.minter.address),
        permissionErrorMessage
      );
    });

    it("is *not* callable by 'misc' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.misc)
          .setDefaultMinter(this.minter.address),
        permissionErrorMessage
      );
    });
  });

  describe("`resetMinterForProjectToDefault`", async function () {
    const permissionErrorMessage = "Only Core whitelisted or Artist";

    it("is callable by 'whitelisted' EOA", async function () {
      await this.minterFilter
        .connect(this.accounts.deployer)
        .resetMinterForProjectToDefault(0);
    });

    it("is callable by 'artist' EOA", async function () {
      await this.minterFilter
        .connect(this.accounts.artist)
        .resetMinterForProjectToDefault(0);
    });

    it("is *not* callable by 'misc' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.misc)
          .resetMinterForProjectToDefault(0),
        permissionErrorMessage
      );
    });
  });

  describe("`setMinterForProject`", async function () {
    const permissionErrorMessage = "Only Core whitelisted or Artist";
    const approvedMinterErrorMessage = "Only approved minters are allowed";

    it("is callable by 'whitelisted' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(0, this.minter.address),
        approvedMinterErrorMessage
      );
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(0, this.minter.address);
    });

    it("is callable by 'artist' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.artist)
          .setMinterForProject(0, this.minter.address),
        approvedMinterErrorMessage
      );
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.artist)
        .setMinterForProject(0, this.minter.address);
    });

    it("is *not* callable by 'misc' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.misc)
          .setMinterForProject(0, this.minter.address),
        permissionErrorMessage
      );
    });
  });

  describe("`mint`", async function () {
    const permissionErrorMessage = "Not sent from correct minter for project";
    const pricePerTokenInWei = ethers.utils.parseEther("1");

    it("is *not* callable by 'whitelisted' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.deployer)
          .mint(
            this.accounts.deployer.address,
            0,
            this.accounts.deployer.address
          ),
        permissionErrorMessage
      );
    });

    it("is *not* callable by 'artist' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.artist)
          .mint(this.accounts.artist.address, 0, this.accounts.artist.address),
        permissionErrorMessage
      );
    });

    it("is *not* callable by 'minter' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.misc)
          .mint(this.accounts.misc.address, 0, this.accounts.misc.address),
        permissionErrorMessage
      );
    });
  });
});
