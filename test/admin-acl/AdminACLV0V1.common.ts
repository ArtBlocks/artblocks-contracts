import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  ether,
} from "@openzeppelin/test-helpers";
import { expect } from "chai";

/**
 * These tests are intended to check common AdminACL V0/V1 functionality.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const AdminACLV0V1_Common = async (adminACLContractName: string) => {
  describe("transferOwnershipOn", function () {
    it("does not allow transfer to new AdminACL that doesn't broadcast support of IAdminACLV0", async function () {
      await expectRevert(
        this.adminACL.transferOwnershipOn(
          this.genArt721Core.address,
          this.adminACL_NoInterfaceBroadcast.address
        ),
        `${adminACLContractName}: new admin ACL does not support IAdminACLV0`
      );
    });

    it("allows transfer to new AdminACL that broadcasts support of IAdminACLV0", async function () {
      await this.adminACL.transferOwnershipOn(
        this.genArt721Core.address,
        this.adminACL_InterfaceBroadcast.address
      );
    });

    it("is not callable by non-superAdmin", async function () {
      await expectRevert(
        this.adminACL
          .connect(this.accounts.user)
          .transferOwnershipOn(
            this.genArt721Core.address,
            this.adminACL_InterfaceBroadcast.address
          ),
        "Only superAdmin"
      );
    });
  });

  describe("changeSuperAdmin", function () {
    it("emits an event", async function () {
      await expect(
        this.adminACL.changeSuperAdmin(this.accounts.deployer2.address, [
          this.genArt721Core.address,
        ])
      )
        .to.emit(this.adminACL, "SuperAdminTransferred")
        .withArgs(
          this.accounts.deployer.address,
          this.accounts.deployer2.address,
          [this.genArt721Core.address]
        );
    });

    it("updates superAdmin", async function () {
      await this.adminACL.changeSuperAdmin(this.accounts.deployer2.address, [
        this.genArt721Core.address,
      ]);
      expect(await this.adminACL.superAdmin()).to.equal(
        this.accounts.deployer2.address
      );
    });

    it("is not callable by non-superAdmin", async function () {
      await expectRevert(
        this.adminACL
          .connect(this.accounts.user)
          .changeSuperAdmin(this.accounts.deployer2.address, [
            this.genArt721Core.address,
          ]),
        "Only superAdmin"
      );
    });
  });

  describe("renounceOwnershipOn", function () {
    it("is not callable by non-superAdmin", async function () {
      await expectRevert(
        this.adminACL
          .connect(this.accounts.user)
          .renounceOwnershipOn(this.genArt721Core.address),
        "Only superAdmin"
      );
    });

    it("is callable by superAdmin", async function () {
      await this.adminACL
        .connect(this.accounts.deployer)
        .renounceOwnershipOn(this.genArt721Core.address);
    });
  });
};
