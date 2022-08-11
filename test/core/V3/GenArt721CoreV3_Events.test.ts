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
    it("emits artblocksAddress", async function () {
      // emits expected event arg(s)
      expect(
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateArtblocksAddress(this.accounts.artist.address)
      )
        .to.emit(this.genArt721Core, "PlatformUpdated")
        .withArgs(ethers.utils.formatBytes32String("artblocksAddress"));
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

    it("emits 'artblocksPercentage'", async function () {
      // emits expected event arg(s)
      expect(
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateArtblocksPercentage(11)
      )
        .to.emit(this.genArt721Core, "PlatformUpdated")
        .withArgs(ethers.utils.formatBytes32String("artblocksPercentage"));
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
          .updateProjectScriptType(this.projectZero, "p5js", "v1.2.3")
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

    it("emits ipfsHash", async function () {
      // emits expected event arg(s)
      expect(
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectIpfsHash(this.projectZero, "ipfsHash")
      )
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(
          this.projectZero,
          ethers.utils.formatBytes32String("ipfsHash")
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
