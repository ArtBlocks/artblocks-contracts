import {
  T_Config,
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
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { expect } from "chai";

import { AdminACLV0V1_Common } from "../AdminACLV0V1.common";

/**
 * Tests for functionality of AdminACLV1.
 */
describe("AdminACLV1", async function () {
  async function _beforeEach() {
    let config: T_Config = {
      accounts: await getAccounts(),
    };
    config = await assignDefaultConstants(config);

    // deploy and configure minter filter and minter
    ({
      genArt721Core: config.genArt721Core,
      minterFilter: config.minterFilter,
      randomizer: config.randomizer,
      adminACL: config.adminACL,
    } = await deployCoreWithMinterFilter(
      config,
      "GenArt721CoreV3",
      "MinterFilterV1",
      false,
      "AdminACLV1"
    ));

    config.minter = await deployAndGet(config, "MinterSetPriceV2", [
      config.genArt721Core.address,
      config.minterFilter.address,
    ]);

    // deploy alternate admin ACL that does not broadcast support of IAdminACLV0
    config.adminACL_NoInterfaceBroadcast = await deployAndGet(
      config,
      "MockAdminACLV0Events",
      []
    );

    // deploy another admin ACL that does broadcast support of IAdminACLV0
    config.adminACL_InterfaceBroadcast = await deployAndGet(
      config,
      "AdminACLV1",
      []
    );

    // add project zero
    await config.genArt721Core
      .connect(config.accounts.deployer)
      .addProject("name", config.accounts.artist.address);
    await config.genArt721Core
      .connect(config.accounts.deployer)
      .toggleProjectIsActive(config.projectZero);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);

    // configure minter for project zero
    await config.minterFilter
      .connect(config.accounts.deployer)
      .addApprovedMinter(config.minter.address);
    await config.minterFilter
      .connect(config.accounts.deployer)
      .setMinterForProject(config.projectZero, config.minter.address);
    await config.minter
      .connect(config.accounts.artist)
      .updatePricePerTokenInWei(config.projectZero, 0);
    return config;
  }

  describe("common tests", async function () {
    await AdminACLV0V1_Common(_beforeEach, "AdminACLV1");
  });

  describe("addPaymentApprover", async function () {
    it("should revert if not called by admin", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.adminACL
          .connect(config.accounts.user)
          .addPaymentApprover(config.accounts.user.address),
        "Only superAdmin"
      );
    });

    it("adds address when called by superAdmin", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        await config.adminACL
          .connect(config.accounts.deployer)
          .addPaymentApprover(config.accounts.user.address)
      )
        .to.emit(config.adminACL, "PaymentApproverAdded")
        .withArgs(config.accounts.user.address);
      // expect address to be added to the set of approvers
      expect(await config.adminACL.getPaymentApproverAt(0)).to.equal(
        config.accounts.user.address
      );
    });

    it("does not allow adding address to set if already added", async function () {
      const config = await loadFixture(_beforeEach);
      await config.adminACL
        .connect(config.accounts.deployer)
        .addPaymentApprover(config.accounts.user.address);
      await expectRevert(
        config.adminACL
          .connect(config.accounts.deployer)
          .addPaymentApprover(config.accounts.user.address),
        "AdminACLV1: Already registered"
      );
    });

    it("allows artist payment address approval by non-superAdmin after adding", async function () {
      const config = await loadFixture(_beforeEach);
      await config.adminACL
        .connect(config.accounts.deployer)
        .addPaymentApprover(config.accounts.user.address);

      // artist propose updated splits
      let valuesToUpdateTo = [
        config.projectZero,
        config.accounts.artist2.address,
        config.accounts.additional.address,
        50,
        config.accounts.additional2.address,
        51,
      ];
      await config.genArt721Core
        .connect(config.accounts.artist)
        .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo);

      // expect added address to be allowed to call V3 core's approve function
      await config.genArt721Core
        .connect(config.accounts.user)
        .adminAcceptArtistAddressesAndSplits(...valuesToUpdateTo);
    });

    it("does not allow artist payment address approval by non-superAdmin before adding", async function () {
      const config = await loadFixture(_beforeEach);
      // artist propose updated splits
      let valuesToUpdateTo = [
        config.projectZero,
        config.accounts.artist2.address,
        config.accounts.additional.address,
        50,
        config.accounts.additional2.address,
        51,
      ];
      await config.genArt721Core
        .connect(config.accounts.artist)
        .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo);

      // expect non-superAdmin address to not be allowed to call V3 core's approve function
      await expectRevert(
        config.genArt721Core
          .connect(config.accounts.user)
          .adminAcceptArtistAddressesAndSplits(...valuesToUpdateTo),
        "Only Admin ACL allowed, or artist if owner has renounced"
      );
    });
  });

  describe("removePaymentApprover", async function () {
    it("should revert if not called by admin", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.adminACL
          .connect(config.accounts.user)
          .removePaymentApprover(config.accounts.user.address),
        "Only superAdmin"
      );
    });

    it("removes address when called by superAdmin", async function () {
      const config = await loadFixture(_beforeEach);
      await config.adminACL
        .connect(config.accounts.deployer)
        .addPaymentApprover(config.accounts.user.address);
      await expect(
        await config.adminACL
          .connect(config.accounts.deployer)
          .removePaymentApprover(config.accounts.user.address)
      )
        .to.emit(config.adminACL, "PaymentApproverRemoved")
        .withArgs(config.accounts.user.address);
      // expect address to not be in the set of approvers
      await expectRevert.unspecified(config.adminACL.getPaymentApproverAt(0));
    });

    it("does not allow removing address to set if not already in set", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.adminACL
          .connect(config.accounts.deployer)
          .removePaymentApprover(config.accounts.user.address),
        "AdminACLV1: Not registered"
      );
    });

    it("does not allow artist payment address approval by non-superAdmin after adding and removing", async function () {
      const config = await loadFixture(_beforeEach);
      await config.adminACL
        .connect(config.accounts.deployer)
        .addPaymentApprover(config.accounts.user.address);
      await config.adminACL
        .connect(config.accounts.deployer)
        .removePaymentApprover(config.accounts.user.address);

      // artist propose updated splits
      let valuesToUpdateTo = [
        config.projectZero,
        config.accounts.artist2.address,
        config.accounts.additional.address,
        50,
        config.accounts.additional2.address,
        51,
      ];
      await config.genArt721Core
        .connect(config.accounts.artist)
        .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo);

      // expect non-superAdmin address to not be allowed to call V3 core's approve function
      await expectRevert(
        config.genArt721Core
          .connect(config.accounts.user)
          .adminAcceptArtistAddressesAndSplits(...valuesToUpdateTo),
        "Only Admin ACL allowed, or artist if owner has renounced"
      );
    });
  });

  describe("allowed", async function () {
    it("should return false when calling with non-superAdmin address and not GenArt721CoreV3.adminAcceptArtistAddressesAndSplits", async function () {
      const config = await loadFixture(_beforeEach);
      // expect non-superAdmin address to not be allowed to call V3 core's approve function
      await expectRevert(
        config.genArt721Core
          .connect(config.accounts.user)
          .updateArtblocksPrimarySalesAddress(
            config.accounts.additional.address
          ),
        "Only Admin ACL allowed"
      );
    });
  });

  describe("getNumPaymentApprovers", async function () {
    it("should return correct number of approvers", async function () {
      const config = await loadFixture(_beforeEach);
      expect(await config.adminACL.getNumPaymentApprovers()).to.equal(0);
      await config.adminACL
        .connect(config.accounts.deployer)
        .addPaymentApprover(config.accounts.user.address);
      expect(await config.adminACL.getNumPaymentApprovers()).to.equal(1);
      await config.adminACL
        .connect(config.accounts.deployer)
        .addPaymentApprover(config.accounts.user2.address);
      expect(await config.adminACL.getNumPaymentApprovers()).to.equal(2);
      await config.adminACL
        .connect(config.accounts.deployer)
        .removePaymentApprover(config.accounts.user.address);
      expect(await config.adminACL.getNumPaymentApprovers()).to.equal(1);
    });
  });
});
