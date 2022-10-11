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
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  mintProjectUntilRemaining,
  advanceEVMByTime,
} from "../../util/common";
import { FOUR_WEEKS } from "../../util/constants";

/**
 * Tests for functionality of AdminACLV0.
 */
describe("AdminACLV0", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this);

    // deploy and configure minter filter and minter
    ({
      genArt721Core: this.genArt721Core,
      minterFilter: this.minterFilter,
      randomizer: this.randomizer,
      adminACL: this.adminACL,
    } = await deployCoreWithMinterFilter.call(
      this,
      "GenArt721CoreV3",
      "MinterFilterV1"
    ));

    this.minter = await deployAndGet.call(this, "MinterSetPriceV2", [
      this.genArt721Core.address,
      this.minterFilter.address,
    ]);

    // deploy alternate admin ACL that does not broadcast support of IAdminACLV0
    this.adminACL_NoInterfaceBroadcast = await deployAndGet.call(
      this,
      "MockAdminACLV0Events",
      []
    );

    // deploy another admin ACL that does broadcast support of IAdminACLV0
    this.adminACL_InterfaceBroadcast = await deployAndGet.call(
      this,
      "AdminACLV0",
      []
    );
  });

  describe("transferOwnershipOn", function () {
    it("does not allow transfer to new AdminACL that doesn't broadcast support of IAdminACLV0", async function () {
      await expectRevert(
        this.adminACL.transferOwnershipOn(
          this.genArt721Core.address,
          this.adminACL_NoInterfaceBroadcast.address
        ),
        "AdminACLV0: new admin ACL does not support IAdminACLV0"
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
  });
});
