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
  const pricePerTokenInWei = ethers.utils.parseEther("1");

  const projectZero = 3; // V1 core begins at project 3

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
    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV1");
    this.genArt721Core = await artblocksFactory
      .connect(deployer)
      .deploy("Test Contract", "TEST", this.randomizer.address);
    const minterFilterFactory = await ethers.getContractFactory(
      "MinterFilterV0"
    );
    this.minterFilter = await minterFilterFactory.deploy(
      this.genArt721Core.address
    );
    const minterFactory = await ethers.getContractFactory(
      "MinterSetPriceERC20V0"
    );
    this.minter = await minterFactory.deploy(
      this.genArt721Core.address,
      this.minterFilter.address
    );

    // Project setup
    await this.genArt721Core
      .connect(deployer)
      .addProject("Test Project", this.accounts.artist.address, 0, false);

    await this.genArt721Core
      .connect(artist)
      .updateProjectMaxInvocations(projectZero, 15);
    await this.genArt721Core
      .connect(deployer)
      .addMintWhitelisted(this.minterFilter.address);
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
          .setMinterForProject(projectZero, this.minter.address),
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

  describe("alertAsCanonicalMinterFilter", async function () {
    const permissionErrorMessage = "Only Core whitelisted";
    const onlyMintAllowlistedErrorMessage = "Only mint allowlisted";

    it("is callable by 'whitelisted' EOA", async function () {
      await this.minterFilter
        .connect(this.accounts.deployer)
        .alertAsCanonicalMinterFilter();
    });

    it("is *not* callable by 'artist' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.artist)
          .alertAsCanonicalMinterFilter(),
        permissionErrorMessage
      );
    });

    it("is *not* callable by 'misc' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.misc)
          .alertAsCanonicalMinterFilter(),
        permissionErrorMessage
      );
    });

    it("is *not* callable when not mint allowlisted on core", async function () {
      // remove minter from core allowlist by switching minter to null
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .removeMintWhitelisted(this.minterFilter.address);
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.deployer)
          .alertAsCanonicalMinterFilter(),
        onlyMintAllowlistedErrorMessage
      );
    });
  });

  describe("`removeMinterForProject`", async function () {
    const permissionErrorMessage = "Only Core whitelisted or Artist";
    const minterNotAssignedErrorMessage = "EnumerableMap: nonexistent key";

    it("is not able to remove unassigned minters' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.deployer)
          .removeMinterForProject(projectZero),
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
        .setMinterForProject(projectZero, this.minter.address);
      // whitelisted calls
      await this.minterFilter
        .connect(this.accounts.deployer)
        .removeMinterForProject(projectZero);
    });

    it("is callable by 'artist' EOA", async function () {
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(projectZero, this.minter.address);
      // artist calls
      await this.minterFilter
        .connect(this.accounts.artist)
        .removeMinterForProject(projectZero);
    });

    it("is *not* callable by 'misc' EOA", async function () {
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(projectZero, this.minter.address);
      // misc. EOA calls
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.misc)
          .removeMinterForProject(projectZero),
        permissionErrorMessage
      );
    });
  });

  describe("removeMintersForProjects", async function () {
    const permissionErrorMessage = "Only Core whitelisted";
    const minterNotAssignedErrorMessage = "EnumerableMap: nonexistent key";

    it("is not able to remove unassigned minters' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.deployer)
          .removeMintersForProjects([projectZero]),
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
        .setMinterForProject(projectZero, this.minter.address);
      // whitelisted calls
      await this.minterFilter
        .connect(this.accounts.deployer)
        .removeMintersForProjects([projectZero]);
    });

    it("is *not* callable by 'artist' EOA", async function () {
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(projectZero, this.minter.address);
      // artist calls
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.artist)
          .removeMintersForProjects([projectZero]),
        permissionErrorMessage
      );
    });

    it("is *not* callable by 'misc' EOA", async function () {
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(projectZero, this.minter.address);
      // misc. EOA calls
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.misc)
          .removeMintersForProjects([projectZero]),
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
          .setMinterForProject(projectZero, this.minter.address),
        approvedMinterErrorMessage
      );
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(projectZero, this.minter.address);
    });

    it("is callable by 'artist' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.artist)
          .setMinterForProject(projectZero, this.minter.address),
        approvedMinterErrorMessage
      );
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.artist)
        .setMinterForProject(projectZero, this.minter.address);
    });

    it("is *not* callable by 'misc' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.misc)
          .setMinterForProject(projectZero, this.minter.address),
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
          .setMinterForProject(99, this.minter.address),
        projectExistsErrorMessage
      );
    });
  });

  describe("`mint`", async function () {
    const onlyApprovedErrorMessage = "Only approved minters";
    const permissionErrorMessage = "Only assigned minter";
    const unassignedErrorMessage = "EnumerableMap: nonexistent key";
    const priceNotConfiguredErrorMessage = "Price not configured";
    const pricePerTokenInWei = ethers.utils.parseEther("1");

    it("is *not* callable when price not configured", async function () {
      // minter not approved
      await expectRevert(
        this.minter.connect(this.accounts.artist).purchase(projectZero, {
          value: pricePerTokenInWei,
          gasPrice: 1,
        }),
        priceNotConfiguredErrorMessage
      );
      // approve minter, but don't assign to project
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      // deployer call project with unassigned minter
      await expectRevert(
        this.minter.connect(this.accounts.artist).purchase(projectZero, {
          value: pricePerTokenInWei,
          gasPrice: 1,
        }),
        priceNotConfiguredErrorMessage
      );
    });

    it("is *not* callable when minter not configured", async function () {
      // configure price
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectZero, pricePerTokenInWei);
      // minter not approved
      await expectRevert(
        this.minter.connect(this.accounts.artist).purchase(projectZero, {
          value: pricePerTokenInWei,
          gasPrice: 1,
        }),
        unassignedErrorMessage
      );
      // approve minter, but don't assign to project
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      // deployer call project with unassigned minter
      await expectRevert(
        this.minter.connect(this.accounts.artist).purchase(projectZero, {
          value: pricePerTokenInWei,
          gasPrice: 1,
        }),
        unassignedErrorMessage
      );
    });

    it("is *not* callable *after* is minter removed from project", async function () {
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(projectZero, this.minter.address);
      // configure price
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectZero, pricePerTokenInWei);
      // successfully mint
      await this.minter.connect(this.accounts.artist).purchase(projectZero, {
        value: pricePerTokenInWei,
        gasPrice: 1,
      });
      // remove minter from project
      await this.minterFilter
        .connect(this.accounts.deployer)
        .removeMinterForProject(projectZero);
      // deployer call project with unassigned minter
      await expectRevert(
        this.minter.connect(this.accounts.artist).purchase(projectZero, {
          value: pricePerTokenInWei,
          gasPrice: 1,
        }),
        unassignedErrorMessage
      );
    });

    it("is *not* callable by incorrect minter for project", async function () {
      // approve and assign minter A
      const minterA = this.minter;
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(minterA.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(projectZero, minterA.address);
      // configure price on minter A
      await minterA
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectZero, pricePerTokenInWei);
      // deploy and approve minter B
      const minterFactory = await ethers.getContractFactory(
        "MinterSetPriceERC20V0"
      );
      const minterB = await minterFactory.deploy(
        this.genArt721Core.address,
        this.minterFilter.address
      );
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(minterB.address);
      // configure price on minter B
      await minterB
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(projectZero, pricePerTokenInWei);
      // success when minting from minterA
      await minterA.connect(this.accounts.artist).purchase(projectZero, {
        value: pricePerTokenInWei,
        gasPrice: 1,
      });
      // revert when minting from minterB
      await expectRevert(
        minterB.connect(this.accounts.artist).purchase(projectZero, {
          value: pricePerTokenInWei,
          gasPrice: 1,
        }),
        permissionErrorMessage
      );
      // remove A from project
      await this.minterFilter
        .connect(this.accounts.deployer)
        .removeMinterForProject(projectZero);
      // revert when minting from stale minterA
      await expectRevert(
        minterA.connect(this.accounts.artist).purchase(projectZero, {
          value: pricePerTokenInWei,
          gasPrice: 1,
        }),
        unassignedErrorMessage
      );
    });

    it("is *not* directly callable by 'whitelisted' EOA", async function () {
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(projectZero, this.minter.address);
      // call from deployer
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.deployer)
          .mint(
            this.accounts.deployer.address,
            projectZero,
            this.accounts.deployer.address
          ),
        permissionErrorMessage
      );
    });

    it("is *not* directly callable by 'artist' EOA", async function () {
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(projectZero, this.minter.address);
      // call from artist
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.artist)
          .mint(
            this.accounts.artist.address,
            projectZero,
            this.accounts.artist.address
          ),
        permissionErrorMessage
      );
    });

    it("is *not* directly callable by misc EOA", async function () {
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(projectZero, this.minter.address);
      // call from misc
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.misc)
          .mint(
            this.accounts.misc.address,
            projectZero,
            this.accounts.misc.address
          ),
        permissionErrorMessage
      );
    });
  });
});
