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
} from "../../util/common";

/**
 * Tests regarding view functions for V3 core.
 */
describe("GenArt721CoreV3", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this);

    const randomizerFactory = await ethers.getContractFactory(
      "BasicRandomizer"
    );
    this.randomizer = await randomizerFactory.deploy();
    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV3");
    this.genArt721Core = await artblocksFactory
      .connect(this.accounts.deployer)
      .deploy(this.name, this.symbol, this.randomizer.address);

    // TBD - V3 DOES NOT CURRENTLY HAVE A WORKING MINTER

    // add project
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("name", this.accounts.artist.address);
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectZero);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);
  });

  describe("coreVersion", function () {
    it("returns expected value", async function () {
      const coreVersion = await this.genArt721Core
        .connect(this.accounts.deployer)
        .coreVersion();
      expect(coreVersion).to.be.equal("v3.0.0");
    });
  });

  describe("coreType", function () {
    it("returns expected value", async function () {
      const coreType = await this.genArt721Core
        .connect(this.accounts.deployer)
        .coreType();
      expect(coreType).to.be.equal("GenArt721CoreV3");
    });
  });

  describe("projectScriptDetails", function () {
    it("returns expected default values", async function () {
      const projectScriptDetails = await this.genArt721Core
        .connect(this.accounts.deployer)
        .projectScriptDetails(this.projectZero);
      expect(projectScriptDetails.scriptType).to.be.equal("");
      expect(projectScriptDetails.scriptTypeVersion).to.be.equal("");
      expect(projectScriptDetails.aspectRatio).to.be.equal("");
      expect(projectScriptDetails.ipfsHash).to.be.equal("");
      expect(projectScriptDetails.scriptCount).to.be.equal(0);
    });

    it("returns expected populated values", async function () {
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectScriptType(this.projectZero, "p5js", "1.0.0");
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectAspectRatio(this.projectZero, "1.77777778");
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectIpfsHash(this.projectZero, "0x12345");
      await this.genArt721Core
        .connect(this.accounts.artist)
        .addProjectScript(this.projectZero, "if(true){}");

      const projectScriptDetails = await this.genArt721Core
        .connect(this.accounts.deployer)
        .projectScriptDetails(this.projectZero);
      expect(projectScriptDetails.scriptType).to.be.equal("p5js");
      expect(projectScriptDetails.scriptTypeVersion).to.be.equal("1.0.0");
      expect(projectScriptDetails.aspectRatio).to.be.equal("1.77777778");
      expect(projectScriptDetails.ipfsHash).to.be.equal("0x12345");
      expect(projectScriptDetails.scriptCount).to.be.equal(1);
    });
  });

  describe("projectStateData", function () {
    it("returns expected values", async function () {
      const projectStateData = await this.genArt721Core
        .connect(this.accounts.deployer)
        .projectStateData(this.projectZero);
      expect(projectStateData.invocations).to.be.equal(0);
      expect(projectStateData.maxInvocations).to.be.equal(15);
      expect(projectStateData.active).to.be.true;
      expect(projectStateData.paused).to.be.true;
      expect(projectStateData.locked).to.be.false;
    });

    it("returns expected values after unpausing", async function () {
      await this.genArt721Core
        .connect(this.accounts.artist)
        .toggleProjectIsPaused(this.projectZero);
      const projectStateData = await this.genArt721Core
        .connect(this.accounts.deployer)
        .projectStateData(this.projectZero);
      expect(projectStateData.invocations).to.be.equal(0);
      expect(projectStateData.maxInvocations).to.be.equal(15);
      expect(projectStateData.active).to.be.true;
      expect(projectStateData.paused).to.be.false;
      expect(projectStateData.locked).to.be.false;
    });
  });

  describe("projectDetails", function () {
    it("returns expected default values", async function () {
      const projectDetails = await this.genArt721Core
        .connect(this.accounts.deployer)
        .projectDetails(this.projectZero);
      expect(projectDetails.projectName).to.be.equal("name");
      expect(projectDetails.artist).to.be.equal("");
      expect(projectDetails.description).to.be.equal("");
      expect(projectDetails.website).to.be.equal("");
      expect(projectDetails.license).to.be.equal("");
    });

    it("returns expected values after populating", async function () {
      // artist populates values
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectArtistName(this.projectZero, "artist");
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectDescription(this.projectZero, "description");
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectWebsite(this.projectZero, "website");
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectLicense(this.projectZero, "MIT");

      // check for expected values
      const projectDetails = await this.genArt721Core
        .connect(this.accounts.deployer)
        .projectDetails(this.projectZero);
      expect(projectDetails.projectName).to.be.equal("name");
      expect(projectDetails.artist).to.be.equal("artist");
      expect(projectDetails.description).to.be.equal("description");
      expect(projectDetails.website).to.be.equal("website");
      expect(projectDetails.license).to.be.equal("MIT");
    });
  });

  describe("projectArtistPaymentInfo", function () {
    it("returns expected default values", async function () {
      const projectArtistPaymentInfo = await this.genArt721Core
        .connect(this.accounts.deployer)
        .projectArtistPaymentInfo(this.projectZero);
      expect(projectArtistPaymentInfo.artistAddress).to.be.equal(
        this.accounts.artist.address
      );
      expect(projectArtistPaymentInfo.additionalPayee).to.be.equal(
        constants.ZERO_ADDRESS
      );
      expect(projectArtistPaymentInfo.additionalPayeePercentage).to.be.equal(0);
    });

    it("returns expected values after populating", async function () {
      // artist populates values
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectArtistAddress(
          this.projectZero,
          this.accounts.artist2.address
        );
      await this.genArt721Core
        .connect(this.accounts.artist2)
        .updateProjectAdditionalPayeeInfo(
          this.projectZero,
          this.accounts.additional2.address,
          50
        );

      // check for expected values
      const projectArtistPaymentInfo = await this.genArt721Core
        .connect(this.accounts.deployer)
        .projectArtistPaymentInfo(this.projectZero);
      expect(projectArtistPaymentInfo.artistAddress).to.be.equal(
        this.accounts.artist2.address
      );
      expect(projectArtistPaymentInfo.additionalPayee).to.be.equal(
        this.accounts.additional2.address
      );
      expect(projectArtistPaymentInfo.additionalPayeePercentage).to.be.equal(
        50
      );
    });
  });
});
