import { Coder } from "@ethersproject/abi/lib/coders/abstract-coder";
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
} from "../util/common";
import { GenArt721MinterV1V2_Common } from "./GenArt721CoreV1V2.common";

/**
 * These tests are intended to check integration of the MinterFilter suite with
 * the V2 PRTNR core contract.
 * Some basic core tests, and basic functional tests to ensure purchase
 * does in fact mint tokens to purchaser.
 */
describe("GenArt721CoreV2WithEvents_Integration", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this);
    // deploy and configure minter filter and minter
    ({ genArt721Core: this.genArt721Core, minterFilter: this.minterFilter } =
      await deployCoreWithMinterFilter.call(
        this,
        "GenArt721CoreV2WithEvents",
        "MinterFilterV0"
      ));
    this.minter = await deployAndGet.call(this, "MinterSetPriceV1", [
      this.genArt721Core.address,
      this.minterFilter.address,
    ]);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .addApprovedMinter(this.minter.address);
    // add project
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("name", this.accounts.artist.address, 0);
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectZero);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);
    // set project's minter and price
    await this.minter
      .connect(this.accounts.artist)
      .updatePricePerTokenInWei(this.projectZero, this.pricePerTokenInWei);
    await this.minterFilter
      .connect(this.accounts.artist)
      .setMinterForProject(this.projectZero, this.minter.address);
    // get project's info
    this.projectZeroInfo = await this.genArt721Core.projectTokenInfo(
      this.projectZero
    );
  });

  describe("common tests", async function () {
    GenArt721MinterV1V2_Common();
  });

  describe("testing PlatformUpdated events", async function () {
    it("should emit PlatformUpdated event when admin is updated", async function () {
      expect(
        await this.genArt721Core.updateAdmin(
          "0x0000000000000000000000000000000000000000"
        )
      )
        .to.emit(this.genArt721Core, "PlatformUpdated")
        .withArgs(ethers.utils.formatBytes32String("admin"));
    });

    it("should emit PlatformUpdated event when renderProviderAddress is updated", async function () {
      expect(
        await this.genArt721Core.updateRenderProviderAddress(
          "0x0000000000000000000000000000000000000000"
        )
      )
        .to.emit(this.genArt721Core, "PlatformUpdated")
        .withArgs(ethers.utils.formatBytes32String("renderProviderAddress"));
    });

    it("should emit PlatformUpdated event when renderProviderPercentage is updated", async function () {
      expect(await this.genArt721Core.updateRenderProviderPercentage(20))
        .to.emit(this.genArt721Core, "PlatformUpdated")
        .withArgs(ethers.utils.formatBytes32String("renderProviderPercentage"));
    });

    it("should emit PlatformUpdated event when randomizerAddress is updated", async function () {
      expect(
        await this.genArt721Core.updateRandomizerAddress(
          "0x0000000000000000000000000000000000000000"
        )
      )
        .to.emit(this.genArt721Core, "PlatformUpdated")
        .withArgs(ethers.utils.formatBytes32String("randomizerAddress"));
    });
  });

  describe("testing ProjectUpdated events", async function () {
    it("should emit ProjectUpdated event when toggleProjectIsLocked is called", async function () {
      expect(await this.genArt721Core.toggleProjectIsLocked(0))
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(0, ethers.utils.formatBytes32String("locked"));
    });

    it("should emit ProjectUpdated event when toggleProjectIsActive is called", async function () {
      expect(await this.genArt721Core.toggleProjectIsActive(0))
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(0, ethers.utils.formatBytes32String("active"));
    });

    it("should emit ProjectUpdated event when updateProjectArtistAddress is called", async function () {
      expect(
        await this.genArt721Core.updateProjectArtistAddress(
          0,
          "0x0000000000000000000000000000000000000000"
        )
      )
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(0, ethers.utils.formatBytes32String("artistAddress"));
    });

    it("should emit ProjectUpdated event when toggleProjectIsPaused is called", async function () {
      expect(
        await this.genArt721Core
          .connect(this.accounts.artist)
          .toggleProjectIsPaused(0)
      )
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(0, ethers.utils.formatBytes32String("paused"));
    });

    it("should emit ProjectUpdated event when addProject is called", async function () {
      expect(
        await this.genArt721Core.addProject(
          "test",
          this.accounts.artist.address,
          0
        )
      )
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(1, ethers.utils.formatBytes32String("created"));
    });

    it("should emit ProjectUpdated event when updateProjectCurrencyInfo is called", async function () {
      expect(
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectCurrencyInfo(
            0,
            "test",
            "0x0000000000000000000000000000000000000000"
          )
      )
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(0, ethers.utils.formatBytes32String("currencyInfo"));
    });

    it("should emit ProjectUpdated event when updateProjectPricePerTokenInWei is called", async function () {
      expect(
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectPricePerTokenInWei(0, 0)
      )
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(0, ethers.utils.formatBytes32String("pricePerTokenInWei"));
    });

    it("should emit ProjectUpdated event when updateProjectName is called", async function () {
      expect(await this.genArt721Core.updateProjectName(0, "test"))
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(0, ethers.utils.formatBytes32String("name"));
    });

    it("should emit ProjectUpdated event when updateProjectArtistName is called", async function () {
      expect(await this.genArt721Core.updateProjectArtistName(0, "test"))
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(0, ethers.utils.formatBytes32String("artistName"));
    });

    it("should emit ProjectUpdated event when updateProjectAdditionalPayeeInfo is called", async function () {
      expect(
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectAdditionalPayeeInfo(
            0,
            "0x0000000000000000000000000000000000000000",
            25
          )
      )
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(0, ethers.utils.formatBytes32String("additionalPayeeInfo"));
    });

    it("should emit ProjectUpdated event when updateProjectSecondaryMarketRoyaltyPercentage is called", async function () {
      expect(
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectSecondaryMarketRoyaltyPercentage(0, 25)
      )
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(0, ethers.utils.formatBytes32String("royaltyPercentage"));
    });

    it("should emit ProjectUpdated event when updateProjectDescription is called", async function () {
      expect(
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectDescription(0, "test")
      )
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(0, ethers.utils.formatBytes32String("description"));
    });

    it("should emit ProjectUpdated event when updateProjectWebsite is called", async function () {
      expect(
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectWebsite(0, "test")
      )
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(0, ethers.utils.formatBytes32String("website"));
    });

    it("should emit ProjectUpdated event when updateProjectLicense is called", async function () {
      expect(await this.genArt721Core.updateProjectLicense(0, "test"))
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(0, ethers.utils.formatBytes32String("license"));
    });

    it("should emit ProjectUpdated event when updateProjectMaxInvocations is called", async function () {
      expect(
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectMaxInvocations(0, 25)
      )
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(0, ethers.utils.formatBytes32String("maxInvocations"));
    });

    it("should emit ProjectUpdated event when addProjectScript is called", async function () {
      expect(await this.genArt721Core.addProjectScript(0, "test"))
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(0, ethers.utils.formatBytes32String("script"));
    });

    it("should emit ProjectUpdated event when updateProjectScript is called", async function () {
      await this.genArt721Core.addProjectScript(0, "test");
      expect(await this.genArt721Core.updateProjectScript(0, 0, "test"))
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(0, ethers.utils.formatBytes32String("script"));
    });

    it("should emit ProjectUpdated event when removeProjectLastScript is called", async function () {
      await this.genArt721Core.addProjectScript(0, "test");
      expect(await this.genArt721Core.removeProjectLastScript(0))
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(0, ethers.utils.formatBytes32String("script"));
    });

    it("should emit ProjectUpdated event when updateProjectScriptJSON is called", async function () {
      expect(await this.genArt721Core.updateProjectScriptJSON(0, "test"))
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(0, ethers.utils.formatBytes32String("scriptJSON"));
    });

    it("should emit ProjectUpdated event when updateProjectIpfsHash is called", async function () {
      expect(await this.genArt721Core.updateProjectIpfsHash(0, "test"))
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(0, ethers.utils.formatBytes32String("ipfsHash"));
    });

    it("should emit ProjectUpdated event when updateProjectBaseURI is called", async function () {
      expect(
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectBaseURI(0, "test")
      )
        .to.emit(this.genArt721Core, "ProjectUpdated")
        .withArgs(0, ethers.utils.formatBytes32String("baseURI"));
    });
  });

  describe("testing AllowlistUpdated events", async function () {
    it("should emit AllowlistUpdated event addWhitelisted is called", async function () {
      expect(
        await this.genArt721Core.addWhitelisted(
          "0x0000000000000000000000000000000000000000"
        )
      )
        .to.emit(this.genArt721Core, "AllowlistUpdated")
        .withArgs("0x0000000000000000000000000000000000000000", true);
    });

    it("should emit AllowlistUpdated event removeWhitelisted is called", async function () {
      expect(
        await this.genArt721Core.removeWhitelisted(
          "0x0000000000000000000000000000000000000000"
        )
      )
        .to.emit(this.genArt721Core, "AllowlistUpdated")
        .withArgs("0x0000000000000000000000000000000000000000", false);
    });
  });

  describe("testing MintAllowlistUpdated events", async function () {
    it("should emit MintAllowlistUpdated event addMintWhitelisted is called", async function () {
      expect(
        await this.genArt721Core.addMintWhitelisted(
          "0x0000000000000000000000000000000000000000"
        )
      )
        .to.emit(this.genArt721Core, "MintAllowlistUpdated")
        .withArgs("0x0000000000000000000000000000000000000000", true);
    });
    it("should emit MintAllowlistUpdated event removeMintWhitelisted is called", async function () {
      expect(
        await this.genArt721Core.removeMintWhitelisted(
          "0x0000000000000000000000000000000000000000"
        )
      )
        .to.emit(this.genArt721Core, "MintAllowlistUpdated")
        .withArgs("0x0000000000000000000000000000000000000000", false);
    });
  });
});
