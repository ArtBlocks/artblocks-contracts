import { expect } from "chai";
import { safeAddProject } from "../../util/common";

/**
 * These tests are intended to check common Event behaviors of
 * MinterFilter contracts.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const MinterFilterEvents_Common = async () => {
  describe("addApprovedMinter", async function () {
    it("emits an event for MinterSetPriceERC20V0", async function () {
      const minterType = "MinterSetPriceERC20V0";
      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minter.address)
      )
        .to.emit(this.minterFilter, "MinterApproved")
        .withArgs(this.minter.address, minterType);
    });

    it("emits an event for MinterSetPriceV0", async function () {
      const minterType = "MinterSetPriceV0";
      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minterETH.address)
      )
        .to.emit(this.minterFilter, "MinterApproved")
        .withArgs(this.minterETH.address, minterType);
    });

    it("emits an event for MinterDALinV0", async function () {
      const minterType = "MinterDALinV0";
      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .addApprovedMinter(this.minterETHAuction.address)
      )
        .to.emit(this.minterFilter, "MinterApproved")
        .withArgs(this.minterETHAuction.address, minterType);
    });
  });

  describe("removeApprovedMinter", async function () {
    it("emits an event", async function () {
      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .removeApprovedMinter(this.minter.address)
      )
        .to.emit(this.minterFilter, "MinterRevoked")
        .withArgs(this.minter.address);
    });
  });

  describe("removeMinterForProject", async function () {
    it("emits an event", async function () {
      // assign a minter
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectZero, this.minter.address);
      // verify event when removing minter for project
      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .removeMinterForProject(this.projectZero)
      )
        .to.emit(this.minterFilter, "ProjectMinterRemoved")
        .withArgs(this.projectZero);
    });
  });

  describe("setMinterForProject", async function () {
    const minterType = "MinterSetPriceERC20V0";
    it("emits an event", async function () {
      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(this.projectZero, this.minter.address)
      )
        .to.emit(this.minterFilter, "ProjectMinterRegistered")
        .withArgs(this.projectZero, this.minter.address, minterType);
      // add project 1
      await safeAddProject(
        this.genArt721Core,
        this.accounts.deployer,
        this.accounts.deployer.address
      );
      // set minter for project 1
      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(this.projectOne, this.minter.address)
      )
        .to.emit(this.minterFilter, "ProjectMinterRegistered")
        .withArgs(this.projectOne, this.minter.address, minterType);
    });
  });

  describe("alertAsCanonicalMinterFilter", async function () {
    it("emits event alerting as canonical minter", async function () {
      // allowlist MinterFilter on core
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .addMintWhitelisted(this.minterFilter.address);
      // expect proper event
      await expect(
        this.minterFilter
          .connect(this.accounts.deployer)
          .alertAsCanonicalMinterFilter()
      )
        .to.emit(this.minterFilter, "IsCanonicalMinterFilter")
        .withArgs(this.genArt721Core.address);
    });
  });
};
