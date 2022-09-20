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

/**
 * Tests for V3 core dealing with emitted events
 */
describe("GenArt721CoreV3 Events", async function () {
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
      "GenArt721CoreV3",
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
      expect(
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateMinterContract(this.accounts.deployer.address)
      )
        .to.emit(this.genArt721Core, "MinterUpdated")
        .withArgs(this.accounts.deployer.address);
    });
  });

  describe("PlatformUpdated", function () {
    it("emits nextProjectId", async function () {
      // typical expect event helper doesn't work for deploy event
      const contractFactory = await ethers.getContractFactory(
        "GenArt721CoreV3"
      );
      const tx = await contractFactory
        .connect(this.accounts.deployer)
        .deploy(
          "name",
          "symbol",
          constants.ZERO_ADDRESS,
          constants.ZERO_ADDRESS,
          365
        );
      const receipt = await tx.deployTransaction.wait();
      // target event is the last log
      const targetLog = receipt.logs[receipt.logs.length - 1];
      // expect "PlatformUpdated" event as log 0
      expect(targetLog.topics[0]).to.be.equal(
        ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes("PlatformUpdated(bytes32)")
        )
      );
      // expect field to be bytes32 of "nextProjectId" as log 1
      expect(targetLog.topics[1]).to.be.equal(
        ethers.utils.formatBytes32String("nextProjectId")
      );
    });

    it("emits artblocksSecondarySalesAddress", async function () {
      // emits expected event arg(s)
      expect(
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateArtblocksSecondarySalesAddress(this.accounts.artist.address)
      )
        .to.emit(this.genArt721Core, "PlatformUpdated")
        .withArgs(
          ethers.utils.formatBytes32String("artblocksSecondarySalesAddress")
        );
    });

    it("emits 'randomizerAddress'", async function () {
      // emits expected event arg(s)
      expect(
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateRandomizerAddress(this.accounts.artist.address)
      )
        .to.emit(this.genArt721Core, "PlatformUpdated")
        .withArgs(ethers.utils.formatBytes32String("randomizerAddress"));
    });

    it("emits 'curationRegistryAddress'", async function () {
      // emits expected event arg(s)
      expect(
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateArtblocksCurationRegistryAddress(this.accounts.artist.address)
      )
        .to.emit(this.genArt721Core, "PlatformUpdated")
        .withArgs(ethers.utils.formatBytes32String("curationRegistryAddress"));
    });

    it("emits 'dependencyRegistryAddress'", async function () {
      // emits expected event arg(s)
      expect(
        await this.genArt721Core
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

    it("emits 'artblocksPrimaryPercentage'", async function () {
      // emits expected event arg(s)
      expect(
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateArtblocksPrimarySalesPercentage(11)
      )
        .to.emit(this.genArt721Core, "PlatformUpdated")
        .withArgs(
          ethers.utils.formatBytes32String("artblocksPrimaryPercentage")
        );
    });

    it("emits 'artblocksSecondaryBPS'", async function () {
      // emits expected event arg(s)
      expect(
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateArtblocksSecondarySalesBPS(240)
      )
        .to.emit(this.genArt721Core, "PlatformUpdated")
        .withArgs(ethers.utils.formatBytes32String("artblocksSecondaryBPS"));
    });

    it("emits 'newProjectsForbidden'", async function () {
      // emits expected event arg(s)
      expect(
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .forbidNewProjects()
      )
        .to.emit(this.genArt721Core, "PlatformUpdated")
        .withArgs(ethers.utils.formatBytes32String("newProjectsForbidden"));
    });

    it("emits `defaultBaseURI`", async function () {
      // emits expected event arg(s)
      expect(
        await this.genArt721Core
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
      expect(
        await this.minter
          .connect(this.accounts.artist)
          .purchase(this.projectZero)
      )
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(
          this.projectZero,
          ethers.utils.formatBytes32String("completed")
        );
    });

    it("emits active", async function () {
      // emits expected event arg(s) when toggling project inactive
      expect(
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .toggleProjectIsActive(this.projectZero)
      )
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(this.projectZero, ethers.utils.formatBytes32String("active"));
      // emits expected event arg(s) when toggling project active
      expect(
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .toggleProjectIsActive(this.projectZero)
      )
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(this.projectZero, ethers.utils.formatBytes32String("active"));
    });

    it("emits artistAddress", async function () {
      // emits expected event arg(s)
      expect(
        await this.genArt721Core
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
      expect(
        await this.genArt721Core
          .connect(this.accounts.artist)
          .toggleProjectIsPaused(this.projectZero)
      )
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(this.projectZero, ethers.utils.formatBytes32String("paused"));
    });

    it("emits created", async function () {
      // emits expected event arg(s)
      expect(
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .addProject("new project", this.accounts.artist.address)
      )
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(this.projectOne, ethers.utils.formatBytes32String("created"));
    });

    it("emits name", async function () {
      // emits expected event arg(s)
      expect(
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProjectName(this.projectZero, "new project name")
      )
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(this.projectZero, ethers.utils.formatBytes32String("name"));
    });

    it("emits artistName", async function () {
      // emits expected event arg(s)
      expect(
        await this.genArt721Core
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
      expect(
        await this.genArt721Core
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
      expect(
        await this.genArt721Core
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
      expect(
        await this.genArt721Core
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
      expect(
        await this.genArt721Core
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
      expect(
        await this.genArt721Core
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
      expect(
        await this.genArt721Core
          .connect(this.accounts.artist)
          .addProjectScript(this.projectZero, `console.log("hello world")`)
      )
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(this.projectZero, ethers.utils.formatBytes32String("script"));
      // edit script
      expect(
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectScript(
            this.projectZero,
            0,
            `console.log("hello world 2")`
          )
      )
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(this.projectZero, ethers.utils.formatBytes32String("script"));
      // remove script
      expect(
        await this.genArt721Core
          .connect(this.accounts.artist)
          .removeProjectLastScript(this.projectZero)
      )
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(this.projectZero, ethers.utils.formatBytes32String("script"));
    });

    it("emits scriptType", async function () {
      // emits expected event arg(s)
      expect(
        await this.genArt721Core
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
      expect(
        await this.genArt721Core
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
      expect(
        await this.genArt721Core
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
