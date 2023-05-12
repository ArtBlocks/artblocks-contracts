import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { T_Config } from "../../util/common";

/**
 * These tests are intended to check common view behaviors of
 * MinterFilter contracts.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const MinterFilterViews_Common = async (
  _beforeEach: () => Promise<T_Config>
) => {
  describe("projectHasMinter", async function () {
    it("returns false when project does not have minter", async function () {
      const config = await loadFixture(_beforeEach);
      let result = await config.minterFilter
        .connect(config.accounts.deployer)
        .projectHasMinter(config.projectZero);
      expect(result).to.be.equal(false);
    });

    it("returns true when project has minter", async function () {
      const config = await loadFixture(_beforeEach);
      // approve minter and assign minter
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);
      // expect project zero to have minter
      let result = await config.minterFilter
        .connect(config.accounts.deployer)
        .projectHasMinter(config.projectZero);
      expect(result).to.be.equal(true);
    });
  });

  describe("getMinterForProject", async function () {
    const noMinterAssignedErrorMessage = "No minter assigned";

    it("reverts when project does not have minter", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minterFilter
          .connect(config.accounts.deployer)
          .getMinterForProject(config.projectZero),
        noMinterAssignedErrorMessage
      );
    });

    it("returns correct minter when project has minter", async function () {
      const config = await loadFixture(_beforeEach);
      // approve minter and assign minter
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);
      // expect appropriate result
      const result = await config.minterFilter
        .connect(config.accounts.deployer)
        .getMinterForProject(config.projectZero);
      expect(result).to.be.equal(config.minter.address);
    });

    it("reverts when project has minter previously removed", async function () {
      const config = await loadFixture(_beforeEach);
      // approve minter and assign minter
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);
      // remove minter
      await config.minterFilter
        .connect(config.accounts.deployer)
        .removeMintersForProjects([config.projectZero]);
      // expect appropriate result
      await expectRevert(
        config.minterFilter
          .connect(config.accounts.deployer)
          .getMinterForProject(config.projectZero),
        noMinterAssignedErrorMessage
      );
    });
  });
};
