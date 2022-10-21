import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  mintProjectUntilRemaining,
  advanceEVMByTime,
} from "../../util/common";
import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  ether,
} from "@openzeppelin/test-helpers";

import { expect } from "chai";

import { AdminACLV0V1_Common } from "../AdminACLV0V1.common";

/**
 * Tests for functionality of AdminACLV1.
 */
describe("AdminACLV1", async function () {
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
      false,
      "AdminACLV1"
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
      "AdminACLV1",
      []
    );

    // add project zero
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("name", this.accounts.artist.address);
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectZero);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);

    // configure minter for project zero
    await this.minterFilter
      .connect(this.accounts.deployer)
      .addApprovedMinter(this.minter.address);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .setMinterForProject(this.projectZero, this.minter.address);
    await this.minter
      .connect(this.accounts.artist)
      .updatePricePerTokenInWei(this.projectZero, 0);
  });

  describe("common tests", async function () {
    await AdminACLV0V1_Common("AdminACLV1");
  });

  describe("addPaymentApprover", async function () {
    it("should revert if not called by admin", async function () {
      await expectRevert(
        this.adminACL
          .connect(this.accounts.user)
          .addPaymentApprover(this.accounts.user.address),
        "Only superAdmin"
      );
    });

    it("adds address when called by superAdmin", async function () {
      expect(
        await this.adminACL
          .connect(this.accounts.deployer)
          .addPaymentApprover(this.accounts.user.address)
      )
        .to.emit(this.adminACL, "PaymentApproverAdded")
        .withArgs(this.accounts.user.address);
      // expect address to be added to the set of approvers
      expect(await this.adminACL.getPaymentApproverAt(0)).to.equal(
        this.accounts.user.address
      );
    });

    it("does not allow adding address to set if already added", async function () {
      await this.adminACL
        .connect(this.accounts.deployer)
        .addPaymentApprover(this.accounts.user.address);
      await expectRevert(
        this.adminACL
          .connect(this.accounts.deployer)
          .addPaymentApprover(this.accounts.user.address),
        "AdminACLV1: Already registered"
      );
    });

    it("allows artist payment address approval by non-superAdmin after adding", async function () {
      await this.adminACL
        .connect(this.accounts.deployer)
        .addPaymentApprover(this.accounts.user.address);

      // artist propose updated splits
      let valuesToUpdateTo = [
        this.projectZero,
        this.accounts.artist2.address,
        this.accounts.additional.address,
        50,
        this.accounts.additional2.address,
        51,
      ];
      await this.genArt721Core
        .connect(this.accounts.artist)
        .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo);

      // expect added address to be allowed to call V3 core's approve function
      await this.genArt721Core
        .connect(this.accounts.user)
        .adminAcceptArtistAddressesAndSplits(...valuesToUpdateTo);
    });

    it("does not allow artist payment address approval by non-superAdmin before adding", async function () {
      // artist propose updated splits
      let valuesToUpdateTo = [
        this.projectZero,
        this.accounts.artist2.address,
        this.accounts.additional.address,
        50,
        this.accounts.additional2.address,
        51,
      ];
      await this.genArt721Core
        .connect(this.accounts.artist)
        .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo);

      // expect non-superAdmin address to not be allowed to call V3 core's approve function
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.user)
          .adminAcceptArtistAddressesAndSplits(...valuesToUpdateTo),
        "Only Admin ACL allowed, or artist if owner has renounced"
      );
    });
  });

  describe("removePaymentApprover", async function () {
    it("should revert if not called by admin", async function () {
      await expectRevert(
        this.adminACL
          .connect(this.accounts.user)
          .removePaymentApprover(this.accounts.user.address),
        "Only superAdmin"
      );
    });

    it("removes address when called by superAdmin", async function () {
      await this.adminACL
        .connect(this.accounts.deployer)
        .addPaymentApprover(this.accounts.user.address);
      expect(
        await this.adminACL
          .connect(this.accounts.deployer)
          .removePaymentApprover(this.accounts.user.address)
      )
        .to.emit(this.adminACL, "PaymentApproverRemoved")
        .withArgs(this.accounts.user.address);
      // expect address to not be in the set of approvers
      await expectRevert(
        this.adminACL.getPaymentApproverAt(0),
        "VM Exception while processing transaction: reverted with panic code 0x32 (Array accessed at an out-of-bounds or negative index)"
      );
    });

    it("does not allow removing address to set if not already in set", async function () {
      await expectRevert(
        this.adminACL
          .connect(this.accounts.deployer)
          .removePaymentApprover(this.accounts.user.address),
        "AdminACLV1: Not registered"
      );
    });

    it("does not allow artist payment address approval by non-superAdmin after adding and removing", async function () {
      await this.adminACL
        .connect(this.accounts.deployer)
        .addPaymentApprover(this.accounts.user.address);
      await this.adminACL
        .connect(this.accounts.deployer)
        .removePaymentApprover(this.accounts.user.address);

      // artist propose updated splits
      let valuesToUpdateTo = [
        this.projectZero,
        this.accounts.artist2.address,
        this.accounts.additional.address,
        50,
        this.accounts.additional2.address,
        51,
      ];
      await this.genArt721Core
        .connect(this.accounts.artist)
        .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo);

      // expect non-superAdmin address to not be allowed to call V3 core's approve function
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.user)
          .adminAcceptArtistAddressesAndSplits(...valuesToUpdateTo),
        "Only Admin ACL allowed, or artist if owner has renounced"
      );
    });
  });

  describe("allowed", async function () {
    it("should return false when calling with non-superAdmin address and not GenArt721CoreV3.adminAcceptArtistAddressesAndSplits", async function () {
      // expect non-superAdmin address to not be allowed to call V3 core's approve function
      await expectRevert(
        this.genArt721Core
          .connect(this.accounts.user)
          .updateArtblocksPrimarySalesAddress(this.accounts.additional.address),
        "Only Admin ACL allowed"
      );
    });
  });

  describe("getNumPaymentApprovers", async function () {
    it("should return correct number of approvers", async function () {
      expect(await this.adminACL.getNumPaymentApprovers()).to.equal(0);
      await this.adminACL
        .connect(this.accounts.deployer)
        .addPaymentApprover(this.accounts.user.address);
      expect(await this.adminACL.getNumPaymentApprovers()).to.equal(1);
      await this.adminACL
        .connect(this.accounts.deployer)
        .addPaymentApprover(this.accounts.user2.address);
      expect(await this.adminACL.getNumPaymentApprovers()).to.equal(2);
      await this.adminACL
        .connect(this.accounts.deployer)
        .removePaymentApprover(this.accounts.user.address);
      expect(await this.adminACL.getNumPaymentApprovers()).to.equal(1);
    });
  });
});
