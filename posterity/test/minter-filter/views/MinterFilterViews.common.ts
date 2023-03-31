import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";

/**
 * These tests are intended to check common view behaviors of
 * MinterFilter contracts.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const MinterFilterViews_Common = async () => {
  describe("projectHasMinter", async function () {
    it("returns false when project does not have minter", async function () {
      let result = await this.minterFilter
        .connect(this.accounts.deployer)
        .projectHasMinter(this.projectZero);
      expect(result).to.be.equal(false);
    });

    it("returns true when project has minter", async function () {
      // approve minter and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectZero, this.minter.address);
      // expect project zero to have minter
      let result = await this.minterFilter
        .connect(this.accounts.deployer)
        .projectHasMinter(this.projectZero);
      expect(result).to.be.equal(true);
    });
  });

  describe("getMinterForProject", async function () {
    const noMinterAssignedErrorMessage = "No minter assigned";

    it("reverts when project does not have minter", async function () {
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.deployer)
          .getMinterForProject(this.projectZero),
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
        .setMinterForProject(this.projectZero, this.minter.address);
      // expect appropriate result
      const result = await this.minterFilter
        .connect(this.accounts.deployer)
        .getMinterForProject(this.projectZero);
      expect(result).to.be.equal(this.minter.address);
    });

    it("reverts when project has minter previously removed", async function () {
      // approve minter and assign minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectZero, this.minter.address);
      // remove minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .removeMintersForProjects([this.projectZero]);
      // expect appropriate result
      await expectRevert(
        this.minterFilter
          .connect(this.accounts.deployer)
          .getMinterForProject(this.projectZero),
        noMinterAssignedErrorMessage
      );
    });
  });
};
