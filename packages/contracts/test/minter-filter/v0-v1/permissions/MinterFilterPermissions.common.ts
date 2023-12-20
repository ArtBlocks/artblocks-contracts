import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { safeAddProject, isCoreV3, T_Config } from "../../../util/common";
import { ethers } from "hardhat";

/**
 * These tests are intended to check common Permission behaviors of
 * MinterFilter contracts.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
const addressZero = "0x0000000000000000000000000000000000000000";

export const MinterFilterPermissions_Common = async (
  _beforeEach: () => Promise<T_Config>
) => {
  describe("`addApprovedMinter`/`removeApprovedMinter`", async function () {
    const approvedMinterErrorMessage = "Only approved minters are allowed";

    it("is callable by 'whitelisted' EOA", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .removeApprovedMinter(config.minter.address);
      await expectRevert(
        config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(config.projectZero, config.minter.address),
        approvedMinterErrorMessage
      );
    });

    it("is *not* callable by 'artist' EOA", async function () {
      const config = await loadFixture(_beforeEach);
      const permissionErrorMessage = (await isCoreV3(config.genArt721Core))
        ? "Only Core AdminACL allowed"
        : "Only Core whitelisted";
      await expectRevert(
        config.minterFilter
          .connect(config.accounts.artist)
          .addApprovedMinter(config.minter.address),
        permissionErrorMessage
      );
      await expectRevert(
        config.minterFilter
          .connect(config.accounts.artist)
          .removeApprovedMinter(config.minter.address),
        permissionErrorMessage
      );
    });

    it("is *not* callable by 'misc' EOA", async function () {
      const config = await loadFixture(_beforeEach);
      const permissionErrorMessage = (await isCoreV3(config.genArt721Core))
        ? "Only Core AdminACL allowed"
        : "Only Core whitelisted";
      await expectRevert(
        config.minterFilter
          .connect(config.accounts.user)
          .addApprovedMinter(config.minter.address),
        permissionErrorMessage
      );
      await expectRevert(
        config.minterFilter
          .connect(config.accounts.user)
          .removeApprovedMinter(config.minter.address),
        permissionErrorMessage
      );
    });
  });

  describe("alertAsCanonicalMinterFilter", async function () {
    const permissionErrorMessage = "Only Core whitelisted";
    const onlyMintAllowlistedErrorMessage = "Only mint allowlisted";

    it("is callable by 'whitelisted' EOA", async function () {
      const config = await loadFixture(_beforeEach);
      if (await isCoreV3(config.genArt721Core)) {
        console.log(
          "GenArt721CoreV3 does not need alert as canonical minter filter"
        );
        return;
      }
      await config.minterFilter
        .connect(config.accounts.deployer)
        .alertAsCanonicalMinterFilter();
    });

    it("is *not* callable by 'artist' EOA", async function () {
      const config = await loadFixture(_beforeEach);
      if (await isCoreV3(config.genArt721Core)) {
        console.log(
          "GenArt721CoreV3 does not need alert as canonical minter filter"
        );
        return;
      }
      await expectRevert(
        config.minterFilter
          .connect(config.accounts.artist)
          .alertAsCanonicalMinterFilter(),
        permissionErrorMessage
      );
    });

    it("is *not* callable by 'misc' EOA", async function () {
      const config = await loadFixture(_beforeEach);
      if (await isCoreV3(config.genArt721Core)) {
        console.log(
          "GenArt721CoreV3 does not need alert as canonical minter filter"
        );
        return;
      }
      await expectRevert(
        config.minterFilter
          .connect(config.accounts.user)
          .alertAsCanonicalMinterFilter(),
        permissionErrorMessage
      );
    });

    it("is *not* callable when not mint allowlisted on core", async function () {
      const config = await loadFixture(_beforeEach);
      if (await isCoreV3(config.genArt721Core)) {
        console.log(
          "GenArt721CoreV3 does not need alert as canonical minter filter"
        );
        return;
      }
      // remove minter from core allowlist by switching minter to null
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .removeMintWhitelisted(config.minterFilter.address);
      await expectRevert(
        config.minterFilter
          .connect(config.accounts.deployer)
          .alertAsCanonicalMinterFilter(),
        onlyMintAllowlistedErrorMessage
      );
    });
  });

  describe("`removeMinterForProject`", async function () {
    const minterNotAssignedErrorMessage = "EnumerableMap: nonexistent key";

    it("is not able to remove unassigned minters' EOA", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minterFilter
          .connect(config.accounts.deployer)
          .removeMinterForProject(config.projectZero),
        minterNotAssignedErrorMessage
      );
    });

    it("is callable by 'whitelisted' EOA", async function () {
      const config = await loadFixture(_beforeEach);
      // approve and assign minter
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);
      // whitelisted calls
      await config.minterFilter
        .connect(config.accounts.deployer)
        .removeMinterForProject(config.projectZero);
    });

    it("is callable by 'artist' EOA", async function () {
      const config = await loadFixture(_beforeEach);
      // approve and assign minter
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);
      // artist calls
      await config.minterFilter
        .connect(config.accounts.artist)
        .removeMinterForProject(config.projectZero);
    });

    it("is *not* callable by 'misc' EOA", async function () {
      const config = await loadFixture(_beforeEach);
      const permissionErrorMessage = (await isCoreV3(config.genArt721Core))
        ? "Only Core AdminACL or Artist"
        : "Only Core whitelisted or Artist";
      // approve and assign minter
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);
      // misc. EOA calls
      await expectRevert(
        config.minterFilter
          .connect(config.accounts.user)
          .removeMinterForProject(config.projectZero),
        permissionErrorMessage
      );
    });
  });

  describe("removeMintersForProjects", async function () {
    const minterNotAssignedErrorMessage = "EnumerableMap: nonexistent key";

    it("is not able to remove unassigned minters' EOA", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minterFilter
          .connect(config.accounts.deployer)
          .removeMintersForProjects([config.projectZero]),
        minterNotAssignedErrorMessage
      );
    });

    it("is callable by 'whitelisted' EOA", async function () {
      const config = await loadFixture(_beforeEach);
      // approve and assign minter
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);
      // whitelisted calls
      await config.minterFilter
        .connect(config.accounts.deployer)
        .removeMintersForProjects([config.projectZero]);
    });

    it("is *not* callable by 'artist' EOA", async function () {
      const config = await loadFixture(_beforeEach);
      const permissionErrorMessage = (await isCoreV3(config.genArt721Core))
        ? "Only Core AdminACL allowed"
        : "Only Core whitelisted";
      // approve and assign minter
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);
      // artist calls
      await expectRevert(
        config.minterFilter
          .connect(config.accounts.artist)
          .removeMintersForProjects([config.projectZero]),
        permissionErrorMessage
      );
    });

    it("is *not* callable by 'misc' EOA", async function () {
      const config = await loadFixture(_beforeEach);
      const permissionErrorMessage = (await isCoreV3(config.genArt721Core))
        ? "Only Core AdminACL allowed"
        : "Only Core whitelisted";
      // approve and assign minter
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);
      // misc. EOA calls
      await expectRevert(
        config.minterFilter
          .connect(config.accounts.user)
          .removeMintersForProjects([config.projectZero]),
        permissionErrorMessage
      );
    });
  });

  describe("`setMinterForProject`", async function () {
    const approvedMinterErrorMessage = "Only approved minters are allowed";
    const projectExistsErrorMessage = "Only existing projects";

    it("is callable by 'whitelisted' EOA", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(config.projectZero, config.minter.address),
        approvedMinterErrorMessage
      );
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);
    });

    it("is callable by 'artist' EOA", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minterFilter
          .connect(config.accounts.artist)
          .setMinterForProject(config.projectZero, config.minter.address),
        approvedMinterErrorMessage
      );
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.artist)
        .setMinterForProject(config.projectZero, config.minter.address);
    });

    it("is *not* callable by 'misc' EOA", async function () {
      const config = await loadFixture(_beforeEach);
      const permissionErrorMessage = (await isCoreV3(config.genArt721Core))
        ? "Only Core AdminACL or Artist"
        : "Only Core whitelisted or Artist";
      await expectRevert(
        config.minterFilter
          .connect(config.accounts.user)
          .setMinterForProject(config.projectZero, config.minter.address),
        permissionErrorMessage
      );
    });

    it("is *not* configurable for non-existent project", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await expectRevert(
        config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(99, config.minter.address),
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
      const config = await loadFixture(_beforeEach);
      // minter not approved
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero, {
            value: pricePerTokenInWei,
          }),
        priceNotConfiguredErrorMessage
      );
      // approve minter, but don't assign to project
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      // deployer call project with unassigned minter
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero, {
            value: pricePerTokenInWei,
          }),
        priceNotConfiguredErrorMessage
      );
    });

    it("is *not* callable when minter not configured", async function () {
      const config = await loadFixture(_beforeEach);
      // configure price
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(config.projectZero, pricePerTokenInWei);
      // minter not approved
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero, {
            value: pricePerTokenInWei,
          }),
        unassignedErrorMessage
      );
      // approve minter, but don't assign to project
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      // deployer call project with unassigned minter
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero, {
            value: pricePerTokenInWei,
          }),
        unassignedErrorMessage
      );
    });

    it("is *not* callable *after* is minter removed from project", async function () {
      const config = await loadFixture(_beforeEach);
      // approve and assign minter
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);
      // configure price
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(config.projectZero, pricePerTokenInWei);
      // successfully mint
      await config.minter
        .connect(config.accounts.artist)
        .purchase(config.projectZero, {
          value: pricePerTokenInWei,
        });
      // remove minter from project
      await config.minterFilter
        .connect(config.accounts.deployer)
        .removeMinterForProject(config.projectZero);
      // deployer call project with unassigned minter
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero, {
            value: pricePerTokenInWei,
          }),
        unassignedErrorMessage
      );
    });

    it("is *not* callable by incorrect minter for project", async function () {
      const config = await loadFixture(_beforeEach);
      // approve and assign minter A
      const minterA = config.minter;
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(minterA.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, minterA.address);
      // configure price on minter A
      await minterA
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(config.projectZero, pricePerTokenInWei);
      // deploy and approve minter B
      const minterFactory = await ethers.getContractFactory(
        "MinterSetPriceERC20V0"
      );
      const minterB = await minterFactory.deploy(
        config.genArt721Core.address,
        config.minterFilter.address
      );
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(minterB.address);
      // configure price on minter B
      await minterB
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(config.projectZero, pricePerTokenInWei);
      // success when minting from minterA
      await minterA
        .connect(config.accounts.artist)
        .purchase(config.projectZero, {
          value: pricePerTokenInWei,
        });
      // revert when minting from minterB
      await expectRevert(
        minterB
          .connect(config.accounts.artist)
          ["purchase(uint256)"](config.projectZero, {
            value: pricePerTokenInWei,
          }),
        assignedMinterError
      );
      // revert when minting from minterB - passing currency and price through
      await expectRevert(
        minterB
          .connect(config.accounts.artist)
          ["purchase(uint256,uint256,address)"](
            config.projectZero,
            pricePerTokenInWei,
            addressZero,
            {
              value: pricePerTokenInWei,
            }
          ),
        assignedMinterError
      );
      // remove A from project
      await config.minterFilter
        .connect(config.accounts.deployer)
        .removeMinterForProject(config.projectZero);
      // revert when minting from stale minterA
      await expectRevert(
        minterA.connect(config.accounts.artist).purchase(config.projectZero, {
          value: pricePerTokenInWei,
        }),
        unassignedErrorMessage
      );
    });

    it("is *not* directly callable by 'whitelisted' EOA", async function () {
      const config = await loadFixture(_beforeEach);
      // approve and assign minter
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);
      // call from deployer
      await expectRevert(
        config.minterFilter
          .connect(config.accounts.deployer)
          .mint(
            config.accounts.deployer.address,
            config.projectZero,
            config.accounts.deployer.address
          ),
        assignedMinterError
      );
    });

    it("is *not* directly callable by 'artist' EOA", async function () {
      const config = await loadFixture(_beforeEach);
      // approve and assign minter
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);
      // call from artist
      await expectRevert(
        config.minterFilter
          .connect(config.accounts.artist)
          .mint(
            config.accounts.artist.address,
            config.projectZero,
            config.accounts.artist.address
          ),
        assignedMinterError
      );
    });

    it("is *not* directly callable by misc EOA", async function () {
      const config = await loadFixture(_beforeEach);
      // approve and assign minter
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);
      // call from misc
      await expectRevert(
        config.minterFilter
          .connect(config.accounts.user)
          .mint(
            config.accounts.user.address,
            config.projectZero,
            config.accounts.user.address
          ),
        assignedMinterError
      );
    });
  });
};
