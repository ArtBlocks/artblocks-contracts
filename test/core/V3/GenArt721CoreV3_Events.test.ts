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
import { hexDataSlice } from "@ethersproject/bytes";

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  mintProjectUntilRemaining,
  advanceEVMByTime,
} from "../../util/common";

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3", // flagship V3 core
  "GenArt721CoreV3_Explorations", // V3 core explorations contract
  "GenArt721CoreV3_Engine", // V3 core Engine contract
  "GenArt721CoreV3_Engine_Flex", // V3 core Engine Flex contract
];

/**
 * Tests for V3 core dealing with emitted events
 */
for (const coreContractName of coreContractsToTest) {
  describe(`${coreContractName} Events`, async function () {
    beforeEach(async function () {
      // standard accounts and constants
      this.accounts = await getAccounts();
      await assignDefaultConstants.call(this);

      // deploy and configure minter filter and minter
      ({
        genArt721Core: this.genArt721Core,
        minterFilter: this.minterFilter,
        randomizer: this.randomizer,
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

    describe("MinterUpdated", function () {
      it("emits MinterUpdated when being updated", async function () {
        // emits expected event arg(s)
        await expect(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .updateMinterContract(this.accounts.deployer.address)
        )
          .to.emit(this.genArt721Core, "MinterUpdated")
          .withArgs(this.accounts.deployer.address);
      });
    });

    describe("PlatformUpdated", function () {
      it("deployment events (nextProjectId, etc.)", async function () {
        // typical expect event helper doesn't work for deploy event
        const contractFactory = await ethers.getContractFactory(
          coreContractName
        );
        // it is OK that this construction addresses aren't particularly valid
        // addresses for the purposes of this test
        let tx;
        if (coreContractName.includes("GenArt721CoreV3_Engine")) {
          const engineRegistryFactory = await ethers.getContractFactory(
            "EngineRegistryV0"
          );
          const engineRegistry = await engineRegistryFactory
            .connect(this.accounts.deployer)
            .deploy();
          tx = await contractFactory.connect(this.accounts.deployer).deploy(
            "name",
            "symbol",
            this.accounts.additional.address,
            this.accounts.additional.address,
            this.accounts.additional.address,
            this.accounts.additional.address,
            365,
            false,
            engineRegistry.address // Note: important to use a real engine registry
          );
          const receipt = await tx.deployTransaction.wait();
          const registrationLog = receipt.logs[receipt.logs.length - 1];
          // expect "ContractRegistered" event as log 0
          await expect(registrationLog.topics[0]).to.be.equal(
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes(
                "ContractRegistered(address,bytes32,bytes32)"
              )
            )
          );
          // expect field to be address of registered contract as log 1
          await expect(
            hexDataSlice(registrationLog.topics[1], 12).toLowerCase()
          ).to.be.equal(tx.address.toLowerCase());
          console.log(registrationLog.topics);
          // target event is in the second-to-last log,
          // given that engine registry event comes before it
          const targetLog = receipt.logs[receipt.logs.length - 2];
          // expect "PlatformUpdated" event as log 0
          await expect(targetLog.topics[0]).to.be.equal(
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes("PlatformUpdated(bytes32)")
            )
          );
          // expect field to be bytes32 of "nextProjectId" as log 1
          await expect(targetLog.topics[1]).to.be.equal(
            ethers.utils.formatBytes32String("nextProjectId")
          );
        } else {
          tx = await contractFactory
            .connect(this.accounts.deployer)
            .deploy(
              "name",
              "symbol",
              this.accounts.additional.address,
              constants.ZERO_ADDRESS,
              365
            );
          const receipt = await tx.deployTransaction.wait();
          // target event is the last log
          const targetLog = receipt.logs[receipt.logs.length - 1];
          // expect "PlatformUpdated" event as log 0
          await expect(targetLog.topics[0]).to.be.equal(
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes("PlatformUpdated(bytes32)")
            )
          );
          // expect field to be bytes32 of "nextProjectId" as log 1
          await expect(targetLog.topics[1]).to.be.equal(
            ethers.utils.formatBytes32String("nextProjectId")
          );
        }
      });

      it("emits {artblocksSecondary,provider}SalesAddress", async function () {
        if (coreContractName.includes("GenArt721CoreV3_Engine")) {
          // emits expected event arg(s)
          await expect(
            this.genArt721Core
              .connect(this.accounts.deployer)
              .updateProviderSalesAddresses(
                this.accounts.deployer2.address,
                this.accounts.deployer2.address,
                this.accounts.deployer2.address,
                this.accounts.deployer2.address
              )
          )
            .to.emit(this.genArt721Core, "PlatformUpdated")
            .withArgs(
              ethers.utils.formatBytes32String("providerSalesAddresses")
            );
        } else {
          // emits expected event arg(s)
          await expect(
            this.genArt721Core
              .connect(this.accounts.deployer)
              .updateArtblocksSecondarySalesAddress(
                this.accounts.artist.address
              )
          )
            .to.emit(this.genArt721Core, "PlatformUpdated")
            .withArgs(
              ethers.utils.formatBytes32String("artblocksSecondarySalesAddress")
            );
        }
      });

      it("emits 'randomizerAddress'", async function () {
        // emits expected event arg(s)
        await expect(
          // it is OK that this randomizer address isn't a particularly valid
          // address for the purposes of this test
          this.genArt721Core
            .connect(this.accounts.deployer)
            .updateRandomizerAddress(this.accounts.additional.address)
        )
          .to.emit(this.genArt721Core, "PlatformUpdated")
          .withArgs(ethers.utils.formatBytes32String("randomizerAddress"));
      });

      it("emits 'curationRegistryAddress'", async function () {
        if (coreContractName === "GenArt721CoreV3_Explorations") {
          // action not supported by this core version
          await expectRevert(
            this.genArt721Core
              .connect(this.accounts.deployer)
              .updateArtblocksCurationRegistryAddress(
                this.accounts.additional.address
              ),
            "Action not supported"
          );
        } else if (coreContractName === "GenArt721CoreV3") {
          // emits expected event arg(s)
          await expect(
            this.genArt721Core
              .connect(this.accounts.deployer)
              .updateArtblocksCurationRegistryAddress(
                this.accounts.artist.address
              )
          )
            .to.emit(this.genArt721Core, "PlatformUpdated")
            .withArgs(
              ethers.utils.formatBytes32String("curationRegistryAddress")
            );
        } else if (coreContractName.includes("GenArt721CoreV3_Engine")) {
          // Do nothing.
          // This core contract variant doesn't support this interface component.
        } else {
          throw new Error("Unexpected core contract name");
        }
      });

      it("emits 'dependencyRegistryAddress'", async function () {
        // emits expected event arg(s)
        await expect(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .updateArtblocksDependencyRegistryAddress(
              this.accounts.artist.address
            )
        )
          .to.emit(this.genArt721Core, "PlatformUpdated")
          .withArgs(
            ethers.utils.formatBytes32String("dependencyRegistryAddress")
          );
      });

      it("emits '{artblocks,provider}PrimaryPercentage'", async function () {
        if (coreContractName.includes("GenArt721CoreV3_Engine")) {
          // emits expected event arg(s)
          await expect(
            this.genArt721Core
              .connect(this.accounts.deployer)
              .updateProviderPrimarySalesPercentages(11, 11)
          )
            .to.emit(this.genArt721Core, "PlatformUpdated")
            .withArgs(
              ethers.utils.formatBytes32String("providerPrimaryPercentages")
            );
        } else {
          // emits expected event arg(s)
          await expect(
            this.genArt721Core
              .connect(this.accounts.deployer)
              .updateArtblocksPrimarySalesPercentage(11)
          )
            .to.emit(this.genArt721Core, "PlatformUpdated")
            .withArgs(
              ethers.utils.formatBytes32String("artblocksPrimaryPercentage")
            );
        }
      });

      it("emits '{artblocks,provider}SecondaryBPS'", async function () {
        if (coreContractName.includes("GenArt721CoreV3_Engine")) {
          // emits expected event arg(s)
          await expect(
            this.genArt721Core
              .connect(this.accounts.deployer)
              .updateProviderSecondarySalesBPS(240, 240)
          )
            .to.emit(this.genArt721Core, "PlatformUpdated")
            .withArgs(ethers.utils.formatBytes32String("providerSecondaryBPS"));
        } else {
          // emits expected event arg(s)
          await expect(
            this.genArt721Core
              .connect(this.accounts.deployer)
              .updateArtblocksSecondarySalesBPS(240)
          )
            .to.emit(this.genArt721Core, "PlatformUpdated")
            .withArgs(
              ethers.utils.formatBytes32String("artblocksSecondaryBPS")
            );
        }
      });

      it("emits 'newProjectsForbidden'", async function () {
        // emits expected event arg(s)
        await expect(
          this.genArt721Core.connect(this.accounts.deployer).forbidNewProjects()
        )
          .to.emit(this.genArt721Core, "PlatformUpdated")
          .withArgs(ethers.utils.formatBytes32String("newProjectsForbidden"));
      });

      it("emits `defaultBaseURI`", async function () {
        // emits expected event arg(s)
        await expect(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .updateDefaultBaseURI("https://newbaseuri.com/token/")
        )
          .to.emit(this.genArt721Core, "PlatformUpdated")
          .withArgs(ethers.utils.formatBytes32String("defaultBaseURI"));
      });
    });

    describe("ProjectUpdated", function () {
      it("emits completed", async function () {
        await mintProjectUntilRemaining.call(
          this,
          this.projectZero,
          this.accounts.artist,
          1
        );
        // emits expected event arg(s) when completing project
        await expect(
          this.minter.connect(this.accounts.artist).purchase(this.projectZero)
        )
          .to.emit(this.genArt721Core, "ProjectUpdated")
          .withArgs(
            this.projectZero,
            ethers.utils.formatBytes32String("completed")
          );
      });

      it("emits active", async function () {
        // emits expected event arg(s) when toggling project inactive
        await expect(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .toggleProjectIsActive(this.projectZero)
        )
          .to.emit(this.genArt721Core, "ProjectUpdated")
          .withArgs(
            this.projectZero,
            ethers.utils.formatBytes32String("active")
          );
        // emits expected event arg(s) when toggling project active
        await expect(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .toggleProjectIsActive(this.projectZero)
        )
          .to.emit(this.genArt721Core, "ProjectUpdated")
          .withArgs(
            this.projectZero,
            ethers.utils.formatBytes32String("active")
          );
      });

      it("emits artistAddress", async function () {
        // emits expected event arg(s)
        await expect(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .updateProjectArtistAddress(
              this.projectZero,
              this.accounts.artist2.address
            )
        )
          .to.emit(this.genArt721Core, "ProjectUpdated")
          .withArgs(
            this.projectZero,
            ethers.utils.formatBytes32String("artistAddress")
          );
      });

      it("emits paused", async function () {
        // emits expected event arg(s)
        await expect(
          this.genArt721Core
            .connect(this.accounts.artist)
            .toggleProjectIsPaused(this.projectZero)
        )
          .to.emit(this.genArt721Core, "ProjectUpdated")
          .withArgs(
            this.projectZero,
            ethers.utils.formatBytes32String("paused")
          );
      });

      it("emits created", async function () {
        // emits expected event arg(s)
        await expect(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .addProject("new project", this.accounts.artist.address)
        )
          .to.emit(this.genArt721Core, "ProjectUpdated")
          .withArgs(
            this.projectOne,
            ethers.utils.formatBytes32String("created")
          );
      });

      it("emits name", async function () {
        // emits expected event arg(s)
        await expect(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .updateProjectName(this.projectZero, "new project name")
        )
          .to.emit(this.genArt721Core, "ProjectUpdated")
          .withArgs(this.projectZero, ethers.utils.formatBytes32String("name"));
      });

      it("emits artistName", async function () {
        // emits expected event arg(s)
        await expect(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .updateProjectArtistName(this.projectZero, "new artist name")
        )
          .to.emit(this.genArt721Core, "ProjectUpdated")
          .withArgs(
            this.projectZero,
            ethers.utils.formatBytes32String("artistName")
          );
      });

      it("emits secondaryMarketRoyaltyPercentage", async function () {
        // emits expected event arg(s)
        await expect(
          this.genArt721Core
            .connect(this.accounts.artist)
            .updateProjectSecondaryMarketRoyaltyPercentage(this.projectZero, 10)
        )
          .to.emit(this.genArt721Core, "ProjectUpdated")
          .withArgs(
            this.projectZero,
            ethers.utils.formatBytes32String("royaltyPercentage")
          );
      });

      it("emits description", async function () {
        // emits expected event arg(s)
        await expect(
          this.genArt721Core
            .connect(this.accounts.artist)
            .updateProjectDescription(this.projectZero, "new description")
        )
          .to.emit(this.genArt721Core, "ProjectUpdated")
          .withArgs(
            this.projectZero,
            ethers.utils.formatBytes32String("description")
          );
      });

      it("emits website", async function () {
        // emits expected event arg(s)
        await expect(
          this.genArt721Core
            .connect(this.accounts.artist)
            .updateProjectWebsite(this.projectZero, "new website")
        )
          .to.emit(this.genArt721Core, "ProjectUpdated")
          .withArgs(
            this.projectZero,
            ethers.utils.formatBytes32String("website")
          );
      });

      it("emits license", async function () {
        // emits expected event arg(s)
        await expect(
          this.genArt721Core
            .connect(this.accounts.artist)
            .updateProjectLicense(this.projectZero, "new license")
        )
          .to.emit(this.genArt721Core, "ProjectUpdated")
          .withArgs(
            this.projectZero,
            ethers.utils.formatBytes32String("license")
          );
      });

      it("emits maxInvocations", async function () {
        // emits expected event arg(s)
        await expect(
          this.genArt721Core
            .connect(this.accounts.artist)
            .updateProjectMaxInvocations(this.projectZero, 10)
        )
          .to.emit(this.genArt721Core, "ProjectUpdated")
          .withArgs(
            this.projectZero,
            ethers.utils.formatBytes32String("maxInvocations")
          );
      });

      it("emits script when adding/editing/removing script", async function () {
        // emits expected event arg(s)
        // add script
        await expect(
          this.genArt721Core
            .connect(this.accounts.artist)
            .addProjectScript(this.projectZero, `console.log("hello world")`)
        )
          .to.emit(this.genArt721Core, "ProjectUpdated")
          .withArgs(
            this.projectZero,
            ethers.utils.formatBytes32String("script")
          );
        // edit script
        await expect(
          this.genArt721Core
            .connect(this.accounts.artist)
            .updateProjectScript(
              this.projectZero,
              0,
              `console.log("hello world 2")`
            )
        )
          .to.emit(this.genArt721Core, "ProjectUpdated")
          .withArgs(
            this.projectZero,
            ethers.utils.formatBytes32String("script")
          );
        // remove script
        await expect(
          this.genArt721Core
            .connect(this.accounts.artist)
            .removeProjectLastScript(this.projectZero)
        )
          .to.emit(this.genArt721Core, "ProjectUpdated")
          .withArgs(
            this.projectZero,
            ethers.utils.formatBytes32String("script")
          );
      });

      it("emits scriptType", async function () {
        // emits expected event arg(s)
        await expect(
          this.genArt721Core
            .connect(this.accounts.artist)
            .updateProjectScriptType(
              this.projectZero,
              ethers.utils.formatBytes32String("p5js@v1.2.3")
            )
        )
          .to.emit(this.genArt721Core, "ProjectUpdated")
          .withArgs(
            this.projectZero,
            ethers.utils.formatBytes32String("scriptType")
          );
      });

      it("emits aspectRatio", async function () {
        // emits expected event arg(s)
        await expect(
          this.genArt721Core
            .connect(this.accounts.artist)
            .updateProjectAspectRatio(this.projectZero, "1.77777778")
        )
          .to.emit(this.genArt721Core, "ProjectUpdated")
          .withArgs(
            this.projectZero,
            ethers.utils.formatBytes32String("aspectRatio")
          );
      });

      it("emits baseURI", async function () {
        // emits expected event arg(s)
        await expect(
          this.genArt721Core
            .connect(this.accounts.artist)
            .updateProjectBaseURI(
              this.projectZero,
              "https://newbaseuri.com/token/"
            )
        )
          .to.emit(this.genArt721Core, "ProjectUpdated")
          .withArgs(
            this.projectZero,
            ethers.utils.formatBytes32String("baseURI")
          );
      });
    });
  });
}
