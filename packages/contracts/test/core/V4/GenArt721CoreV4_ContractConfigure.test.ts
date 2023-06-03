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
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  mintProjectUntilRemaining,
  advanceEVMByTime,
} from "../../util/common";
import { FOUR_WEEKS } from "../../util/constants";

// test the following V4 core contract derivatives:
const coreContractsToTest = ["GenArt721CoreV4"];

/**
 * Tests for V4 core dealing with configuring the core contract.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`${coreContractName} Contract Configure`, async function () {
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
        artistContract: config.artistContract,
      } = await deployCoreWithMinterFilter(
        config,
        coreContractName,
        "MinterFilterV1"
      ));

      // Register GenArtCore contract on artist contract
      await config.artistContract
        .connect(config.accounts.deployer)
        ["registerExtension(address,string)"](config.genArt721Core.address, "");

      config.minter = await deployAndGet(config, "MinterSetPriceV2", [
        config.genArt721Core.address,
        config.minterFilter.address,
      ]);

      // add project zero
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .addProject(
          "name",
          config.accounts.artist.address,
          config.artistContract.address
        );
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);

      // add project one without setting it to active or setting max invocations
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .addProject(
          "name",
          config.accounts.artist2.address,
          config.artistContract.address
        );

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

    describe("update{Artblocks,Provider}PrimarySalesPercentage", function () {
      beforeEach(async function () {
        const config = await loadFixture(_beforeEach);
        if (coreContractName === "GenArt721CoreV4") {
          config.maxABPrimarySalesPercentage = 25; // 25% maximum percentage on V4 core
        } else {
          throw new Error("Invalid core contract name");
        }
        // pass config to tests in this describe block
        this.config = config;
      });

      it("does not allow a value > ART_BLOCKS_MAX_PRIMARY_SALES_PERCENTAGE", async function () {
        // get config from beforeEach
        const config = this.config;
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateArtblocksPrimarySalesPercentage(
              config.maxABPrimarySalesPercentage + 1
            ),
          "Max of ART_BLOCKS_MAX_PRIMARY_SALES_PERCENTAGE percent"
        );
      });

      it("does allow a value of ART_BLOCKS_MAX_PRIMARY_SALES_PERCENTAGE", async function () {
        // get config from beforeEach
        const config = this.config;
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksPrimarySalesPercentage(
            config.maxABPrimarySalesPercentage
          );
      });

      it("does allow a value of 0%", async function () {
        // get config from beforeEach
        const config = this.config;
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksPrimarySalesPercentage(0);
      });
    });

    describe("update{Artblocks,Provider}SecondarySalesBPS", function () {
      if (coreContractName.includes("GenArt721CoreV4_Engine")) {
        it("does not allow a value > 100%", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevert(
            config.genArt721Core
              .connect(config.accounts.deployer)
              .updateProviderSecondarySalesBPS(
                10001, // _renderProviderSecondarySalesBPS
                0 // _platformProviderSecondarySalesBPS
              ),
            "Over max sum of BPS"
          );
          await expectRevert(
            config.genArt721Core
              .connect(config.accounts.deployer)
              .updateProviderSecondarySalesBPS(
                0, // _renderProviderSecondarySalesBPS
                10001 // _platformProviderSecondarySalesBPS
              ),
            "Over max sum of BPS"
          );
        });

        it("does allow a value of 2.5%", async function () {
          const config = await loadFixture(_beforeEach);
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProviderSecondarySalesBPS(
              250, // _renderProviderSecondarySalesBPS
              0 // _platformProviderSecondarySalesBPS
            );
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProviderSecondarySalesBPS(
              0, // _renderProviderSecondarySalesBPS
              250 // _platformProviderSecondarySalesBPS
            );
        });

        it("does allow a value of 2.5% + 2.5%", async function () {
          const config = await loadFixture(_beforeEach);
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProviderSecondarySalesBPS(
              250, // _renderProviderSecondarySalesBPS
              250 // _platformProviderSecondarySalesBPS
            );
        });

        it("does allow a value of < 2.5%", async function () {
          const config = await loadFixture(_beforeEach);
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProviderSecondarySalesBPS(
              0, // _renderProviderSecondarySalesBPS
              0 // _platformProviderSecondarySalesBPS
            );
        });
      } else {
        it("does not allow a value > 100%", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevert(
            config.genArt721Core
              .connect(config.accounts.deployer)
              .updateArtblocksSecondarySalesBPS(10001),
            "Max of ART_BLOCKS_MAX_SECONDARY_SALES_BPS BPS"
          );
        });

        it("does allow a value of 2.5%", async function () {
          const config = await loadFixture(_beforeEach);
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateArtblocksSecondarySalesBPS(250);
        });

        it("does allow a value of < 2.5%", async function () {
          const config = await loadFixture(_beforeEach);
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateArtblocksSecondarySalesBPS(0);
        });
      }
    });

    describe("forbidNewProjects", function () {
      it("prevents new projects from being added after calling", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .forbidNewProjects();
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .addProject(
              "shouldn't work",
              config.accounts.artist.address,
              config.artistContract.address
            ),
          "New projects forbidden"
        );
      });

      it("does not allow to call forbidNewProjects more than once", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .forbidNewProjects();
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .forbidNewProjects(),
          "Already forbidden"
        );
      });

      it("does not allow to call forbidNewProjects after revoking ownership", async function () {
        const config = await loadFixture(_beforeEach);
        // update owner of core to null address, expect OwnershipTransferred event
        await expect(
          config.adminACL
            .connect(config.accounts.deployer)
            .renounceOwnershipOn(config.genArt721Core.address)
        )
          .to.emit(config.genArt721Core, "OwnershipTransferred")
          .withArgs(config.adminACL.address, constants.ZERO_ADDRESS);
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .forbidNewProjects(),
          "Only Admin ACL allowed" // there is no longer ownership, so config will always throw
        );
      });

      it("does allow to call renounceOwnership after forbidding new projects", async function () {
        const config = await loadFixture(_beforeEach);
        // forbid new projects
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .forbidNewProjects();
        // update owner of core to null address, expect OwnershipTransferred event
        await expect(
          config.adminACL
            .connect(config.accounts.deployer)
            .renounceOwnershipOn(config.genArt721Core.address)
        )
          .to.emit(config.genArt721Core, "OwnershipTransferred")
          .withArgs(config.adminACL.address, constants.ZERO_ADDRESS);
      });
    });

    describe("updateDefaultBaseURI", function () {
      it("does not allow non-admin to call", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateDefaultBaseURI("https://token.newuri.com/"),
          "Only Admin ACL allowed"
        );
      });

      it("does allow admin to call", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateDefaultBaseURI("https://token.newuri.com/");
      });
    });
  });
}
