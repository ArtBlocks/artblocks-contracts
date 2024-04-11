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
      } = await deployCoreWithMinterFilter(
        config,
        coreContractName,
        "MinterFilterV1",
        true
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

    describe("MinterUpdated", function () {
      it("emits MinterUpdated when being updated", async function () {
        const config = await loadFixture(_beforeEach);
        // emits expected event arg(s)
        await expect(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateMinterContract(config.accounts.deployer.address)
        )
          .to.emit(config.genArt721Core, "MinterUpdated")
          .withArgs(config.accounts.deployer.address);
      });
    });

    describe("PlatformUpdated", function () {
      it("deployment events (nextProjectId, etc.)", async function () {
        const config = await loadFixture(_beforeEach);

        // Note that for testing purposes, we deploy a new version of the library,
        // but in production we would use the same library deployment for all contracts
        const libraryFactory = await ethers.getContractFactory(
          "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader"
        );
        const library = await libraryFactory
          .connect(config.accounts.deployer)
          .deploy(/* no args for library ever */);

        let libraries = {
          libraries: {
            BytecodeStorageReader: library.address,
          },
        };
        if (coreContractName.endsWith("Flex")) {
          const flexLibraryFactory = await ethers.getContractFactory(
            "V3FlexLib",
            {
              libraries: { BytecodeStorageReader: library.address },
            }
          );
          const flexLibrary = await flexLibraryFactory
            .connect(config.accounts.deployer)
            .deploy(/* no args for library ever */);
          libraries.libraries.V3FlexLib = flexLibrary.address;
        }

        // Deploy actual contract (with library linked)
        const coreContractFactory = await ethers.getContractFactory(
          coreContractName,
          {
            ...libraries,
          }
        );
        // it is OK that config construction addresses aren't particularly valid
        // addresses for the purposes of config test
        let tx;
        if (coreContractName.includes("GenArt721CoreV3_Engine")) {
          const engineRegistryFactory =
            await ethers.getContractFactory("EngineRegistryV0");
          const engineRegistry = await engineRegistryFactory
            .connect(config.accounts.deployer)
            .deploy();
          tx = await coreContractFactory
            .connect(config.accounts.deployer)
            .deploy(
              "name",
              "symbol",
              config.accounts.additional.address,
              config.accounts.additional.address,
              config.accounts.additional.address,
              config.accounts.additional.address,
              365,
              false
            );
          const receipt = await tx.deployTransaction.wait();
          // target event is in the last log
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
        } else {
          tx = await coreContractFactory
            .connect(config.accounts.deployer)
            .deploy(
              "name",
              "symbol",
              config.accounts.additional.address,
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
        const config = await loadFixture(_beforeEach);
        if (coreContractName.includes("GenArt721CoreV3_Engine")) {
          // emits expected event arg(s)
          await expect(
            config.genArt721Core
              .connect(config.accounts.deployer)
              .updateProviderSalesAddresses(
                config.accounts.deployer2.address,
                config.accounts.deployer2.address,
                config.accounts.deployer2.address,
                config.accounts.deployer2.address
              )
          )
            .to.emit(config.genArt721Core, "PlatformUpdated")
            .withArgs(
              ethers.utils.formatBytes32String("providerSalesAddresses")
            );
        } else {
          // emits expected event arg(s)
          await expect(
            config.genArt721Core
              .connect(config.accounts.deployer)
              .updateArtblocksSecondarySalesAddress(
                config.accounts.artist.address
              )
          )
            .to.emit(config.genArt721Core, "PlatformUpdated")
            .withArgs(
              ethers.utils.formatBytes32String("artblocksSecondarySalesAddress")
            );
        }
      });

      it("emits 'randomizerAddress'", async function () {
        const config = await loadFixture(_beforeEach);
        // emits expected event arg(s)
        await expect(
          // it is OK that config randomizer address isn't a particularly valid
          // address for the purposes of config test
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateRandomizerAddress(config.accounts.additional.address)
        )
          .to.emit(config.genArt721Core, "PlatformUpdated")
          .withArgs(ethers.utils.formatBytes32String("randomizerAddress"));
      });

      it("emits 'curationRegistryAddress'", async function () {
        const config = await loadFixture(_beforeEach);
        if (coreContractName === "GenArt721CoreV3_Explorations") {
          // action not supported by config core version
          await expectRevert(
            config.genArt721Core
              .connect(config.accounts.deployer)
              .updateArtblocksCurationRegistryAddress(
                config.accounts.additional.address
              ),
            "Action not supported"
          );
        } else if (coreContractName === "GenArt721CoreV3") {
          // emits expected event arg(s)
          await expect(
            config.genArt721Core
              .connect(config.accounts.deployer)
              .updateArtblocksCurationRegistryAddress(
                config.accounts.artist.address
              )
          )
            .to.emit(config.genArt721Core, "PlatformUpdated")
            .withArgs(
              ethers.utils.formatBytes32String("curationRegistryAddress")
            );
        } else if (coreContractName.includes("GenArt721CoreV3_Engine")) {
          // Do nothing.
          // This core contract variant doesn't support config interface component.
        } else {
          throw new Error("Unexpected core contract name");
        }
      });

      it("emits 'onChainGeneratorAddress'", async function () {
        const config = await loadFixture(_beforeEach);
        // emits expected event arg(s)
        await expect(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateArtblocksOnChainGeneratorAddress(
              config.accounts.artist.address
            )
        )
          .to.emit(config.genArt721Core, "PlatformUpdated")
          .withArgs(
            ethers.utils.formatBytes32String("onChainGeneratorAddress")
          );
      });

      it("emits 'dependencyRegistryAddress'", async function () {
        const config = await loadFixture(_beforeEach);
        // emits expected event arg(s)
        await expect(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateArtblocksDependencyRegistryAddress(
              config.accounts.artist.address
            )
        )
          .to.emit(config.genArt721Core, "PlatformUpdated")
          .withArgs(
            ethers.utils.formatBytes32String("dependencyRegistryAddress")
          );
      });

      it("emits 'nextCoreContract'", async function () {
        const config = await loadFixture(_beforeEach);
        // emits expected event arg(s)
        await expect(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateNextCoreContract(
              config.accounts.artist.address // dummy address
            )
        )
          .to.emit(config.genArt721Core, "PlatformUpdated")
          .withArgs(ethers.utils.formatBytes32String("nextCoreContract"));
      });

      it("emits '{artblocks,provider}PrimaryPercentage'", async function () {
        const config = await loadFixture(_beforeEach);
        if (coreContractName.includes("GenArt721CoreV3_Engine")) {
          // emits expected event arg(s)
          await expect(
            config.genArt721Core
              .connect(config.accounts.deployer)
              .updateProviderPrimarySalesPercentages(11, 11)
          )
            .to.emit(config.genArt721Core, "PlatformUpdated")
            .withArgs(
              ethers.utils.formatBytes32String("providerPrimaryPercentages")
            );
        } else {
          // emits expected event arg(s)
          await expect(
            config.genArt721Core
              .connect(config.accounts.deployer)
              .updateArtblocksPrimarySalesPercentage(11)
          )
            .to.emit(config.genArt721Core, "PlatformUpdated")
            .withArgs(
              ethers.utils.formatBytes32String("artblocksPrimaryPercentage")
            );
        }
      });

      it("emits '{artblocks,provider}SecondaryBPS'", async function () {
        const config = await loadFixture(_beforeEach);
        if (coreContractName.includes("GenArt721CoreV3_Engine")) {
          // emits expected event arg(s)
          await expect(
            config.genArt721Core
              .connect(config.accounts.deployer)
              .updateProviderSecondarySalesBPS(240, 240)
          )
            .to.emit(config.genArt721Core, "PlatformUpdated")
            .withArgs(ethers.utils.formatBytes32String("providerSecondaryBPS"));
        } else {
          // emits expected event arg(s)
          await expect(
            config.genArt721Core
              .connect(config.accounts.deployer)
              .updateArtblocksSecondarySalesBPS(240)
          )
            .to.emit(config.genArt721Core, "PlatformUpdated")
            .withArgs(
              ethers.utils.formatBytes32String("artblocksSecondaryBPS")
            );
        }
      });

      it("emits 'newProjectsForbidden'", async function () {
        const config = await loadFixture(_beforeEach);
        // emits expected event arg(s)
        await expect(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .forbidNewProjects()
        )
          .to.emit(config.genArt721Core, "PlatformUpdated")
          .withArgs(ethers.utils.formatBytes32String("newProjectsForbidden"));
      });

      it("emits `defaultBaseURI`", async function () {
        const config = await loadFixture(_beforeEach);
        // emits expected event arg(s)
        await expect(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateDefaultBaseURI("https://newbaseuri.com/token/")
        )
          .to.emit(config.genArt721Core, "PlatformUpdated")
          .withArgs(ethers.utils.formatBytes32String("defaultBaseURI"));
      });
    });

    describe("ProjectUpdated", function () {
      it("emits completed", async function () {
        const config = await loadFixture(_beforeEach);
        await mintProjectUntilRemaining(
          config,
          config.projectZero,
          config.accounts.artist,
          1
        );
        // emits expected event arg(s) when completing project
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .purchase(config.projectZero)
        )
          .to.emit(config.genArt721Core, "ProjectUpdated")
          .withArgs(
            config.projectZero,
            ethers.utils.formatBytes32String("completed")
          );
      });

      it("emits active", async function () {
        const config = await loadFixture(_beforeEach);
        // emits expected event arg(s) when toggling project inactive
        await expect(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .toggleProjectIsActive(config.projectZero)
        )
          .to.emit(config.genArt721Core, "ProjectUpdated")
          .withArgs(
            config.projectZero,
            ethers.utils.formatBytes32String("active")
          );
        // emits expected event arg(s) when toggling project active
        await expect(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .toggleProjectIsActive(config.projectZero)
        )
          .to.emit(config.genArt721Core, "ProjectUpdated")
          .withArgs(
            config.projectZero,
            ethers.utils.formatBytes32String("active")
          );
      });

      it("emits artistAddress", async function () {
        const config = await loadFixture(_beforeEach);
        // emits expected event arg(s)
        await expect(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProjectArtistAddress(
              config.projectZero,
              config.accounts.artist2.address
            )
        )
          .to.emit(config.genArt721Core, "ProjectUpdated")
          .withArgs(
            config.projectZero,
            ethers.utils.formatBytes32String("artistAddress")
          );
      });

      it("emits paused", async function () {
        const config = await loadFixture(_beforeEach);
        // emits expected event arg(s)
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .toggleProjectIsPaused(config.projectZero)
        )
          .to.emit(config.genArt721Core, "ProjectUpdated")
          .withArgs(
            config.projectZero,
            ethers.utils.formatBytes32String("paused")
          );
      });

      it("emits created", async function () {
        const config = await loadFixture(_beforeEach);
        // emits expected event arg(s)
        await expect(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .addProject("new project", config.accounts.artist.address)
        )
          .to.emit(config.genArt721Core, "ProjectUpdated")
          .withArgs(
            config.projectOne,
            ethers.utils.formatBytes32String("created")
          );
      });

      it("emits name", async function () {
        const config = await loadFixture(_beforeEach);
        // emits expected event arg(s)
        await expect(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProjectName(config.projectZero, "new project name")
        )
          .to.emit(config.genArt721Core, "ProjectUpdated")
          .withArgs(
            config.projectZero,
            ethers.utils.formatBytes32String("name")
          );
      });

      it("emits artistName", async function () {
        const config = await loadFixture(_beforeEach);
        // emits expected event arg(s)
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectArtistName(config.projectZero, "new artist name")
        )
          .to.emit(config.genArt721Core, "ProjectUpdated")
          .withArgs(
            config.projectZero,
            ethers.utils.formatBytes32String("artistName")
          );
      });

      it("emits secondaryMarketRoyaltyPercentage", async function () {
        const config = await loadFixture(_beforeEach);
        // emits expected event arg(s)
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectSecondaryMarketRoyaltyPercentage(
              config.projectZero,
              10
            )
        )
          .to.emit(config.genArt721Core, "ProjectUpdated")
          .withArgs(
            config.projectZero,
            ethers.utils.formatBytes32String("royaltyPercentage")
          );
      });

      it("emits description", async function () {
        const config = await loadFixture(_beforeEach);
        // emits expected event arg(s)
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectDescription(config.projectZero, "new description")
        )
          .to.emit(config.genArt721Core, "ProjectUpdated")
          .withArgs(
            config.projectZero,
            ethers.utils.formatBytes32String("description")
          );
      });

      it("emits website", async function () {
        const config = await loadFixture(_beforeEach);
        // emits expected event arg(s)
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectWebsite(config.projectZero, "new website")
        )
          .to.emit(config.genArt721Core, "ProjectUpdated")
          .withArgs(
            config.projectZero,
            ethers.utils.formatBytes32String("website")
          );
      });

      it("emits license", async function () {
        const config = await loadFixture(_beforeEach);
        // emits expected event arg(s)
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectLicense(config.projectZero, "new license")
        )
          .to.emit(config.genArt721Core, "ProjectUpdated")
          .withArgs(
            config.projectZero,
            ethers.utils.formatBytes32String("license")
          );
      });

      it("emits maxInvocations", async function () {
        const config = await loadFixture(_beforeEach);
        // emits expected event arg(s)
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectMaxInvocations(config.projectZero, 10)
        )
          .to.emit(config.genArt721Core, "ProjectUpdated")
          .withArgs(
            config.projectZero,
            ethers.utils.formatBytes32String("maxInvocations")
          );
      });

      it("emits script when adding/editing/removing script", async function () {
        const config = await loadFixture(_beforeEach);
        // emits expected event arg(s)
        // add script
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .addProjectScript(config.projectZero, `console.log("hello world")`)
        )
          .to.emit(config.genArt721Core, "ProjectUpdated")
          .withArgs(
            config.projectZero,
            ethers.utils.formatBytes32String("script")
          );
        // edit script
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectScript(
              config.projectZero,
              0,
              `console.log("hello world 2")`
            )
        )
          .to.emit(config.genArt721Core, "ProjectUpdated")
          .withArgs(
            config.projectZero,
            ethers.utils.formatBytes32String("script")
          );
        // remove script
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .removeProjectLastScript(config.projectZero)
        )
          .to.emit(config.genArt721Core, "ProjectUpdated")
          .withArgs(
            config.projectZero,
            ethers.utils.formatBytes32String("script")
          );
      });

      it("emits scriptType", async function () {
        const config = await loadFixture(_beforeEach);
        // emits expected event arg(s)
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectScriptType(
              config.projectZero,
              ethers.utils.formatBytes32String("p5js@v1.2.3")
            )
        )
          .to.emit(config.genArt721Core, "ProjectUpdated")
          .withArgs(
            config.projectZero,
            ethers.utils.formatBytes32String("scriptType")
          );
      });

      it("emits aspectRatio", async function () {
        const config = await loadFixture(_beforeEach);
        // emits expected event arg(s)
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectAspectRatio(config.projectZero, "1.77777778")
        )
          .to.emit(config.genArt721Core, "ProjectUpdated")
          .withArgs(
            config.projectZero,
            ethers.utils.formatBytes32String("aspectRatio")
          );
      });

      it("emits baseURI", async function () {
        const config = await loadFixture(_beforeEach);
        // emits expected event arg(s)
        await expect(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectBaseURI(
              config.projectZero,
              "https://newbaseuri.com/token/"
            )
        )
          .to.emit(config.genArt721Core, "ProjectUpdated")
          .withArgs(
            config.projectZero,
            ethers.utils.formatBytes32String("baseURI")
          );
      });
    });
  });
}
