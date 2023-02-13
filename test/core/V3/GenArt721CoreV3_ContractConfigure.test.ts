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

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  mintProjectUntilRemaining,
  advanceEVMByTime,
} from "../../util/common";
import { FOUR_WEEKS } from "../../util/constants";

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3", // flagship V3 core
  "GenArt721CoreV3_Explorations", // V3 core explorations contract
  "GenArt721CoreV3_Engine", // V3 core Engine contract
  "GenArt721CoreV3_Engine_Flex", // V3 core Engine Flex contract
];

/**
 * Tests for V3 core dealing with configuring the core contract.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`${coreContractName} Contract Configure`, async function () {
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
        coreContractName,
        "MinterFilterV1"
      ));

      this.minter = await deployAndGet.call(this, "MinterSetPriceV2", [
        this.genArt721Core.address,
        this.minterFilter.address,
      ]);

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

      // add project one without setting it to active or setting max invocations
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .addProject("name", this.accounts.artist2.address);

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

    describe("update{Artblocks,Provider}PrimarySalesPercentage", function () {
      beforeEach(async function () {
        if (coreContractName === "GenArt721CoreV3") {
          this.maxABPrimarySalesPercentage = 25; // 25% maximum percentage on V3 core
        } else if (coreContractName === "GenArt721CoreV3_Explorations") {
          this.maxABPrimarySalesPercentage = 100; // 100% maximum percentage on V3 core explorations
        } else if (coreContractName.includes("GenArt721CoreV3_Engine")) {
          this.maxProviderPrimarySalesPercentage = 100; // 100% maxmimum percentage on V3 core engine
        } else {
          throw new Error("Invalid core contract name");
        }
      });

      if (coreContractName.includes("GenArt721CoreV3_Engine")) {
        it("does not allow a value > ONE_HUNDRED", async function () {
          await expectRevert(
            this.genArt721Core
              .connect(this.accounts.deployer)
              .updateProviderPrimarySalesPercentages(
                this.maxProviderPrimarySalesPercentage + 1, // renderProviderPrimarySalesPercentage_
                0 // platformProviderPrimarySalesPercentage_
              ),
            "Max sum of ONE_HUNDRED %"
          );
          await expectRevert(
            this.genArt721Core
              .connect(this.accounts.deployer)
              .updateProviderPrimarySalesPercentages(
                0, // renderProviderPrimarySalesPercentage_
                this.maxProviderPrimarySalesPercentage + 1 // platformProviderPrimarySalesPercentage_
              ),
            "Max sum of ONE_HUNDRED %"
          );
        });

        it("does allow a value of ONE_HUNDRED", async function () {
          await this.genArt721Core
            .connect(this.accounts.deployer)
            .updateProviderPrimarySalesPercentages(
              this.maxProviderPrimarySalesPercentage, // renderProviderPrimarySalesPercentage_
              0 // platformProviderPrimarySalesPercentage_
            );
          await this.genArt721Core
            .connect(this.accounts.deployer)
            .updateProviderPrimarySalesPercentages(
              0, // renderProviderPrimarySalesPercentage_
              this.maxProviderPrimarySalesPercentage // platformProviderPrimarySalesPercentage_
            );
        });

        it("does allow a value of 0%", async function () {
          await this.genArt721Core
            .connect(this.accounts.deployer)
            .updateProviderPrimarySalesPercentages(
              0, // renderProviderPrimarySalesPercentage_
              0 // platformProviderPrimarySalesPercentage_
            );
        });
      } else {
        it("does not allow a value > ART_BLOCKS_MAX_PRIMARY_SALES_PERCENTAGE", async function () {
          await expectRevert(
            this.genArt721Core
              .connect(this.accounts.deployer)
              .updateArtblocksPrimarySalesPercentage(
                this.maxABPrimarySalesPercentage + 1
              ),
            "Max of ART_BLOCKS_MAX_PRIMARY_SALES_PERCENTAGE percent"
          );
        });

        it("does allow a value of ART_BLOCKS_MAX_PRIMARY_SALES_PERCENTAGE", async function () {
          await this.genArt721Core
            .connect(this.accounts.deployer)
            .updateArtblocksPrimarySalesPercentage(
              this.maxABPrimarySalesPercentage
            );
        });

        it("does allow a value of 0%", async function () {
          await this.genArt721Core
            .connect(this.accounts.deployer)
            .updateArtblocksPrimarySalesPercentage(0);
        });
      }
    });

    describe("update{Artblocks,Provider}SecondarySalesBPS", function () {
      if (coreContractName.includes("GenArt721CoreV3_Engine")) {
        it("does not allow a value > 100%", async function () {
          await expectRevert(
            this.genArt721Core
              .connect(this.accounts.deployer)
              .updateProviderSecondarySalesBPS(
                10001, // _renderProviderSecondarySalesBPS
                0 // _platformProviderSecondarySalesBPS
              ),
            "Over max sum of BPS"
          );
          await expectRevert(
            this.genArt721Core
              .connect(this.accounts.deployer)
              .updateProviderSecondarySalesBPS(
                0, // _renderProviderSecondarySalesBPS
                10001 // _platformProviderSecondarySalesBPS
              ),
            "Over max sum of BPS"
          );
        });

        it("does allow a value of 2.5%", async function () {
          await this.genArt721Core
            .connect(this.accounts.deployer)
            .updateProviderSecondarySalesBPS(
              250, // _renderProviderSecondarySalesBPS
              0 // _platformProviderSecondarySalesBPS
            );
          await this.genArt721Core
            .connect(this.accounts.deployer)
            .updateProviderSecondarySalesBPS(
              0, // _renderProviderSecondarySalesBPS
              250 // _platformProviderSecondarySalesBPS
            );
        });

        it("does allow a value of 2.5% + 2.5%", async function () {
          await this.genArt721Core
            .connect(this.accounts.deployer)
            .updateProviderSecondarySalesBPS(
              250, // _renderProviderSecondarySalesBPS
              250 // _platformProviderSecondarySalesBPS
            );
        });

        it("does allow a value of < 2.5%", async function () {
          await this.genArt721Core
            .connect(this.accounts.deployer)
            .updateProviderSecondarySalesBPS(
              0, // _renderProviderSecondarySalesBPS
              0 // _platformProviderSecondarySalesBPS
            );
        });
      } else {
        it("does not allow a value > 100%", async function () {
          await expectRevert(
            this.genArt721Core
              .connect(this.accounts.deployer)
              .updateArtblocksSecondarySalesBPS(10001),
            "Max of ART_BLOCKS_MAX_SECONDARY_SALES_BPS BPS"
          );
        });

        it("does allow a value of 2.5%", async function () {
          await this.genArt721Core
            .connect(this.accounts.deployer)
            .updateArtblocksSecondarySalesBPS(250);
        });

        it("does allow a value of < 2.5%", async function () {
          await this.genArt721Core
            .connect(this.accounts.deployer)
            .updateArtblocksSecondarySalesBPS(0);
        });
      }
    });

    describe("forbidNewProjects", function () {
      it("prevents new projects from being added after calling", async function () {
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .forbidNewProjects();
        await expectRevert(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .addProject("shouldn't work", this.accounts.artist.address),
          "New projects forbidden"
        );
      });

      it("does not allow to call forbidNewProjects more than once", async function () {
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .forbidNewProjects();
        await expectRevert(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .forbidNewProjects(),
          "Already forbidden"
        );
      });

      it("does not allow to call forbidNewProjects after revoking ownership", async function () {
        // update owner of core to null address, expect OwnershipTransferred event
        await expect(
          this.adminACL
            .connect(this.accounts.deployer)
            .renounceOwnershipOn(this.genArt721Core.address)
        )
          .to.emit(this.genArt721Core, "OwnershipTransferred")
          .withArgs(this.adminACL.address, constants.ZERO_ADDRESS);
        await expectRevert(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .forbidNewProjects(),
          "Only Admin ACL allowed" // there is no longer ownership, so this will always throw
        );
      });

      it("does allow to call renounceOwnership after forbidding new projects", async function () {
        // forbid new projects
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .forbidNewProjects();
        // update owner of core to null address, expect OwnershipTransferred event
        await expect(
          this.adminACL
            .connect(this.accounts.deployer)
            .renounceOwnershipOn(this.genArt721Core.address)
        )
          .to.emit(this.genArt721Core, "OwnershipTransferred")
          .withArgs(this.adminACL.address, constants.ZERO_ADDRESS);
      });
    });

    describe("updateDefaultBaseURI", function () {
      it("does not allow non-admin to call", async function () {
        await expectRevert(
          this.genArt721Core
            .connect(this.accounts.artist)
            .updateDefaultBaseURI("https://token.newuri.com/"),
          "Only Admin ACL allowed"
        );
      });

      it("does allow admin to call", async function () {
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateDefaultBaseURI("https://token.newuri.com/");
      });
    });
  });
}
