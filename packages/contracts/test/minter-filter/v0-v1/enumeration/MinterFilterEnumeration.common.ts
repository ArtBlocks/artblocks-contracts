import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { safeAddProject, T_Config } from "../../../util/common";

/**
 * These tests are intended to check common Enumeration behaviors of
 * MinterFilter contracts.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const MinterFilterEnumeration_Common = async (
  _beforeEach: () => Promise<T_Config>
) => {
  describe("Enumerable Map: minterForProject", async function () {
    describe("no projects configured", async function () {
      const indexErrorMessage =
        "Array accessed at an out-of-bounds or negative index";

      it("returns correct length when no projects assigned minter", async function () {
        const config = await loadFixture(_beforeEach);
        const numProjects = await config.minterFilter
          .connect(config.accounts.deployer)
          .getNumProjectsWithMinters();
        expect(numProjects).to.be.equal(0);
      });

      // solidity-coverage swallows the OpenZeppelin's lib error message text, so skip on coverage
      it("throws when getting info at non-existent index [ @skip-on-coverage ]", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert.unspecified(
          config.minterFilter
            .connect(config.accounts.deployer)
            .getProjectAndMinterInfoAt(0)
        );
      });
    });

    describe("project is configured", async function () {
      it("returns correct length when one project assigned minter", async function () {
        const config = await loadFixture(_beforeEach);
        // approve and assign minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .addApprovedMinter(config.minter.address);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(0, config.minter.address);
        // expect length to reflect configured project
        const numProjects = await config.minterFilter
          .connect(config.accounts.deployer)
          .getNumProjectsWithMinters();
        expect(numProjects).to.be.equal(1);
      });

      it("returns correct info for project at existing index", async function () {
        const config = await loadFixture(_beforeEach);
        // approve and assign minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .addApprovedMinter(config.minter.address);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(0, config.minter.address);
        // expect appropriate info when getting at index that exists
        const results = await config.minterFilter
          .connect(config.accounts.deployer)
          .getProjectAndMinterInfoAt(0);
        const expectedMinterType = await config.minter
          .connect(config.accounts.deployer)
          .minterType();
        expect(expectedMinterType).to.not.be.equal(undefined);
        expect(results.projectId).to.be.equal(0);
        expect(results.minterAddress).to.be.equal(config.minter.address);
        expect(results.minterType).to.be.equal(expectedMinterType);
      });
    });

    describe("project has minter", async function () {
      it("returns true when project has a minter", async function () {
        const config = await loadFixture(_beforeEach);
        // approve and assign minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .addApprovedMinter(config.minter.address);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(0, config.minter.address);
        // expect projectHasMinter to be true
        const _projectHasMinter = await config.minterFilter
          .connect(config.accounts.deployer)
          .projectHasMinter(0);
        expect(_projectHasMinter).to.be.true;
      });

      it("returns false when project does not have a minter", async function () {
        const config = await loadFixture(_beforeEach);
        // expect projectHasMinter to be false
        const _projectHasMinter = await config.minterFilter
          .connect(config.accounts.deployer)
          .projectHasMinter(0);
        expect(_projectHasMinter).to.be.false;
      });
    });
  });

  describe("mapping: numProjectsUsingMinter", async function () {
    beforeEach(async function () {
      const config = await loadFixture(_beforeEach);
      // Project 1 setup
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );
      // pass config to tests in this describe block
      this.config = config;
    });

    describe("keeps count while add/remove minter for project", async function () {
      it("initializes count to zero", async function () {
        // get config from beforeEach
        const config = this.config;
        // approve minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .addApprovedMinter(config.minter.address);
        // expect count to still be at initialized value of zero
        const result = await config.minterFilter
          .connect(config.accounts.deployer)
          .numProjectsUsingMinter(config.minter.address);
        expect(result).to.be.equal(0);
      });

      it("keeps count while add/single-remove one minter for project", async function () {
        // get config from beforeEach
        const config = this.config;
        // approve and assign minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .addApprovedMinter(config.minter.address);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(0, config.minter.address);
        // expect proper count
        let result = await config.minterFilter
          .connect(config.accounts.deployer)
          .numProjectsUsingMinter(config.minter.address);
        expect(result).to.be.equal(1);
        // remove minter from project
        await config.minterFilter
          .connect(config.accounts.deployer)
          .removeMinterForProject(0);
        // expect proper count
        result = await config.minterFilter
          .connect(config.accounts.deployer)
          .numProjectsUsingMinter(config.minter.address);
        expect(result).to.be.equal(0);
      });

      it("keeps count while add/bulk-remove one minter for project", async function () {
        // get config from beforeEach
        const config = this.config;
        // approve and assign minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .addApprovedMinter(config.minter.address);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(0, config.minter.address);
        // expect proper count
        let result = await config.minterFilter
          .connect(config.accounts.deployer)
          .numProjectsUsingMinter(config.minter.address);
        expect(result).to.be.equal(1);
        // remove minter from project
        await config.minterFilter
          .connect(config.accounts.deployer)
          .removeMintersForProjects([0]);
        // expect proper count
        result = await config.minterFilter
          .connect(config.accounts.deployer)
          .numProjectsUsingMinter(config.minter.address);
        expect(result).to.be.equal(0);
      });

      it("keeps count while add/single-remove multiple minters for projects", async function () {
        // get config from beforeEach
        const config = this.config;
        // approve and assign minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .addApprovedMinter(config.minter.address);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(0, config.minter.address);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(1, config.minter.address);
        // expect proper count
        let result = await config.minterFilter
          .connect(config.accounts.deployer)
          .numProjectsUsingMinter(config.minter.address);
        expect(result).to.be.equal(2);
        // remove minter from project 0
        await config.minterFilter
          .connect(config.accounts.deployer)
          .removeMinterForProject(0);
        // expect proper count
        result = await config.minterFilter
          .connect(config.accounts.deployer)
          .numProjectsUsingMinter(config.minter.address);
        expect(result).to.be.equal(1);
        // remove minter from project 1
        await config.minterFilter
          .connect(config.accounts.deployer)
          .removeMinterForProject(1);
        // expect proper count
        result = await config.minterFilter
          .connect(config.accounts.deployer)
          .numProjectsUsingMinter(config.minter.address);
        expect(result).to.be.equal(0);
      });

      it("keeps count while add/bulk-remove multiple minters for projects", async function () {
        // get config from beforeEach
        const config = this.config;
        // approve and assign minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .addApprovedMinter(config.minter.address);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(0, config.minter.address);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(1, config.minter.address);
        // expect proper count
        let result = await config.minterFilter
          .connect(config.accounts.deployer)
          .numProjectsUsingMinter(config.minter.address);
        expect(result).to.be.equal(2);
        // bulk-remove minter from project 0
        await config.minterFilter
          .connect(config.accounts.deployer)
          .removeMintersForProjects([0]);
        // expect proper count
        result = await config.minterFilter
          .connect(config.accounts.deployer)
          .numProjectsUsingMinter(config.minter.address);
        expect(result).to.be.equal(1);
        // re-add to project 0
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(0, config.minter.address);
        // expect proper count
        result = await config.minterFilter
          .connect(config.accounts.deployer)
          .numProjectsUsingMinter(config.minter.address);
        expect(result).to.be.equal(2);
        // bulk-remove minter from projects 0 & 1
        await config.minterFilter
          .connect(config.accounts.deployer)
          .removeMintersForProjects([0, 1]);
        // expect proper count
        result = await config.minterFilter
          .connect(config.accounts.deployer)
          .numProjectsUsingMinter(config.minter.address);
        expect(result).to.be.equal(0);
      });

      it("keeps count while setting same minter twice to single project", async function () {
        // get config from beforeEach
        const config = this.config;
        // approve and assign minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .addApprovedMinter(config.minter.address);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(0, config.minter.address);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(0, config.minter.address);
        // expect proper count
        let result = await config.minterFilter
          .connect(config.accounts.deployer)
          .numProjectsUsingMinter(config.minter.address);
        expect(result).to.be.equal(1);
      });

      it("keeps count while bulk-removing empty array", async function () {
        // get config from beforeEach
        const config = this.config;
        // approve and assign minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .addApprovedMinter(config.minter.address);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(0, config.minter.address);
        // bulk-remove minter from no projects
        await config.minterFilter
          .connect(config.accounts.deployer)
          .removeMintersForProjects([]);
        // expect proper count
        let result = await config.minterFilter
          .connect(config.accounts.deployer)
          .numProjectsUsingMinter(config.minter.address);
        expect(result).to.be.equal(1);
      });

      it("keeps count after invalid set minter for project opereration", async function () {
        // get config from beforeEach
        const config = this.config;
        // approve and assign minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .addApprovedMinter(config.minter.address);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(0, config.minter.address);
        // add minter for invalid project
        await expectRevert.unspecified(
          config.minterFilter
            .connect(config.accounts.deployer)
            .setMinterForProject(99, config.minter.address)
        );
        // expect proper count
        let result = await config.minterFilter
          .connect(config.accounts.deployer)
          .numProjectsUsingMinter(config.minter.address);
        expect(result).to.be.equal(1);
      });

      it("keeps count after invalid single-remove minter for project opereration", async function () {
        // get config from beforeEach
        const config = this.config;
        // approve and assign minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .addApprovedMinter(config.minter.address);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(0, config.minter.address);
        // remove minter from invalid project
        await expectRevert.unspecified(
          config.minterFilter
            .connect(config.accounts.deployer)
            .removeMinterForProject(99)
        );
        // expect proper count
        let result = await config.minterFilter
          .connect(config.accounts.deployer)
          .numProjectsUsingMinter(config.minter.address);
        expect(result).to.be.equal(1);
      });

      it("keeps count after invalid bulk-remove minter for project opereration", async function () {
        // get config from beforeEach
        const config = this.config;
        // approve and assign minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .addApprovedMinter(config.minter.address);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(0, config.minter.address);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(1, config.minter.address);
        // remove minter from invalid project
        await expectRevert(
          config.minterFilter
            .connect(config.accounts.deployer)
            .removeMintersForProjects([0, 0]),
          "EnumerableMap: nonexistent key"
        );
        // expect proper count
        let result = await config.minterFilter
          .connect(config.accounts.deployer)
          .numProjectsUsingMinter(config.minter.address);
        expect(result).to.be.equal(2);
      });
    });

    describe("keeps count and supports removeApprovedMinter logic", async function () {
      it("removes minter when no project using minter", async function () {
        // get config from beforeEach
        const config = this.config;
        // approve minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .addApprovedMinter(config.minter.address);
        // removes minter without reverting
        await config.minterFilter
          .connect(config.accounts.deployer)
          .removeApprovedMinter(config.minter.address);
        // approve and assign minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .addApprovedMinter(config.minter.address);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(0, config.minter.address);
        // remove minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .removeMinterForProject(0);
        // removes minter without reverting
        await config.minterFilter
          .connect(config.accounts.deployer)
          .removeApprovedMinter(config.minter.address);
      });

      it("doesn't remove minter when >0 projects using minter", async function () {
        // get config from beforeEach
        const config = this.config;
        // approve and assign minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .addApprovedMinter(config.minter.address);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(0, config.minter.address);
        // reverts when attempting to remove minter being used
        await expectRevert(
          config.minterFilter
            .connect(config.accounts.deployer)
            .removeApprovedMinter(config.minter.address),
          "Only unused minters"
        );
        // add another project to minter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(1, config.minter.address);
        // remove minter from one project
        await config.minterFilter
          .connect(config.accounts.deployer)
          .removeMintersForProjects([0]);
        // reverts when attempting to remove minter being used
        await expectRevert(
          config.minterFilter
            .connect(config.accounts.deployer)
            .removeApprovedMinter(config.minter.address),
          "Only unused minters"
        );
      });
    });
  });
};
