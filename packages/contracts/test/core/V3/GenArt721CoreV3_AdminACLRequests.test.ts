import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  mintProjectUntilRemaining,
  advanceEVMByTime,
  deployCoreWithMinterFilter,
  GENART721_ERROR_NAME,
  GENART721_ERROR_CODES,
} from "../../util/common";
import { FOUR_WEEKS } from "../../util/constants";

async function validateAdminACLRequest(
  config: T_Config,
  functionName: string,
  args: any[]
) {
  const targetSelector = config.coreInterface.getSighash(functionName);
  // emits event when being minted out
  await expect(
    config.genArt721Core
      .connect(config.accounts.deployer)
      [functionName](...args)
  )
    .to.emit(config.adminACL, "ACLCheck")
    .withArgs(config.accounts.deployer.address, targetSelector);
}

async function expectRevertFromAdminACLRequest(
  config: T_Config,
  functionName: string,
  signer_: SignerWithAddress,
  args: any[]
) {
  const targetSelector = config.coreInterface.getSighash(functionName);
  // emits event when being minted out
  await expect(config.genArt721Core.connect(signer_)[functionName](...args))
    .to.be.revertedWithCustomError(config.genArt721Core, GENART721_ERROR_NAME)
    .withArgs(GENART721_ERROR_CODES.OnlyAdminACL);
}

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3_Engine", // V3 core Engine contract,
  "GenArt721CoreV3_Engine_Flex", // V3 core Engine Flex contract
];

