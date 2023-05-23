import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { safeAddProject, T_Config } from "../../../util/common";

/**
 * These tests are intended to check common Event behaviors of
 * MinterFilter contracts.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const MinterFilterEvents_Common = async (
  _beforeEach: () => Promise<T_Config>
) => {
  describe("addApprovedMinter", async function () {
    it("emits an event for minter set price ERC20", async function () {
      const config = await loadFixture(_beforeEach);
      const minterType = await config.minter.minterType();
      await expect(
        config.minterFilter
          .connect(config.accounts.deployer)
          .addApprovedMinter(config.minter.address)
      )
        .to.emit(config.minterFilter, "MinterApproved")
        .withArgs(config.minter.address, minterType);
    });

    it("emits an event for minter set price ETH", async function () {
      const config = await loadFixture(_beforeEach);
      const minterType = await config.minterETH.minterType();
      await expect(
        config.minterFilter
          .connect(config.accounts.deployer)
          .addApprovedMinter(config.minterETH.address)
      )
        .to.emit(config.minterFilter, "MinterApproved")
        .withArgs(config.minterETH.address, minterType);
    });

    it("emits an event for MinterDALinV*", async function () {
      const config = await loadFixture(_beforeEach);
      const minterType = await config.minterETHAuction.minterType();
      await expect(
        config.minterFilter
          .connect(config.accounts.deployer)
          .addApprovedMinter(config.minterETHAuction.address)
      )
        .to.emit(config.minterFilter, "MinterApproved")
        .withArgs(config.minterETHAuction.address, minterType);
    });
  });

  describe("removeApprovedMinter", async function () {
    it("emits an event", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        config.minterFilter
          .connect(config.accounts.deployer)
          .removeApprovedMinter(config.minter.address)
      )
        .to.emit(config.minterFilter, "MinterRevoked")
        .withArgs(config.minter.address);
    });
  });

  describe("removeMinterForProject", async function () {
    it("emits an event", async function () {
      const config = await loadFixture(_beforeEach);
      // assign a minter
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);
      // verify event when removing minter for project
      await expect(
        config.minterFilter
          .connect(config.accounts.deployer)
          .removeMinterForProject(config.projectZero)
      )
        .to.emit(config.minterFilter, "ProjectMinterRemoved")
        .withArgs(config.projectZero);
    });
  });

  describe("setMinterForProject", async function () {
    it("emits an event", async function () {
      const config = await loadFixture(_beforeEach);
      const minterType = await config.minter.minterType();
      await expect(
        config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(config.projectZero, config.minter.address)
      )
        .to.emit(config.minterFilter, "ProjectMinterRegistered")
        .withArgs(config.projectZero, config.minter.address, minterType);
      // add project 1
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.deployer.address
      );
      // set minter for project 1
      await expect(
        config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(config.projectOne, config.minter.address)
      )
        .to.emit(config.minterFilter, "ProjectMinterRegistered")
        .withArgs(config.projectOne, config.minter.address, minterType);
    });
  });

  describe("alertAsCanonicalMinterFilter", async function () {
    it("emits event alerting as canonical minter", async function () {
      const config = await loadFixture(_beforeEach);
      try {
        // allowlist MinterFilter on core
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .addMintWhitelisted(config.minterFilter.address);
        // expect proper event
        await expect(
          config.minterFilter
            .connect(config.accounts.deployer)
            .alertAsCanonicalMinterFilter()
        )
          .to.emit(config.minterFilter, "IsCanonicalMinterFilter")
          .withArgs(config.genArt721Core.address);
      } catch (err) {
        if ((await config.genArt721Core.coreType()) === "GenArt721CoreV3") {
          console.log(
            "GenArt721CoreV3 does not need alert as canonical minter filter"
          );
        } else {
          throw err;
        }
      }
    });
  });
};
