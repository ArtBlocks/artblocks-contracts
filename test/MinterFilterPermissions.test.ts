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
      .addProject("Test Project", this.accounts.artist.address);

    await this.genArt721Core.connect(artist).updateProjectMaxInvocations(0, 15);
    await this.genArt721Core
      .connect(deployer)
      .updateMinterContract(this.minterFilter.address);
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
        .updateMinterContract(this.accounts.misc.address);
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

  describe("removeMintersForProjects", async function () {
    const permissionErrorMessage = "Only Core whitelisted";
    const minterNotAssignedErrorMessage = "EnumerableMap: nonexistent key";

    it("is not able to remove unassigned minters' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.deployer)
          .removeMintersForProjects([0]),
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
        .removeMintersForProjects([0]);
    });

    it("is *not* callable by 'artist' EOA", async function () {
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(0, this.minter.address);
      // artist calls
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.artist)
          .removeMintersForProjects([0]),
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
        .setMinterForProject(0, this.minter.address);
      // misc. EOA calls
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.misc)
          .removeMintersForProjects([0]),
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
    const onlyApprovedErrorMessage = "Only approved minters";
    const permissionErrorMessage = "Only assigned minter";
    const unassignedErrorMessage = "EnumerableMap: nonexistent key";
    const priceNotConfiguredErrorMessage = "Price not configured";
    const pricePerTokenInWei = ethers.utils.parseEther("1");

    it("is *not* callable when price not configured", async function () {
      // minter not approved
      await expectRevert(
        this.minter.connect(this.accounts.artist).purchase(0, {
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
        this.minter.connect(this.accounts.artist).purchase(0, {
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
        .updatePricePerTokenInWei(0, pricePerTokenInWei);
      // minter not approved
      await expectRevert(
        this.minter.connect(this.accounts.artist).purchase(0, {
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
        this.minter.connect(this.accounts.artist).purchase(0, {
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
        .setMinterForProject(0, this.minter.address);
      // configure price
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(0, pricePerTokenInWei);
      // successfully mint
      await this.minter.connect(this.accounts.artist).purchase(0, {
        value: pricePerTokenInWei,
        gasPrice: 1,
      });
      // remove minter from project
      await this.minterFilter
        .connect(this.accounts.deployer)
        .removeMinterForProject(0);
      // deployer call project with unassigned minter
      await expectRevert(
        this.minter.connect(this.accounts.artist).purchase(0, {
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
        .setMinterForProject(0, minterA.address);
      // configure price on minter A
      await minterA
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(0, pricePerTokenInWei);
      // deploy and approve minter B
      const minterFactory = await ethers.getContractFactory(
        "GenArt721FilteredMinter"
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
        .updatePricePerTokenInWei(0, pricePerTokenInWei);
      // success when minting from minterA
      await minterA.connect(this.accounts.artist).purchase(0, {
        value: pricePerTokenInWei,
        gasPrice: 1,
      });
      // revert when minting from minterB
      await expectRevert(
        minterB.connect(this.accounts.artist).purchase(0, {
          value: pricePerTokenInWei,
          gasPrice: 1,
        }),
        permissionErrorMessage
      );
      // remove A from project
      await this.minterFilter
        .connect(this.accounts.deployer)
        .removeMinterForProject(0);
      // revert when minting from stale minterA
      await expectRevert(
        minterA.connect(this.accounts.artist).purchase(0, {
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

    it("is *not* directly callable by 'artist' EOA", async function () {
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

    it("is *not* directly callable by misc EOA", async function () {
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
