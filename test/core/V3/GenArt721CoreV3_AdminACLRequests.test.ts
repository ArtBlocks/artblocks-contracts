import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
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
  mintProjectUntilRemaining,
  advanceEVMByTime,
  deployCoreWithMinterFilter,
} from "../../util/common";
import { FOUR_WEEKS } from "../../util/constants";

async function validateAdminACLRequest(functionName: string, args: any[]) {
  const targetSelector = this.coreInterface.getSighash(functionName);
  // emits event when being minted out
  await expect(
    this.genArt721Core.connect(this.accounts.deployer)[functionName](...args)
  )
    .to.emit(this.adminACL, "ACLCheck")
    .withArgs(this.accounts.deployer.address, targetSelector);
}

async function expectRevertFromAdminACLRequest(
  functionName: string,
  signer_: SignerWithAddress,
  args: any[]
) {
  const targetSelector = this.coreInterface.getSighash(functionName);
  // emits event when being minted out
  await expectRevert(
    this.genArt721Core.connect(signer_)[functionName](...args),
    "Only Admin ACL allowed"
  );
}

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3", // flagship V3 core
  "GenArt721CoreV3_Explorations", // V3 core explorations contract
  "GenArt721CoreV3_Engine", // V3 core Engine contract
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
    beforeEach(async function () {
      // standard accounts and constants
      this.accounts = await getAccounts();
      await assignDefaultConstants.call(this);

      // get core contract interface for signature hash retrieval
      const artblocksFactory = await ethers.getContractFactory(
        coreContractName
      );
      this.coreInterface = artblocksFactory.interface;

      // deploy and configure minter filter and minter
      ({
        genArt721Core: this.genArt721Core,
        minterFilter: this.minterFilter,
        randomizer: this.randomizer,
        adminACL: this.adminACL,
      } = await deployCoreWithMinterFilter.call(
        this,
        coreContractName,
        "MinterFilterV1",
        true
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

    describe("requests appropriate selectors from AdminACL", function () {
      if (coreContractName === "GenArt721CoreV3_Engine") {
        it("updateProviderSalesAddresses", async function () {
          await validateAdminACLRequest.call(
            this,
            "updateProviderSalesAddresses",
            [
              this.accounts.user.address,
              this.accounts.user.address,
              this.accounts.user.address,
              this.accounts.user.address
            ]
          );
        });
  
        it("updateProviderPrimarySalesPercentages", async function () {
          await validateAdminACLRequest.call(
            this,
            "updateProviderPrimarySalesPercentages",
            [
              11,
              22
            ]
          );
        });
  
        it("updateProviderSecondarySalesBPS", async function () {
          await validateAdminACLRequest.call(
            this,
            "updateProviderSecondarySalesBPS",
            [
              240,
              420
            ]
          );
        });
      } else {
        it("updateArtblocksPrimarySalesAddress", async function () {
          await validateAdminACLRequest.call(
            this,
            "updateArtblocksPrimarySalesAddress",
            [this.accounts.user.address]
          );
        });
  
        it("updateArtblocksSecondarySalesAddress", async function () {
          await validateAdminACLRequest.call(
            this,
            "updateArtblocksSecondarySalesAddress",
            [this.accounts.user.address]
          );
        });
  
        it("updateArtblocksPrimarySalesPercentage", async function () {
          await validateAdminACLRequest.call(
            this,
            "updateArtblocksPrimarySalesPercentage",
            [11]
          );
        });
  
        it("updateArtblocksSecondarySalesBPS", async function () {
          await validateAdminACLRequest.call(
            this,
            "updateArtblocksSecondarySalesBPS",
            [240]
          );
        });
      }

      it("updateMinterContract", async function () {
        await validateAdminACLRequest.call(this, "updateMinterContract", [
          this.accounts.user.address,
        ]);
      });

      it("updateRandomizerAddress", async function () {
        await validateAdminACLRequest.call(this, "updateRandomizerAddress", [
          this.accounts.user.address,
        ]);
      });

      it("toggleProjectIsActive", async function () {
        await validateAdminACLRequest.call(this, "toggleProjectIsActive", [
          this.projectZero,
        ]);
      });

      it("updateProjectArtistAddress", async function () {
        await validateAdminACLRequest.call(this, "updateProjectArtistAddress", [
          this.projectZero,
          this.accounts.artist2.address,
        ]);
      });

      it("addProject", async function () {
        await validateAdminACLRequest.call(this, "addProject", [
          "Project Name",
          this.accounts.artist2.address,
        ]);
      });

      it("updateProjectName", async function () {
        await validateAdminACLRequest.call(this, "updateProjectName", [
          this.projectZero,
          "New Project Name",
        ]);
      });

      it("updateProjectArtistName", async function () {
        await validateAdminACLRequest.call(this, "updateProjectArtistName", [
          this.projectZero,
          "New Artist Name",
        ]);
      });

      it("updateProjectLicense", async function () {
        await validateAdminACLRequest.call(this, "updateProjectLicense", [
          this.projectZero,
          "New Project License",
        ]);
      });

      it("addProjectScript", async function () {
        await validateAdminACLRequest.call(this, "addProjectScript", [
          this.projectZero,
          "console.log('hello world')",
        ]);
      });

      describe("update/remove project scripts", async function () {
        beforeEach(async function () {
          // add a project to be modified
          await this.genArt721Core
            .connect(this.accounts.deployer)
            .addProjectScript(this.projectZero, "console.log('hello world')");
        });

        it("updateProjectScript", async function () {
          // update the script
          await validateAdminACLRequest.call(this, "updateProjectScript", [
            this.projectZero,
            0,
            "console.log('hello big world')",
          ]);
        });

        it("removeProjectLastScript", async function () {
          // update the script
          await validateAdminACLRequest.call(this, "removeProjectLastScript", [
            this.projectZero,
          ]);
        });
      });

      it("updateProjectScriptType", async function () {
        await validateAdminACLRequest.call(this, "updateProjectScriptType", [
          this.projectZero,
          ethers.utils.formatBytes32String("p5js@v1.2.3"),
        ]);
      });

      it("updateProjectAspectRatio", async function () {
        await validateAdminACLRequest.call(this, "updateProjectAspectRatio", [
          this.projectZero,
          "1.7777778",
        ]);
      });

      it("updateProjectDescription", async function () {
        // admin may only call when in a locked state
        await mintProjectUntilRemaining.call(
          this,
          this.projectZero,
          this.accounts.artist,
          0
        );
        await advanceEVMByTime(FOUR_WEEKS + 1);
        // ensure admin requests expected selector
        await validateAdminACLRequest.call(this, "updateProjectDescription", [
          this.projectZero,
          "post-locked admin description",
        ]);
      });
    });

    describe("rejects non-admin calling admin-ACL protected functions", function () {
      if (coreContractName === "GenArt721CoreV3_Engine") {
        it("updateProviderSalesAddresses", async function () {
          await expectRevertFromAdminACLRequest.call(
            this,
            "updateProviderSalesAddresses",
            this.accounts.user,
            [
              this.accounts.user.address,
              this.accounts.user.address,
              this.accounts.user.address,
              this.accounts.user.address
            ]
          );
        });
      } else {
        it("updateArtblocksPrimarySalesAddress", async function () {
          await expectRevertFromAdminACLRequest.call(
            this,
            "updateArtblocksPrimarySalesAddress",
            this.accounts.user,
            [this.accounts.user.address]
          );
        });
  
        it("updateArtblocksSecondarySalesAddress", async function () {
          await expectRevertFromAdminACLRequest.call(
            this,
            "updateArtblocksSecondarySalesAddress",
            this.accounts.user,
            [this.accounts.user.address]
          );
        });
      }
    });
  });
}
