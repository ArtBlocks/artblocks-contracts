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
      "MinterFilterV1",
      true
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
    it("allows transfer to new AdminACL when called by superAdmin", async function () {
      await this.adminACL.transferOwnershipOn(
        this.genArt721Core.address,
        this.adminACL_InterfaceBroadcast.address
      );
      // ensure admin was changed
      const coreAdmin = await this.genArt721Core.owner();
      expect(coreAdmin).to.equal(this.adminACL_InterfaceBroadcast.address);
    });

    it("not callable by non-superAdmin", async function () {
      await expectRevert(
        this.adminACL
          .connect(this.accounts.user)
          .transferOwnershipOn(
            this.genArt721Core.address,
            this.adminACL_InterfaceBroadcast.address
          ),
        "Only superAdmin"
      );
      // ensure admin was not changed
      const coreAdmin = await this.genArt721Core.owner();
      expect(coreAdmin).to.equal(this.adminACL.address);
    });
  });

  describe("renounceOwnershipOn", function () {
    it("allows transfer to new AdminACL when called by superAdmin", async function () {
      await this.adminACL.renounceOwnershipOn(this.genArt721Core.address);
      // ensure admin was changed
      const coreAdmin = await this.genArt721Core.owner();
      expect(coreAdmin).to.equal(constants.ZERO_ADDRESS);
    });

    it("not callable by non-superAdmin", async function () {
      await expectRevert(
        this.adminACL
          .connect(this.accounts.user)
          .renounceOwnershipOn(this.genArt721Core.address),
        "Only superAdmin"
      );
      // ensure admin was not changed
      const coreAdmin = await this.genArt721Core.owner();
      expect(coreAdmin).to.equal(this.adminACL.address);
    });
  });
});
