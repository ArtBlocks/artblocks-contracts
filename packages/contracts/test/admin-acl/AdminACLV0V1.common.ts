import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  ether,
} from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { T_Config } from "../util/common";
/**
 * These tests are intended to check common AdminACL V0/V1 functionality.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const AdminACLV0V1_Common = async (
  _beforeEach: () => Promise<T_Config>,
  adminACLContractName: string
) => {
  describe("transferOwnershipOn", function () {
    it("does not allow transfer to new AdminACL that doesn't broadcast support of IAdminACLV0", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.adminACL.transferOwnershipOn(
          config.genArt721Core.address,
          config.adminACL_NoInterfaceBroadcast.address
        ),
        `${adminACLContractName}: new admin ACL does not support IAdminACLV0`
      );
    });

    it("allows transfer to new AdminACL that broadcasts support of IAdminACLV0", async function () {
      const config = await loadFixture(_beforeEach);
      await config.adminACL.transferOwnershipOn(
        config.genArt721Core.address,
        config.adminACL_InterfaceBroadcast.address
      );
    });

    it("is not callable by non-superAdmin", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.adminACL
          .connect(config.accounts.user)
          .transferOwnershipOn(
            config.genArt721Core.address,
            config.adminACL_InterfaceBroadcast.address
          ),
        "Only superAdmin"
      );
    });
  });

  describe("changeSuperAdmin", function () {
    it("emits an event", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        config.adminACL.changeSuperAdmin(config.accounts.deployer2.address, [
          config.genArt721Core.address,
        ])
      )
        .to.emit(config.adminACL, "SuperAdminTransferred")
        .withArgs(
          config.accounts.deployer.address,
          config.accounts.deployer2.address,
          [config.genArt721Core.address]
        );
    });

    it("updates superAdmin", async function () {
      const config = await loadFixture(_beforeEach);
      await config.adminACL.changeSuperAdmin(
        config.accounts.deployer2.address,
        [config.genArt721Core.address]
      );
      expect(await config.adminACL.superAdmin()).to.equal(
        config.accounts.deployer2.address
      );
    });

    it("is not callable by non-superAdmin", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.adminACL
          .connect(config.accounts.user)
          .changeSuperAdmin(config.accounts.deployer2.address, [
            config.genArt721Core.address,
          ]),
        "Only superAdmin"
      );
    });
  });

  describe("renounceOwnershipOn", function () {
    it("is not callable by non-superAdmin", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.adminACL
          .connect(config.accounts.user)
          .renounceOwnershipOn(config.genArt721Core.address),
        "Only superAdmin"
      );
    });

    it("is callable by superAdmin", async function () {
      const config = await loadFixture(_beforeEach);
      await config.adminACL
        .connect(config.accounts.deployer)
        .renounceOwnershipOn(config.genArt721Core.address);
    });
  });
};
