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
  deployWithStorageLibraryAndGet,
} from "../../util/common";
import { FOUR_WEEKS } from "../../util/constants";
import {
  SQUIGGLE_SCRIPT,
  SKULPTUUR_SCRIPT_APPROX,
  CONTRACT_SIZE_LIMIT_SCRIPT,
  GREATER_THAN_CONTRACT_SIZE_LIMIT_SCRIPT,
  MULTI_BYTE_UTF_EIGHT_SCRIPT,
} from "../../util/example-scripts";

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3", // flagship V3 core
  "GenArt721CoreV3_Explorations", // V3 core explorations contract
  "GenArt721CoreV3_Engine", // V3 core Engine contract
  "GenArt721CoreV3_Engine_Flex", // V3 core Engine Flex contract
];

/**
 * Tests for V3 core dealing with configuring projects.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`${coreContractName} Project Configure`, async function () {
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
        "MinterFilterV1"
      ));

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

    describe("imported scripts are non-empty", function () {
      it("ensure diffs are captured if project scripts are deleted", async function () {
        const config = await loadFixture(_beforeEach);
        expect(SQUIGGLE_SCRIPT.length).to.be.gt(0);
        expect(SKULPTUUR_SCRIPT_APPROX.length).to.be.gt(0);
        expect(CONTRACT_SIZE_LIMIT_SCRIPT.length).to.be.gt(0);
        expect(GREATER_THAN_CONTRACT_SIZE_LIMIT_SCRIPT.length).to.be.gt(0);
        expect(GREATER_THAN_CONTRACT_SIZE_LIMIT_SCRIPT.length).to.be.gt(
          CONTRACT_SIZE_LIMIT_SCRIPT.length
        );
        expect(MULTI_BYTE_UTF_EIGHT_SCRIPT.length).to.be.gt(0);
      });
    });

    describe("updateProjectMaxInvocations", function () {
      it("only allows artist to update", async function () {
        const config = await loadFixture(_beforeEach);
        // deployer cannot update
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProjectMaxInvocations(
              config.projectZero,
              config.maxInvocations - 1
            ),
          "Only artist"
        );
        // artist can update
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(
            config.projectZero,
            config.maxInvocations - 1
          );
      });

      it("only allows maxInvocations to be reduced", async function () {
        const config = await loadFixture(_beforeEach);
        let revertString = "maxInvocations may only be decreased";
        if (coreContractName.includes("GenArt721CoreV3_Engine")) {
          revertString = "Only maxInvocations decrease";
        }
        // invocations must be reduced
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectMaxInvocations(
              config.projectZero,
              config.maxInvocations
            ),
          revertString
        );
        // artist can reduce
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(
            config.projectZero,
            config.maxInvocations - 1
          );
      });

      it("only allows maxInvocations to be gte current invocations", async function () {
        const config = await loadFixture(_beforeEach);
        let revertString = "Only max invocations gte current invocations";
        if (coreContractName.includes("GenArt721CoreV3_Engine")) {
          revertString = "Only gte invocations";
        }
        // mint a token on project zero
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        // invocations cannot be < current invocations
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectMaxInvocations(config.projectZero, 0),
          revertString
        );
        // artist can set to greater than current invocations
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 2);
        // artist can set to equal to current invocations
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 1);
      });
    });

    describe("project complete state", function () {
      it("project may not mint when is completed due to reducing maxInvocations", async function () {
        const config = await loadFixture(_beforeEach);
        // mint a token on project zero
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        // set max invocations to number of invocations
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 1);
        // expect project to not mint when completed
        expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .purchase(config.projectZero),
          "Must not exceed max invocations"
        );
        // confirm project is completed via view function
        const projectStateData = await config.genArt721Core.projectStateData(
          config.projectZero
        );
        expect(projectStateData.completedTimestamp).to.be.gt(0);
      });

      it("project may not mint when is completed due to minting out", async function () {
        const config = await loadFixture(_beforeEach);
        // project mints out
        for (let i = 0; i < config.maxInvocations; i++) {
          await config.minter
            .connect(config.accounts.artist)
            .purchase(config.projectZero);
        }
        // expect project to not mint when completed
        expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .purchase(config.projectZero),
          "Must not exceed max invocations"
        );
        // confirm project is completed via view function
        const projectStateData = await config.genArt721Core.projectStateData(
          config.projectZero
        );
        expect(projectStateData.completedTimestamp).to.be.gt(0);
      });
    });

    describe("projectLocked", function () {
      it("project is not locked by default", async function () {
        const config = await loadFixture(_beforeEach);
        const projectStateData = await config.genArt721Core
          .connect(config.accounts.user)
          .projectStateData(config.projectZero);
        expect(projectStateData.locked).to.equal(false);
      });

      it("project is not locked < 4 weeks after being completed", async function () {
        const config = await loadFixture(_beforeEach);
        // project is completed
        for (let i = 0; i < config.maxInvocations; i++) {
          await config.minter
            .connect(config.accounts.artist)
            .purchase(config.projectZero);
        }
        let projectStateData = await config.genArt721Core
          .connect(config.accounts.user)
          .projectStateData(config.projectZero);
        expect(projectStateData.locked).to.equal(false);
        // advance < 4 weeks (10 seconds less)
        await advanceEVMByTime(FOUR_WEEKS - 10);
        projectStateData = await config.genArt721Core
          .connect(config.accounts.user)
          .projectStateData(config.projectZero);
        // expect project to not be locked
        expect(projectStateData.locked).to.equal(false);
      });

      it("project is locked > 4 weeks after being minted out", async function () {
        const config = await loadFixture(_beforeEach);
        // project is completed
        for (let i = 0; i < config.maxInvocations; i++) {
          await config.minter
            .connect(config.accounts.artist)
            .purchase(config.projectZero);
        }
        // advance > 4 weeks
        await advanceEVMByTime(FOUR_WEEKS + 1);
        const projectStateData = await config.genArt721Core
          .connect(config.accounts.user)
          .projectStateData(config.projectZero);
        // expect project to be locked
        expect(projectStateData.locked).to.equal(true);
      });
    });

    describe("updateProjectDescription", function () {
      const errorMessage = "Only artist when unlocked, owner when locked";
      it("owner cannot update when unlocked", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProjectDescription(config.projectZero, "new description"),
          errorMessage
        );
      });

      it("artist can update when unlocked", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectDescription(config.projectZero, "new description");
        // expect view to be updated
        const projectDetails = await config.genArt721Core
          .connect(config.accounts.user)
          .projectDetails(config.projectZero);
        expect(projectDetails.description).to.equal("new description");
      });

      it("owner can update when locked", async function () {
        const config = await loadFixture(_beforeEach);
        await mintProjectUntilRemaining(
          config,
          config.projectZero,
          config.accounts.artist,
          0
        );
        await advanceEVMByTime(FOUR_WEEKS + 1);
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateProjectDescription(config.projectZero, "new description");
        // expect view to be updated
        const projectDetails = await config.genArt721Core
          .connect(config.accounts.user)
          .projectDetails(config.projectZero);
        expect(projectDetails.description).to.equal("new description");
      });

      it("artist cannot update when locked", async function () {
        const config = await loadFixture(_beforeEach);
        await mintProjectUntilRemaining(
          config,
          config.projectZero,
          config.accounts.artist,
          0
        );
        await advanceEVMByTime(FOUR_WEEKS + 1);
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectDescription(config.projectZero, "new description"),
          errorMessage
        );
      });
    });

    describe("updateProjectName", function () {
      const errorMessage = "Only artist when unlocked, owner when locked";
      it("owner can update when unlocked", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateProjectName(config.projectZero, "new name");
      });

      it("artist can update when unlocked", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectName(config.projectZero, "new name");
        // expect view to be updated
        const projectDetails = await config.genArt721Core
          .connect(config.accounts.user)
          .projectDetails(config.projectZero);
        expect(projectDetails.projectName).to.equal("new name");
      });

      it("owner can not update when locked", async function () {
        const config = await loadFixture(_beforeEach);
        await mintProjectUntilRemaining(
          config,
          config.projectZero,
          config.accounts.artist,
          0
        );
        await advanceEVMByTime(FOUR_WEEKS + 1);
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProjectName(config.projectZero, "new description"),
          "Only if unlocked"
        );
      });

      it("user cannot update", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.user)
            .updateProjectName(config.projectZero, "new description"),
          "Only artist or Admin ACL allowed"
        );
      });
    });

    describe("updateProjectScriptType", function () {
      const errorMessage = "Only artist when unlocked, owner when locked";
      it("owner can update when unlocked", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateProjectScriptType(
            config.projectZero,
            ethers.utils.formatBytes32String("p5js@v1.2.3")
          );
      });

      it("artist can update when unlocked", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectScriptType(
            config.projectZero,
            ethers.utils.formatBytes32String("p5js@v1.2.3")
          );
      });

      it("view is updated when value is updated", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectScriptType(
            config.projectZero,
            ethers.utils.formatBytes32String("p5js@v1.2.3")
          );
        // expect view to be updated
        const projectDetails = await config.genArt721Core
          .connect(config.accounts.user)
          .projectScriptDetails(config.projectZero);
        expect(projectDetails.scriptTypeAndVersion).to.equal("p5js@v1.2.3");
      });

      it("value must contain exactly one `@`", async function () {
        const config = await loadFixture(_beforeEach);
        // test too few @
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectScriptType(
              config.projectZero,
              ethers.utils.formatBytes32String("p5js_v1.2.3")
            ),
          "must contain exactly one @"
        );
        // test too many @
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectScriptType(
              config.projectZero,
              ethers.utils.formatBytes32String("p5@js@v1.2.3")
            ),
          "must contain exactly one @"
        );
      });

      it("owner can not update when locked", async function () {
        const config = await loadFixture(_beforeEach);
        await mintProjectUntilRemaining(
          config,
          config.projectZero,
          config.accounts.artist,
          0
        );
        await advanceEVMByTime(FOUR_WEEKS + 1);
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProjectScriptType(
              config.projectZero,
              ethers.utils.formatBytes32String("p5js@v1.2.3")
            ),
          "Only if unlocked"
        );
      });

      it("user cannot update", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.user)
            .updateProjectScriptType(
              config.projectZero,
              ethers.utils.formatBytes32String("p5js@v1.2.3")
            ),
          "Only artist or Admin ACL allowed"
        );
      });
    });

    describe("updateProjectArtistAddress", function () {
      it("only allows owner to update project artist address", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectArtistAddress(
              config.projectZero,
              config.accounts.artist2.address
            ),
          "Only Admin ACL allowed"
        );
        config.genArt721Core
          .connect(config.accounts.deployer)
          .updateProjectArtistAddress(
            config.projectZero,
            config.accounts.artist2.address
          );
      });

      it("reflects updated artist address", async function () {
        const config = await loadFixture(_beforeEach);
        config.genArt721Core
          .connect(config.accounts.deployer)
          .updateProjectArtistAddress(
            config.projectZero,
            config.accounts.artist2.address
          );
        // expect view to reflect update
        const projectArtistPaymentInfo = await config.genArt721Core
          .connect(config.accounts.deployer)
          .projectArtistPaymentInfo(config.projectZero);
        expect(projectArtistPaymentInfo.artistAddress).to.equal(
          config.accounts.artist2.address
        );
      });
    });

    describe("update project payment addresses", function () {
      beforeEach(async function () {
        const config = await loadFixture(_beforeEach);
        config.valuesToUpdateTo = [
          config.projectZero,
          config.accounts.artist2.address,
          config.accounts.additional.address,
          50,
          config.accounts.additional2.address,
          51,
        ];
        // pass config to tests in this describe block
        this.config = config;
      });

      it("only allows artist to propose updates", async function () {
        // get config from beforeEach
        const config = this.config;
        // rejects deployer as a proposer of updates
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .proposeArtistPaymentAddressesAndSplits(...config.valuesToUpdateTo),
          "Only artist"
        );
        // rejects user as a proposer of updates
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.user)
            .proposeArtistPaymentAddressesAndSplits(...config.valuesToUpdateTo),
          "Only artist"
        );
        // allows artist to propose new values
        await config.genArt721Core
          .connect(config.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(...config.valuesToUpdateTo);
      });

      it("does not allow artist to propose invalid", async function () {
        // get config from beforeEach
        const config = this.config;
        // rejects artist proposal primary >100% to additional
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .proposeArtistPaymentAddressesAndSplits(
              config.projectZero,
              config.accounts.artist2.address,
              config.accounts.additional.address,
              101,
              config.accounts.additional2.address,
              0
            ),
          "Max of 100%"
        );
        // rejects artist proposal secondary >100% to additional
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .proposeArtistPaymentAddressesAndSplits(
              config.projectZero,
              config.accounts.artist2.address,
              config.accounts.additional.address,
              0,
              config.accounts.additional2.address,
              101
            ),
          "Max of 100%"
        );
      });

      it("only allows adminACL-allowed account to accept updates if owner has not renounced ownership", async function () {
        // get config from beforeEach
        const config = this.config;
        // artist proposes new values
        await config.genArt721Core
          .connect(config.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(...config.valuesToUpdateTo);
        // rejects artist as an acceptor of updates
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .adminAcceptArtistAddressesAndSplits(...config.valuesToUpdateTo),
          "Only Admin ACL allowed"
        );
        // rejects user as an acceptor of updates
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.user)
            .adminAcceptArtistAddressesAndSplits(...config.valuesToUpdateTo),
          "Only Admin ACL allowed"
        );
        // allows deployer to accept new values
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...config.valuesToUpdateTo);
      });

      it("only allows artist account to accept proposed updates if owner has renounced ownership", async function () {
        // get config from beforeEach
        const config = this.config;
        // artist proposes new values
        await config.genArt721Core
          .connect(config.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(...config.valuesToUpdateTo);
        // admin renounces ownership
        await config.adminACL
          .connect(config.accounts.deployer)
          .renounceOwnershipOn(config.genArt721Core.address);
        // deployer may no longer accept proposed values
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .adminAcceptArtistAddressesAndSplits(...config.valuesToUpdateTo),
          "Only Admin ACL allowed, or artist if owner has renounced"
        );
        // user may not accept proposed values
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.user)
            .adminAcceptArtistAddressesAndSplits(...config.valuesToUpdateTo),
          "Only Admin ACL allowed, or artist if owner has renounced"
        );
        // artist may accept proposed values
        await config.genArt721Core
          .connect(config.accounts.artist)
          .adminAcceptArtistAddressesAndSplits(...config.valuesToUpdateTo);
      });

      it("does not allow adminACL-allowed account to accept updates that don't match artist proposed values", async function () {
        // get config from beforeEach
        const config = this.config;
        // artist proposes new values
        await config.genArt721Core
          .connect(config.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(...config.valuesToUpdateTo);
        // rejects deployer's updates if they don't match artist's proposed values
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .adminAcceptArtistAddressesAndSplits(
              config.valuesToUpdateTo[0],
              config.valuesToUpdateTo[1],
              config.valuesToUpdateTo[2],
              config.valuesToUpdateTo[3],
              config.valuesToUpdateTo[4],
              config.valuesToUpdateTo[5] + 1
            ),
          "Must match artist proposal"
        );
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .adminAcceptArtistAddressesAndSplits(
              config.valuesToUpdateTo[0],
              config.valuesToUpdateTo[1],
              config.valuesToUpdateTo[2],
              config.valuesToUpdateTo[3],
              config.valuesToUpdateTo[2],
              config.valuesToUpdateTo[5]
            ),
          "Must match artist proposal"
        );
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .adminAcceptArtistAddressesAndSplits(
              config.valuesToUpdateTo[0],
              config.valuesToUpdateTo[1],
              config.valuesToUpdateTo[2],
              config.valuesToUpdateTo[3] - 1,
              config.valuesToUpdateTo[4],
              config.valuesToUpdateTo[5]
            ),
          "Must match artist proposal"
        );
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .adminAcceptArtistAddressesAndSplits(
              config.valuesToUpdateTo[0],
              config.valuesToUpdateTo[1],
              config.valuesToUpdateTo[4],
              config.valuesToUpdateTo[3],
              config.valuesToUpdateTo[4],
              config.valuesToUpdateTo[5]
            ),
          "Must match artist proposal"
        );
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .adminAcceptArtistAddressesAndSplits(
              config.valuesToUpdateTo[0],
              config.accounts.user.address,
              config.valuesToUpdateTo[2],
              config.valuesToUpdateTo[3],
              config.valuesToUpdateTo[4],
              config.valuesToUpdateTo[5]
            ),
          "Must match artist proposal"
        );
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .adminAcceptArtistAddressesAndSplits(
              config.projectOne,
              config.valuesToUpdateTo[1],
              config.valuesToUpdateTo[2],
              config.valuesToUpdateTo[3],
              config.valuesToUpdateTo[4],
              config.valuesToUpdateTo[5]
            ),
          "Must match artist proposal"
        );
      });

      it("only allows adminACL-allowed account to accept updates once (i.e. proposal is cleared upon acceptance)", async function () {
        // get config from beforeEach
        const config = this.config;
        // artist proposes new values
        await config.genArt721Core
          .connect(config.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(...config.valuesToUpdateTo);
        // allows deployer to accept new values
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...config.valuesToUpdateTo);
        // reverts if deployer tries to accept again
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .adminAcceptArtistAddressesAndSplits(...config.valuesToUpdateTo),
          "Must match artist proposal"
        );
      });

      it("does not allow proposing payment to the zero address", async function () {
        // get config from beforeEach
        const config = this.config;
        // update additional primary to zero address and non-zero percentage
        let valuesToUpdateTo = [
          config.projectZero,
          config.accounts.artist2.address,
          constants.ZERO_ADDRESS,
          50,
          config.accounts.additional2.address,
          51,
        ];
        // artist proposes new values
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo),
          "Primary payee is zero address"
        );
        // update additional secondary to zero address and non-zero percentage
        valuesToUpdateTo = [
          config.projectZero,
          config.accounts.artist2.address,
          config.accounts.additional.address,
          50,
          constants.ZERO_ADDRESS,
          51,
        ];
        // artist proposes new values
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo),
          "Secondary payee is zero address"
        );
      });

      it("automatically accepts when only percentages are changed", async function () {
        // get config from beforeEach
        const config = this.config;
        // update additional primary to zero address and non-zero percentage
        let valuesToUpdateTo = [
          config.projectZero,
          config.accounts.artist2.address,
          config.accounts.additional.address,
          50,
          config.accounts.additional2.address,
          51,
        ];
        // successful artist proposes new values
        await config.genArt721Core
          .connect(config.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo);
        // admin accept initial new values
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...config.valuesToUpdateTo);
        // only change percentages
        valuesToUpdateTo = [
          valuesToUpdateTo[0],
          valuesToUpdateTo[1],
          valuesToUpdateTo[2],
          90,
          valuesToUpdateTo[4],
          91,
        ];
        // artist proposes new values, is automatically accepted
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist2)
            .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo)
        )
          .to.emit(config.genArt721Core, "AcceptedArtistAddressesAndSplits")
          .withArgs(config.projectZero);
        // check that propose event was also emitted
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist2)
            .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo)
        )
          .to.emit(config.genArt721Core, "ProposedArtistAddressesAndSplits")
          .withArgs(...valuesToUpdateTo);
        // check that values were updated
        expect(
          await config.genArt721Core.projectIdToArtistAddress(
            config.projectZero
          )
        ).to.equal(config.accounts.artist2.address);
        expect(
          await config.genArt721Core.projectIdToAdditionalPayeePrimarySales(
            config.projectZero
          )
        ).to.equal(config.accounts.additional.address);
        expect(
          await config.genArt721Core.projectIdToAdditionalPayeeSecondarySales(
            config.projectZero
          )
        ).to.equal(config.accounts.additional2.address);
        expect(
          await config.genArt721Core.projectIdToAdditionalPayeePrimarySalesPercentage(
            config.projectZero
          )
        ).to.equal(90);
        expect(
          await config.genArt721Core.projectIdToAdditionalPayeeSecondarySalesPercentage(
            config.projectZero
          )
        ).to.equal(91);
      });

      it("automatically accepts when only addresses are removed", async function () {
        // get config from beforeEach
        const config = this.config;
        // update additional primary to zero address and non-zero percentage
        let valuesToUpdateTo = [
          config.projectZero,
          config.accounts.artist2.address,
          config.accounts.additional.address,
          50,
          config.accounts.additional2.address,
          51,
        ];
        // successful artist proposes new values
        await config.genArt721Core
          .connect(config.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo);
        // admin accept initial new values
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...config.valuesToUpdateTo);
        // only remove additional payees
        valuesToUpdateTo = [
          valuesToUpdateTo[0],
          valuesToUpdateTo[1],
          constants.ZERO_ADDRESS,
          0,
          constants.ZERO_ADDRESS,
          0,
        ];
        // artist proposes new values, is automatically accepted
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist2)
            .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo)
        )
          .to.emit(config.genArt721Core, "AcceptedArtistAddressesAndSplits")
          .withArgs(config.projectZero);
        // check that propose event was also emitted
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist2)
            .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo)
        )
          .to.emit(config.genArt721Core, "ProposedArtistAddressesAndSplits")
          .withArgs(...valuesToUpdateTo);
        // check that values were updated
        expect(
          await config.genArt721Core.projectIdToArtistAddress(
            config.projectZero
          )
        ).to.equal(config.accounts.artist2.address);
        expect(
          await config.genArt721Core.projectIdToAdditionalPayeePrimarySales(
            config.projectZero
          )
        ).to.equal(constants.ZERO_ADDRESS);
        expect(
          await config.genArt721Core.projectIdToAdditionalPayeeSecondarySales(
            config.projectZero
          )
        ).to.equal(constants.ZERO_ADDRESS);
        expect(
          await config.genArt721Core.projectIdToAdditionalPayeePrimarySalesPercentage(
            config.projectZero
          )
        ).to.equal(0);
        expect(
          await config.genArt721Core.projectIdToAdditionalPayeeSecondarySalesPercentage(
            config.projectZero
          )
        ).to.equal(0);
      });

      it("clears stale proposal hashes during auto-approval", async function () {
        // get config from beforeEach
        const config = this.config;
        // update additional primary to zero address and non-zero percentage
        let valuesToUpdateTo = [
          config.projectZero,
          config.accounts.artist2.address,
          config.accounts.additional.address,
          50,
          config.accounts.additional2.address,
          51,
        ];
        // successful artist proposes new values
        await config.genArt721Core
          .connect(config.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo);
        // admin accept initial new values
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...config.valuesToUpdateTo);
        // propose a change that requires admin approval, hash stored on-chain
        // change a payment address
        valuesToUpdateTo = [
          valuesToUpdateTo[0],
          valuesToUpdateTo[1],
          config.accounts.user.address,
          90,
          valuesToUpdateTo[4],
          91,
        ];
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist2)
            .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo)
        )
          .to.not.emit(config.genArt721Core, "AcceptedArtistAddressesAndSplits")
          .withArgs(config.projectZero);
        // artist changes to an auto-approved request (only percentages changed)
        valuesToUpdateTo = [
          valuesToUpdateTo[0],
          valuesToUpdateTo[1],
          config.accounts.additional.address, // back to current active additional primary
          90,
          valuesToUpdateTo[4],
          91,
        ];
        // artist proposes new values, is automatically accepted
        await config.genArt721Core
          .connect(config.accounts.artist2)
          .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo);
        // check that on-chain proposal hash is cleared after automatic approval
        expect(
          await config.genArt721Core.proposedArtistAddressesAndSplitsHash(
            config.projectZero
          )
        ).to.equal(constants.ZERO_BYTES32);
      });
    });

    describe("updateProjectSecondaryMarketRoyaltyPercentage", function () {
      it("owner can not update when unlocked", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProjectSecondaryMarketRoyaltyPercentage(
              config.projectZero,
              10
            ),
          "Only artist"
        );
      });

      it("artist can update when unlocked", async function () {
        const config = await loadFixture(_beforeEach);
        // mint a token on project zero,
        // so that royalties for that token may be read
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);

        const adjustedRoyaltyPercentage = 10;
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectSecondaryMarketRoyaltyPercentage(
            config.projectZero,
            adjustedRoyaltyPercentage
          );

        // expect view to be updated
        // TODO - update to use royaltyInfo so that we can test across all core contracts
        // const royaltiesData = await config.genArt721Core
        //   .connect(config.accounts.user)
        //   .getRoyaltyData(config.projectZeroTokenZero.toNumber());
        // expect(royaltiesData.artistAddress).to.be.equal(
        //   config.accounts.artist.address
        // );
        // expect(royaltiesData.royaltyFeeByID).to.be.equal(10);
        // expect(royaltiesData.additionalPayeePercentage).to.be.equal(0);
      });

      it("artist can update when locked", async function () {
        const config = await loadFixture(_beforeEach);
        await mintProjectUntilRemaining(
          config,
          config.projectZero,
          config.accounts.artist,
          0
        );
        await advanceEVMByTime(FOUR_WEEKS + 1);

        const adjustedRoyaltyPercentage = 11;
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectSecondaryMarketRoyaltyPercentage(
            config.projectZero,
            adjustedRoyaltyPercentage
          );

        // expect view to be updated
        // TODO - update to use royaltyInfo so that we can test across all core contracts
        // const royaltiesData = await config.genArt721Core
        //   .connect(config.accounts.user)
        //   .getRoyaltyData(config.projectZeroTokenZero.toNumber());
        // expect(royaltiesData.artistAddress).to.be.equal(
        //   config.accounts.artist.address
        // );
        // expect(royaltiesData.royaltyFeeByID).to.be.equal(11);
        // expect(royaltiesData.additionalPayeePercentage).to.be.equal(0);
      });

      it("artist cannot update > 95%", async function () {
        const config = await loadFixture(_beforeEach);
        let revertString =
          "Max of ARTIST_MAX_SECONDARY_ROYALTY_PERCENTAGE percent";
        if (coreContractName.includes("GenArt721CoreV3_Engine")) {
          revertString = "Over max percent";
        }
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectSecondaryMarketRoyaltyPercentage(
              config.projectZero,
              96
            ),
          revertString
        );
      });
    });

    describe("addProjectScript", function () {
      it("uploads and recalls a single-byte script", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectScript(config.projectZero, "0");
        const script = await config.genArt721Core.projectScriptByIndex(
          config.projectZero,
          0
        );
        expect(script).to.equal("0");
      });

      it("uploads and recalls an short script < 32 bytes", async function () {
        const config = await loadFixture(_beforeEach);
        const targetScript = "console.log(hello world)";
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectScript(config.projectZero, targetScript);
        const script = await config.genArt721Core.projectScriptByIndex(
          config.projectZero,
          0
        );
        expect(script).to.equal(targetScript);
      });

      it("uploads and recalls chromie squiggle script", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectScript(config.projectZero, SQUIGGLE_SCRIPT);
        const script = await config.genArt721Core.projectScriptByIndex(
          config.projectZero,
          0
        );
        expect(script).to.equal(SQUIGGLE_SCRIPT);
      });

      it("uploads and recalls different script", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectScript(config.projectZero, SKULPTUUR_SCRIPT_APPROX);
        const script = await config.genArt721Core.projectScriptByIndex(
          config.projectZero,
          0
        );
        expect(script).to.equal(SKULPTUUR_SCRIPT_APPROX);
      });

      it("uploads and recalls 23.95 KB script", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectScript(config.projectZero, CONTRACT_SIZE_LIMIT_SCRIPT, {
            gasLimit: 30000000, // hard-code gas limit because ethers sometimes estimates too high
          });
        const script = await config.genArt721Core.projectScriptByIndex(
          config.projectZero,
          0
        );
        expect(script).to.equal(CONTRACT_SIZE_LIMIT_SCRIPT);
      });

      // skip on coverage because contract max sizes are ignored
      it("fails to upload 26 KB script [ @skip-on-coverage ]", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.genArt721Core.connect(config.accounts.artist).addProjectScript(
            config.projectZero,
            GREATER_THAN_CONTRACT_SIZE_LIMIT_SCRIPT,
            { gasLimit: 30000000 } // hard-code gas limit because ethers sometimes estimates too high
          ),
          "ContractAsStorage: Write Error"
        );
      });

      it("uploads and recalls misc. UTF-8 script", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectScript(config.projectZero, MULTI_BYTE_UTF_EIGHT_SCRIPT);
        const script = await config.genArt721Core.projectScriptByIndex(
          config.projectZero,
          0
        );
        expect(script).to.equal(MULTI_BYTE_UTF_EIGHT_SCRIPT);
      });

      it("uploads and recalls chromie squiggle script and different script", async function () {
        const config = await loadFixture(_beforeEach);
        // index 0: squiggle
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectScript(config.projectZero, SQUIGGLE_SCRIPT);
        // index 1: skulptuur-like
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectScript(config.projectZero, SKULPTUUR_SCRIPT_APPROX);
        // verify results
        const scriptZero = await config.genArt721Core.projectScriptByIndex(
          config.projectZero,
          0
        );
        expect(scriptZero).to.equal(SQUIGGLE_SCRIPT);
        const scriptOne = await config.genArt721Core.projectScriptByIndex(
          config.projectZero,
          1
        );
        expect(scriptOne).to.equal(SKULPTUUR_SCRIPT_APPROX);
      });

      it("doesn't selfdestruct script storage contract when safeTransferFrom to script storage contract", async function () {
        const config = await loadFixture(_beforeEach);
        // upload script and get address
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectScript(config.projectZero, SQUIGGLE_SCRIPT);
        const scriptAddress =
          await config.genArt721Core.projectScriptBytecodeAddressByIndex(
            config.projectZero,
            0
          );
        const scriptByteCode = await ethers.provider.getCode(scriptAddress);
        expect(scriptByteCode).to.not.equal("0x");

        // mint a token on project zero
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);

        // attempt to safe-transfer token to script storage contract
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            [
              "safeTransferFrom(address,address,uint256)"
            ](config.accounts.artist.address, scriptAddress, config.projectZeroTokenZero.toNumber()),
          "ERC721: transfer to non ERC721Receiver implementer"
        );

        // verify script storage contract still exists
        const sameScriptByteCode = await ethers.provider.getCode(scriptAddress);
        expect(sameScriptByteCode).to.equal(scriptByteCode);
        expect(sameScriptByteCode).to.not.equal("0x");
      });
    });

    describe("projectScriptBytecodeAddressByIndex", function () {
      it("uploads and recalls a single-byte script", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectScript(config.projectZero, "0");
        const scriptBytecodeAddress =
          await config.genArt721Core.projectScriptBytecodeAddressByIndex(
            config.projectZero,
            0
          );
        expect(scriptBytecodeAddress).to.not.equal("0");
      });
    });

    describe("updateProjectScript", function () {
      beforeEach(async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectScript(config.projectZero, "// script 0");
        // pass config to tests in this describe block
        this.config = config;
      });

      it("owner can update when unlocked", async function () {
        // get config from beforeEach
        const config = this.config;
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateProjectScript(config.projectZero, 0, "// script 0.1");
      });

      it("artist can update when unlocked", async function () {
        // get config from beforeEach
        const config = this.config;
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectScript(config.projectZero, 0, "// script 0.1");
      });

      it("artist cannot update when locked", async function () {
        // get config from beforeEach
        const config = this.config;
        await mintProjectUntilRemaining(
          config,
          config.projectZero,
          config.accounts.artist,
          0
        );
        await advanceEVMByTime(FOUR_WEEKS + 1);
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectScript(config.projectZero, 0, "// script 0.1"),
          "Only if unlocked"
        );
      });

      it("artist cannot update non-existing script index", async function () {
        // get config from beforeEach
        const config = this.config;
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectScript(config.projectZero, 1, "// script 1"),
          "scriptId out of range"
        );
      });

      it("bytecode contracts deployed as expected in updates", async function () {
        // get config from beforeEach
        const config = this.config;
        const originalScriptAddress =
          await config.genArt721Core.projectScriptBytecodeAddressByIndex(
            config.projectZero,
            0
          );

        const scriptByteCode = await ethers.provider.getCode(
          originalScriptAddress
        );
        expect(scriptByteCode).to.not.equal("0x");

        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectScript(config.projectZero, 0, "// script 0.1");

        const newScriptAddress =
          await config.genArt721Core.projectScriptBytecodeAddressByIndex(
            config.projectZero,
            0
          );
        const newScriptByteCode =
          await ethers.provider.getCode(newScriptAddress);
        expect(newScriptByteCode).to.not.equal("0x");
        expect(newScriptByteCode).to.not.equal(scriptByteCode);
      });
    });

    describe("removeProjectLastScript", function () {
      beforeEach(async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectScript(config.projectZero, "// script 0");
        // pass config to tests in this describe block
        this.config = config;
      });

      it("owner can remove when unlocked", async function () {
        // get config from beforeEach
        const config = this.config;
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .removeProjectLastScript(config.projectZero);
      });

      it("artist can remove when unlocked", async function () {
        // get config from beforeEach
        const config = this.config;
        await config.genArt721Core
          .connect(config.accounts.artist)
          .removeProjectLastScript(config.projectZero);
      });

      it("artist cannot remove when locked", async function () {
        // get config from beforeEach
        const config = this.config;
        await mintProjectUntilRemaining(
          config,
          config.projectZero,
          config.accounts.artist,
          0
        );
        await advanceEVMByTime(FOUR_WEEKS + 1);
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .removeProjectLastScript(config.projectZero),
          "Only if unlocked"
        );
      });

      it("artist cannot update non-existing script index", async function () {
        // get config from beforeEach
        const config = this.config;
        let revertString = "there are no scripts to remove";
        if (coreContractName.includes("GenArt721CoreV3_Engine")) {
          revertString = "No scripts to remove";
        }
        // remove existing script
        await config.genArt721Core
          .connect(config.accounts.artist)
          .removeProjectLastScript(config.projectZero);
        // expect revert when tyring to remove again
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .removeProjectLastScript(config.projectZero),
          revertString
        );
      });
    });

    describe("Engine autoApproveArtistSplitProposals is true", function () {
      beforeEach(async function () {
        const config = await loadFixture(_beforeEach);
        if (!coreContractName.endsWith("_Engine")) {
          return;
        }
        config.randomizer = await deployAndGet(config, "BasicRandomizerV2", []);
        config.adminACL = await deployAndGet(config, "AdminACLV0", []);
        config.engineRegistry = await deployAndGet(
          config,
          "EngineRegistryV0",
          []
        );
        // set `autoApproveArtistSplitProposals` to true
        config.genArt721Core = await deployWithStorageLibraryAndGet(
          config,
          coreContractName,
          [
            config.name, // _tokenName
            config.symbol, // _tokenSymbol
            config.accounts.deployer.address, // _renderProviderAddress
            config.accounts.additional.address, // _platformProviderAddress
            config.randomizer.address, // _randomizerContract
            config.adminACL.address, // _adminACLContract
            0, // _startingProjectId
            true, // _autoApproveArtistSplitProposals
          ]
        );
        // assign core contract for randomizer to use
        config.randomizer
          .connect(config.accounts.deployer)
          .assignCoreAndRenounce(config.genArt721Core.address);
        // deploy minter filter
        config.minterFilter = await deployAndGet(config, "MinterFilterV1", [
          config.genArt721Core.address,
        ]);
        // allowlist minterFilter on the core contract
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateMinterContract(config.minterFilter.address);
        // add project zero
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .addProject("name", config.accounts.artist.address);
        // define valid artist proposed values, not typically auto-approved
        config.valuesToUpdateTo = [
          config.projectZero,
          config.accounts.artist2.address,
          config.accounts.additional.address,
          50,
          config.accounts.additional2.address,
          51,
        ];
        // pass config to tests in this describe block
        this.config = config;
      });

      it("new artist proposals are automatically accepted", async function () {
        // get config from beforeEach
        const config = this.config;
        if (!coreContractName.endsWith("_Engine")) {
          console.info("skipping test for non-engine contract");
          return;
        }
        // allows artist to propose new values
        await config.genArt721Core
          .connect(config.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(...config.valuesToUpdateTo);
        // expect artist payment addresses and splits to be updated due to auto-approval
        const projectArtistPaymentInfo =
          await config.genArt721Core.projectArtistPaymentInfo(
            config.projectZero
          );
        expect(projectArtistPaymentInfo.artistAddress).to.equal(
          config.accounts.artist2.address
        );
        expect(projectArtistPaymentInfo.additionalPayeePrimarySales).to.equal(
          config.accounts.additional.address
        );
        expect(
          projectArtistPaymentInfo.additionalPayeePrimarySalesPercentage
        ).to.equal(50);
        expect(projectArtistPaymentInfo.additionalPayeeSecondarySales).to.equal(
          config.accounts.additional2.address
        );
        expect(
          projectArtistPaymentInfo.additionalPayeeSecondarySalesPercentage
        ).to.equal(51);
      });
    });
  });
}
