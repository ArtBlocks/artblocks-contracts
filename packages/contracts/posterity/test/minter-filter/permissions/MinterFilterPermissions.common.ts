import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { safeAddProject, isCoreV3 } from "../../util/common";
import { ethers } from "hardhat";

/**
 * These tests are intended to check common Permission behaviors of
 * MinterFilter contracts.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const MinterFilterPermissions_Common = async () => {
  describe("`addApprovedMinter`/`removeApprovedMinter`", async function () {
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
          .setMinterForProject(this.projectZero, this.minter.address),
        approvedMinterErrorMessage
      );
    });

    it("is *not* callable by 'artist' EOA", async function () {
      const permissionErrorMessage = (await isCoreV3(this.genArt721Core))
        ? "Only Core AdminACL allowed"
        : "Only Core whitelisted";
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
      const permissionErrorMessage = (await isCoreV3(this.genArt721Core))
        ? "Only Core AdminACL allowed"
        : "Only Core whitelisted";
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.user)
          .addApprovedMinter(this.minter.address),
        permissionErrorMessage
      );
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.user)
          .removeApprovedMinter(this.minter.address),
        permissionErrorMessage
      );
    });
  });

  describe("alertAsCanonicalMinterFilter", async function () {
    const permissionErrorMessage = "Only Core whitelisted";
    const onlyMintAllowlistedErrorMessage = "Only mint allowlisted";

    it("is callable by 'whitelisted' EOA", async function () {
      if (await isCoreV3(this.genArt721Core)) {
        console.log(
          "GenArt721CoreV3 does not need alert as canonical minter filter"
        );
        return;
      }
      await this.minterFilter
        .connect(this.accounts.deployer)
        .alertAsCanonicalMinterFilter();
    });

    it("is *not* callable by 'artist' EOA", async function () {
      if (await isCoreV3(this.genArt721Core)) {
        console.log(
          "GenArt721CoreV3 does not need alert as canonical minter filter"
        );
        return;
      }
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.artist)
          .alertAsCanonicalMinterFilter(),
        permissionErrorMessage
      );
    });

    it("is *not* callable by 'misc' EOA", async function () {
      if (await isCoreV3(this.genArt721Core)) {
        console.log(
          "GenArt721CoreV3 does not need alert as canonical minter filter"
        );
        return;
      }
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.user)
          .alertAsCanonicalMinterFilter(),
        permissionErrorMessage
      );
    });

    it("is *not* callable when not mint allowlisted on core", async function () {
      if (await isCoreV3(this.genArt721Core)) {
        console.log(
          "GenArt721CoreV3 does not need alert as canonical minter filter"
        );
        return;
      }
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
    const minterNotAssignedErrorMessage = "EnumerableMap: nonexistent key";

    it("is not able to remove unassigned minters' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.deployer)
          .removeMinterForProject(this.projectZero),
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
        .setMinterForProject(this.projectZero, this.minter.address);
      // whitelisted calls
      await this.minterFilter
        .connect(this.accounts.deployer)
        .removeMinterForProject(this.projectZero);
    });

    it("is callable by 'artist' EOA", async function () {
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectZero, this.minter.address);
      // artist calls
      await this.minterFilter
        .connect(this.accounts.artist)
        .removeMinterForProject(this.projectZero);
    });

    it("is *not* callable by 'misc' EOA", async function () {
      const permissionErrorMessage = (await isCoreV3(this.genArt721Core))
        ? "Only Core AdminACL or Artist"
        : "Only Core whitelisted or Artist";
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectZero, this.minter.address);
      // misc. EOA calls
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.user)
          .removeMinterForProject(this.projectZero),
        permissionErrorMessage
      );
    });
  });

  describe("removeMintersForProjects", async function () {
    const minterNotAssignedErrorMessage = "EnumerableMap: nonexistent key";

    it("is not able to remove unassigned minters' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.deployer)
          .removeMintersForProjects([this.projectZero]),
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
        .setMinterForProject(this.projectZero, this.minter.address);
      // whitelisted calls
      await this.minterFilter
        .connect(this.accounts.deployer)
        .removeMintersForProjects([this.projectZero]);
    });

    it("is *not* callable by 'artist' EOA", async function () {
      const permissionErrorMessage = (await isCoreV3(this.genArt721Core))
        ? "Only Core AdminACL allowed"
        : "Only Core whitelisted";
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectZero, this.minter.address);
      // artist calls
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.artist)
          .removeMintersForProjects([this.projectZero]),
        permissionErrorMessage
      );
    });

    it("is *not* callable by 'misc' EOA", async function () {
      const permissionErrorMessage = (await isCoreV3(this.genArt721Core))
        ? "Only Core AdminACL allowed"
        : "Only Core whitelisted";
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectZero, this.minter.address);
      // misc. EOA calls
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.user)
          .removeMintersForProjects([this.projectZero]),
        permissionErrorMessage
      );
    });
  });

  describe("`setMinterForProject`", async function () {
    const approvedMinterErrorMessage = "Only approved minters are allowed";
    const projectExistsErrorMessage = "Only existing projects";

    it("is callable by 'whitelisted' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(this.projectZero, this.minter.address),
        approvedMinterErrorMessage
      );
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectZero, this.minter.address);
    });

    it("is callable by 'artist' EOA", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.artist)
          .setMinterForProject(this.projectZero, this.minter.address),
        approvedMinterErrorMessage
      );
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.artist)
        .setMinterForProject(this.projectZero, this.minter.address);
    });

    it("is *not* callable by 'misc' EOA", async function () {
      const permissionErrorMessage = (await isCoreV3(this.genArt721Core))
        ? "Only Core AdminACL or Artist"
        : "Only Core whitelisted or Artist";
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.user)
          .setMinterForProject(this.projectZero, this.minter.address),
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
    const unassignedErrorMessage = "EnumerableMap: nonexistent key";
    const priceNotConfiguredErrorMessage = "Price not configured";
    const pricePerTokenInWei = ethers.utils.parseEther("1");
    const assignedMinterError = "Only assigned minter";

    it("is *not* callable when price not configured", async function () {
      // minter not approved
      await expectRevert(
        this.minter.connect(this.accounts.artist).purchase(this.projectZero, {
          value: pricePerTokenInWei,
        }),
        priceNotConfiguredErrorMessage
      );
      // approve minter, but don't assign to project
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      // deployer call project with unassigned minter
      await expectRevert(
        this.minter.connect(this.accounts.artist).purchase(this.projectZero, {
          value: pricePerTokenInWei,
        }),
        priceNotConfiguredErrorMessage
      );
    });

    it("is *not* callable when minter not configured", async function () {
      // configure price
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectZero, pricePerTokenInWei);
      // minter not approved
      await expectRevert(
        this.minter.connect(this.accounts.artist).purchase(this.projectZero, {
          value: pricePerTokenInWei,
        }),
        unassignedErrorMessage
      );
      // approve minter, but don't assign to project
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      // deployer call project with unassigned minter
      await expectRevert(
        this.minter.connect(this.accounts.artist).purchase(this.projectZero, {
          value: pricePerTokenInWei,
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
        .setMinterForProject(this.projectZero, this.minter.address);
      // configure price
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectZero, pricePerTokenInWei);
      // successfully mint
      await this.minter
        .connect(this.accounts.artist)
        .purchase(this.projectZero, {
          value: pricePerTokenInWei,
        });
      // remove minter from project
      await this.minterFilter
        .connect(this.accounts.deployer)
        .removeMinterForProject(this.projectZero);
      // deployer call project with unassigned minter
      await expectRevert(
        this.minter.connect(this.accounts.artist).purchase(this.projectZero, {
          value: pricePerTokenInWei,
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
        .setMinterForProject(this.projectZero, minterA.address);
      // configure price on minter A
      await minterA
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectZero, pricePerTokenInWei);
      // deploy and approve minter B
      const minterFactory = await ethers.getContractFactory(
        "MinterSetPriceERC20V0"
      );
      const addressZero = "0x0000000000000000000000000000000000000000";
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
        .updatePricePerTokenInWei(this.projectZero, pricePerTokenInWei);
      // success when minting from minterA
      await minterA.connect(this.accounts.artist).purchase(this.projectZero, {
        value: pricePerTokenInWei,
      });
      // revert when minting from minterB
      await expectRevert(
        minterB
          .connect(this.accounts.artist)
          ["purchase(uint256)"](this.projectZero, {
            value: pricePerTokenInWei,
          }),
        assignedMinterError
      );
      // revert when minting from minterB passing currency and price through
      await expectRevert(
        minterB
          .connect(this.accounts.artist)
          ["purchase(uint256,uint256,address)"](
            this.projectZero,
            pricePerTokenInWei,
            addressZero,
            {
              value: pricePerTokenInWei,
            }
          ),
        assignedMinterError
      );
      // remove A from project
      await this.minterFilter
        .connect(this.accounts.deployer)
        .removeMinterForProject(this.projectZero);
      // revert when minting from stale minterA
      await expectRevert(
        minterA.connect(this.accounts.artist).purchase(this.projectZero, {
          value: pricePerTokenInWei,
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
        .setMinterForProject(this.projectZero, this.minter.address);
      // call from deployer
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.deployer)
          .mint(
            this.accounts.deployer.address,
            this.projectZero,
            this.accounts.deployer.address
          ),
        assignedMinterError
      );
    });

    it("is *not* directly callable by 'artist' EOA", async function () {
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectZero, this.minter.address);
      // call from artist
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.artist)
          .mint(
            this.accounts.artist.address,
            this.projectZero,
            this.accounts.artist.address
          ),
        assignedMinterError
      );
    });

    it("is *not* directly callable by misc EOA", async function () {
      // approve and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectZero, this.minter.address);
      // call from misc
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.user)
          .mint(
            this.accounts.user.address,
            this.projectZero,
            this.accounts.user.address
          ),
        assignedMinterError
      );
    });
  });
};