/**
 * Tests for V3 core dealing with funcitons requesting proper Admin ACL while
 * authenticating caller.
 * @dev Most or all of these tests rely on our mock AdminACL contract, which
 * emits an event for debugging purposes indicating what the core contract is
 * requesting to authenticate.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`${coreContractName} AdminACL Requests`, async function () {
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
        coreContractName,
        "MinterFilterV1",
        true
      ));

      // get core contract interface for signature hash retrieval
      config.coreInterface = config.genArt721Core.interface;
      config.minter = await deployAndGet(config, "MinterSetPriceV2", [
        config.genArt721Core.address,
        config.minterFilter.address,
      ]);

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

      // add project one without setting it to active or setting max invocations
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .addProject("name", config.accounts.artist2.address);

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

    describe("requests appropriate selectors from AdminACL", function () {
      if (coreContractName.includes("GenArt721CoreV3_Engine")) {
        it("updateProviderSalesAddresses", async function () {
          const config = await loadFixture(_beforeEach);
          await validateAdminACLRequest(
            config,
            "updateProviderSalesAddresses",
            [
              config.accounts.user.address,
              config.accounts.user.address,
              config.accounts.user.address,
              config.accounts.user.address,
            ]
          );
        });

        it("updateProviderPrimarySalesPercentages", async function () {
          const config = await loadFixture(_beforeEach);
          await validateAdminACLRequest(
            config,
            "updateProviderPrimarySalesPercentages",
            [11, 22]
          );
        });

        it("updateProviderDefaultSecondarySalesBPS", async function () {
          const config = await loadFixture(_beforeEach);
          await validateAdminACLRequest(
            config,
            "updateProviderDefaultSecondarySalesBPS",
            [240, 420]
          );
        });
      } else {
        it("updateArtblocksPrimarySalesAddress", async function () {
          const config = await loadFixture(_beforeEach);
          await validateAdminACLRequest(
            config,
            "updateArtblocksPrimarySalesAddress",
            [config.accounts.user.address]
          );
        });

        it("updateArtblocksSecondarySalesAddress", async function () {
          const config = await loadFixture(_beforeEach);
          await validateAdminACLRequest(
            config,
            "updateArtblocksSecondarySalesAddress",
            [config.accounts.user.address]
          );
        });

        it("updateArtblocksPrimarySalesPercentage", async function () {
          const config = await loadFixture(_beforeEach);
          await validateAdminACLRequest(
            config,
            "updateArtblocksPrimarySalesPercentage",
            [11]
          );
        });

        it("updateArtblocksSecondarySalesBPS", async function () {
          const config = await loadFixture(_beforeEach);
          await validateAdminACLRequest(
            config,
            "updateArtblocksSecondarySalesBPS",
            [240]
          );
        });
      }

      it("updateMinterContract", async function () {
        const config = await loadFixture(_beforeEach);
        await validateAdminACLRequest(config, "updateMinterContract", [
          config.accounts.user.address,
        ]);
      });

      it("updateRandomizerAddress", async function () {
        const config = await loadFixture(_beforeEach);
        await validateAdminACLRequest(config, "updateRandomizerAddress", [
          config.accounts.user.address,
        ]);
      });

      it("updateSplitProvider", async function () {
        const config = await loadFixture(_beforeEach);
        await validateAdminACLRequest(config, "updateSplitProvider", [
          config.splitProvider.address,
        ]);
      });

      it("toggleProjectIsActive", async function () {
        const config = await loadFixture(_beforeEach);
        await validateAdminACLRequest(config, "toggleProjectIsActive", [
          config.projectZero,
        ]);
      });

      it("updateProjectArtistAddress", async function () {
        const config = await loadFixture(_beforeEach);
        await validateAdminACLRequest(config, "updateProjectArtistAddress", [
          config.projectZero,
          config.accounts.artist2.address,
        ]);
      });

      it("addProject", async function () {
        const config = await loadFixture(_beforeEach);
        await validateAdminACLRequest(config, "addProject", [
          "Project Name",
          config.accounts.artist2.address,
        ]);
      });

      it("updateProjectName", async function () {
        const config = await loadFixture(_beforeEach);
        await validateAdminACLRequest(config, "updateProjectName", [
          config.projectZero,
          "New Project Name",
        ]);
      });

      it("updateProjectArtistName", async function () {
        const config = await loadFixture(_beforeEach);
        // admin may only call when in a locked state
        await mintProjectUntilRemaining(
          config,
          config.projectZero,
          config.accounts.artist,
          0
        );
        await advanceEVMByTime(FOUR_WEEKS + 1);
        await validateAdminACLRequest(config, "updateProjectArtistName", [
          config.projectZero,
          "New Artist Name",
        ]);
      });

      it("updateProjectLicense", async function () {
        const config = await loadFixture(_beforeEach);
        await validateAdminACLRequest(config, "updateProjectLicense", [
          config.projectZero,
          "New Project License",
        ]);
      });

      it("addProjectScript", async function () {
        const config = await loadFixture(_beforeEach);
        await validateAdminACLRequest(config, "addProjectScript", [
          config.projectZero,
          "console.log('hello world')",
        ]);
      });

      it("addProjectScriptCompressed", async function () {
        const config = await loadFixture(_beforeEach);
        const compressedScript = await config.genArt721Core
          ?.connect(config.accounts.deployer)
          .getCompressed("console.log('hello world')");
        await validateAdminACLRequest(config, "addProjectScriptCompressed", [
          config.projectZero,
          compressedScript,
        ]);
      });

      describe("update/remove project scripts", async function () {
        beforeEach(async function () {
          const config = await loadFixture(_beforeEach);
          // add a project to be modified
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .addProjectScript(config.projectZero, "console.log('hello world')");
          // pass config to tests in this describe block
          this.config = config;
        });

        it("updateProjectScript", async function () {
          // get config from beforeEach
          const config = this.config;
          // update the script
          await validateAdminACLRequest(config, "updateProjectScript", [
            config.projectZero,
            0,
            "console.log('hello big world')",
          ]);
        });

        it("removeProjectLastScript", async function () {
          // get config from beforeEach
          const config = this.config;
          // update the script
          await validateAdminACLRequest(config, "removeProjectLastScript", [
            config.projectZero,
          ]);
        });
      });

      describe("update compressed project scripts", async function () {
        beforeEach(async function () {
          const config = await loadFixture(_beforeEach);
          // add a project to be modified
          const compressedScript = await config.genArt721Core
            ?.connect(config.accounts.deployer)
            .getCompressed("console.log('hello world')");
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .addProjectScriptCompressed(config.projectZero, compressedScript);
          // pass config to tests in this describe block
          this.config = config;
        });

        it("updateProjectScriptCompressed", async function () {
          // get config from beforeEach
          const config = this.config;
          // update the script
          const compressedScript = await config.genArt721Core
            ?.connect(config.accounts.deployer)
            .getCompressed("console.log('hello world')");
          await validateAdminACLRequest(
            config,
            "updateProjectScriptCompressed",
            [config.projectZero, 0, compressedScript]
          );
        });
      });

      it("updateProjectScriptType", async function () {
        const config = await loadFixture(_beforeEach);
        await validateAdminACLRequest(config, "updateProjectScriptType", [
          config.projectZero,
          ethers.utils.formatBytes32String("p5js@v1.2.3"),
        ]);
      });

      it("updateProjectAspectRatio", async function () {
        const config = await loadFixture(_beforeEach);
        await validateAdminACLRequest(config, "updateProjectAspectRatio", [
          config.projectZero,
          "1.7777778",
        ]);
      });

      it("updateProjectDescription", async function () {
        const config = await loadFixture(_beforeEach);
        // admin may only call when in a locked state
        await mintProjectUntilRemaining(
          config,
          config.projectZero,
          config.accounts.artist,
          0
        );
        await advanceEVMByTime(FOUR_WEEKS + 1);
        // ensure admin requests expected selector
        await validateAdminACLRequest(config, "updateProjectDescription", [
          config.projectZero,
          "post-locked admin description",
        ]);
      });
    });

    describe("rejects non-admin calling admin-ACL protected functions", function () {
      if (coreContractName.includes("GenArt721CoreV3_Engine")) {
        it("updateProviderSalesAddresses", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevertFromAdminACLRequest(
            config,
            "updateProviderSalesAddresses",
            config.accounts.user,
            [
              config.accounts.user.address,
              config.accounts.user.address,
              config.accounts.user.address,
              config.accounts.user.address,
            ]
          );
        });
      } else {
        it("updateArtblocksPrimarySalesAddress", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevertFromAdminACLRequest(
            config,
            "updateArtblocksPrimarySalesAddress",
            config.accounts.user,
            [config.accounts.user.address]
          );
        });

        it("updateArtblocksSecondarySalesAddress", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevertFromAdminACLRequest(
            config,
            "updateArtblocksSecondarySalesAddress",
            config.accounts.user,
            [config.accounts.user.address]
          );
        });
      }
    });
  });
}
