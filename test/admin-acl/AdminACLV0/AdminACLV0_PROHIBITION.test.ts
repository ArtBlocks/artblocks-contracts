import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  mintProjectUntilRemaining,
  advanceEVMByTime,
} from "../../util/common";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { AdminACLV0V1_Common } from "../AdminACLV0V1.common";

/**
 * Tests for functionality of AdminACLV0.
 */
describe(`AdminACLV0_PROHIBITION`, async function () {
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
      "GenArt721CoreV3_Engine_Flex_PROHIBITION",
      "MinterFilterV1"
    ));

    config.minter = await deployAndGet(config, "MinterSetPriceV2", [
      config.genArt721Core.address,
      config.minterFilter.address,
    ]);

    // deploy alternate admin ACL that does not broadcast support of IAdminACLV0
    config.adminACL_NoInterfaceBroadcast = await deployAndGet(
      config,
      "MockAdminACLV0Events_PROHIBITION",
      []
    );

    // deploy another admin ACL that does broadcast support of IAdminACLV0
    config.adminACL_InterfaceBroadcast = await deployAndGet(
      config,
      "AdminACLV0_PROHIBITION",
      []
    );
    return config;
  }

  describe(`common tests`, async function () {
    await AdminACLV0V1_Common(_beforeEach, "AdminACLV0");
  });

  describe(`toggleContractSelectorApproval`, async function () {
    it(`should allow toggling contract selector approval`, async function () {
      const config = await loadFixture(_beforeEach);

      const selector = config.adminACL.interface.getSighash(
        "toggleContractSelectorApproval"
      );

      // toggle approval for contract selector
      await config.adminACL
        .connect(config.accounts.deployer)
        .toggleContractSelectorApproval(
          config.adminACL.address,
          selector,
          config.accounts.user.address
        );

      // check approval
      const isApproved = await config.adminACL.getContractSelectorApproval(
        config.adminACL.address,
        selector,
        config.accounts.user.address
      );
      expect(isApproved).to.equal(true);

      // toggle approval for contract selector
      await config.adminACL
        .connect(config.accounts.user)
        .toggleContractSelectorApproval(
          config.adminACL.address,
          selector,
          config.accounts.user2.address
        );
    });

    it(`should reject toggling contract selector when unapproved`, async function () {
      const config = await loadFixture(_beforeEach);

      const selector = config.adminACL.interface.getSighash(
        "toggleContractSelectorApproval"
      );

      // check approval
      const isApproved = await config.adminACL.getContractSelectorApproval(
        config.adminACL.address,
        selector,
        config.accounts.user2.address
      );

      expect(isApproved).to.equal(false);

      await expect(
        config.adminACL
          .connect(config.accounts.user2)
          .toggleContractSelectorApproval(
            config.adminACL.address,
            selector,
            config.accounts.user2.address
          )
      ).to.revertedWith("Only allowed caller");
    });
  });

  describe(`toggleContractSelectorApproval`, async function () {
    it(`behaves as expected when approving an artist`, async function () {
      const config = await loadFixture(_beforeEach);

      // toggle approval for contract selector
      await expect(
        config.adminACL
          .connect(config.accounts.deployer)
          .toggleContractArtistApproval(
            config.genArt721Core.address,
            config.accounts.artist.address
          )
      )
        .to.emit(config.adminACL, "ContractArtistApprovalUpdated")
        .withArgs(
          config.genArt721Core.address,
          config.accounts.artist.address,
          true
        );

      expect(
        await config.adminACL.getContractArtistApproval(
          config.genArt721Core.address,
          config.accounts.artist.address
        )
      ).to.equal(true);

      expect(
        await config.adminACL.getContractArtistApproval(
          config.genArt721Core.address,
          config.accounts.user.address
        )
      ).to.equal(false);
    });

    it(`rejects unauthorized users from toggling approvals`, async function () {
      const config = await loadFixture(_beforeEach);

      // toggle approval for contract selector
      await expect(
        config.adminACL
          .connect(config.accounts.artist)
          .toggleContractArtistApproval(
            config.genArt721Core.address,
            config.accounts.artist.address
          )
      ).to.revertedWith("Only allowed caller");
    });
  });
});
