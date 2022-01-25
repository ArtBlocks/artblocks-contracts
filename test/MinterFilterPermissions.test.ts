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
          .setMinterForProject(0, this.minter.address),
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

  describe("`removeMinterForProject`", async function () {
    const permissionErrorMessage = "Only Core whitelisted or Artist";
    const minterNotAssignedErrorMessage =
      "Only projects with an assigned minter";

    it("is not able to remove unassigned minters' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.deployer)
          .removeMinterForProject(0),
        minterNotAssignedErrorMessage
      );
    });

    it("is callable by 'whitelisted' EOA", async function () {
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(0, this.minter.address);
      // whitelisted calls
      await this.minterFilter
        .connect(this.accounts.deployer)
        .removeMinterForProject(0);
    });

    it("is callable by 'artist' EOA", async function () {
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(0, this.minter.address);
      // artist calls
      await this.minterFilter
        .connect(this.accounts.artist)
        .removeMinterForProject(0);
    });

    it("is *not* callable by 'misc' EOA", async function () {
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(0, this.minter.address);
      // misc. EOA calls
      await expectRevert(
        this.minterFilter.connect(this.accounts.misc).removeMinterForProject(0),
        permissionErrorMessage
      );
    });
  });

  describe("`setMinterForProject`", async function () {
    const permissionErrorMessage = "Only Core whitelisted or Artist";
    const approvedMinterErrorMessage = "Only approved minters are allowed";
    const projectExistsErrorMessage = "Only existing projects";

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

    it("is *not* configurable for non-existent project", async function () {
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(1, this.minter.address),
        projectExistsErrorMessage
      );
    });
  });

  describe("`mint`", async function () {
    const permissionErrorMessage = "Only assigned minter for project";
    const unassignedErrorMessage = "Only projects with an assigned minter";
    const pricePerTokenInWei = ethers.utils.parseEther("1");

    it("is *not* callable when minter not configured", async function () {
      // deployer call project with unassigned minter
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.artist)
          .mint(
            this.accounts.deployer.address,
            0,
            this.accounts.artist.address
          ),
        unassignedErrorMessage
      );
    });

    it("is *not* callable by 'whitelisted' EOA", async function () {
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(0, this.minter.address);
      // call from deployer
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
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(0, this.minter.address);
      // call from artist
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.artist)
          .mint(this.accounts.artist.address, 0, this.accounts.artist.address),
        permissionErrorMessage
      );
    });

    it("is *not* callable by 'minter' EOA", async function () {
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(0, this.minter.address);
      // call from misc
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.misc)
          .mint(this.accounts.misc.address, 0, this.accounts.misc.address),
        permissionErrorMessage
      );
    });
  });
});
