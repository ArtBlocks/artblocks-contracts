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
describe("GenArt721CoreV3 Views", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this);

    const randomizerFactory = await ethers.getContractFactory(
      "BasicRandomizer"
    );
    this.randomizer = await randomizerFactory.deploy();
    const adminACLFactory = await ethers.getContractFactory(
      "MockAdminACLV0Events"
    );
    this.adminACL = await adminACLFactory.deploy();
    const artblocksFactory = await ethers.getContractFactory("GenArt721CoreV3");
    this.genArt721Core = await artblocksFactory
      .connect(this.accounts.deployer)
      .deploy(
        this.name,
        this.symbol,
        this.randomizer.address,
        this.adminACL.address
      );

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

  describe("ART_BLOCKS_ERC721TOKEN_ADDRESS_V0", function () {
    it("returns expected value", async function () {
      const reference = await this.genArt721Core
        .connect(this.accounts.deployer)
        .ART_BLOCKS_ERC721TOKEN_ADDRESS_V0();
      expect(reference).to.be.equal(
        "0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a"
      );
    });
  });

  describe("ART_BLOCKS_ERC721TOKEN_ADDRESS_V1", function () {
    it("returns expected value", async function () {
      const reference = await this.genArt721Core
        .connect(this.accounts.deployer)
        .ART_BLOCKS_ERC721TOKEN_ADDRESS_V1();
      expect(reference).to.be.equal(
        "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270"
      );
    });
  });

  describe("artblocksCurationRegistryAddress", function () {
    it("returns expected default value", async function () {
      const reference = await this.genArt721Core
        .connect(this.accounts.deployer)
        .artblocksCurationRegistryAddress();
      expect(reference).to.be.equal(constants.ZERO_ADDRESS);
    });

    it("returns expected populated value", async function () {
      // admin set to dummy address
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .updateArtblocksCurationRegistryAddress(
          this.accounts.additional.address
        );
      // expect value to be updated
      const reference = await this.genArt721Core
        .connect(this.accounts.deployer)
        .artblocksCurationRegistryAddress();
      expect(reference).to.be.equal(this.accounts.additional.address);
    });

    it("only allows admin to update value", async function () {
      // expect revert when non-admin attempts to update
      for (const account of [this.accounts.artist, this.accounts.additional]) {
        await expectRevert(
          this.genArt721Core
            .connect(account)
            .updateArtblocksCurationRegistryAddress(
              this.accounts.additional.address
            ),
          "Only Admin ACL allowed"
        );
      }
      // admin allowed to update
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .updateArtblocksCurationRegistryAddress(
          this.accounts.additional.address
        );
    });
  });

  describe("artblocksDependencyRegistryAddress", function () {
    it("returns expected default value", async function () {
      const reference = await this.genArt721Core
        .connect(this.accounts.deployer)
        .artblocksDependencyRegistryAddress();
      expect(reference).to.be.equal(constants.ZERO_ADDRESS);
    });

    it("returns expected populated value", async function () {
      // admin set to dummy address
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .updateArtblocksDependencyRegistryAddress(
          this.accounts.additional.address
        );
      // expect value to be updated
      const reference = await this.genArt721Core
        .connect(this.accounts.deployer)
        .artblocksDependencyRegistryAddress();
      expect(reference).to.be.equal(this.accounts.additional.address);
    });

    it("only allows admin to update value", async function () {
      // expect revert when non-admin attempts to update
      for (const account of [this.accounts.artist, this.accounts.additional]) {
        await expectRevert(
          this.genArt721Core
            .connect(account)
            .updateArtblocksDependencyRegistryAddress(
              this.accounts.additional.address
            ),
          "Only Admin ACL allowed"
        );
      }
      // admin allowed to update
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .updateArtblocksDependencyRegistryAddress(
          this.accounts.additional.address
        );
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
      expect(projectArtistPaymentInfo.additionalPayeePrimarySales).to.be.equal(
        constants.ZERO_ADDRESS
      );
      expect(
        projectArtistPaymentInfo.additionalPayeePrimarySalesPercentage
      ).to.be.equal(0);
      expect(
        projectArtistPaymentInfo.additionalPayeeSecondarySales
      ).to.be.equal(constants.ZERO_ADDRESS);
      expect(
        projectArtistPaymentInfo.additionalPayeeSecondarySalesPercentage
      ).to.be.equal(0);
    });

    it("returns expected values after updating artist payment addresses and splits", async function () {
      const valuesToUpdateTo = [
        this.projectZero,
        this.accounts.artist2.address,
        this.accounts.additional.address,
        50,
        this.accounts.additional2.address,
        51,
      ];
      // artist proposes new values
      await this.genArt721Core
        .connect(this.accounts.artist)
        .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo);
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .adminAcceptArtistAddressesAndSplits(...valuesToUpdateTo);
      // check for expected values
      const projectArtistPaymentInfo = await this.genArt721Core
        .connect(this.accounts.deployer)
        .projectArtistPaymentInfo(this.projectZero);
      expect(projectArtistPaymentInfo.artistAddress).to.be.equal(
        valuesToUpdateTo[1]
      );
      expect(projectArtistPaymentInfo.additionalPayeePrimarySales).to.be.equal(
        valuesToUpdateTo[2]
      );
      expect(
        projectArtistPaymentInfo.additionalPayeePrimarySalesPercentage
      ).to.be.equal(valuesToUpdateTo[3]);
      expect(
        projectArtistPaymentInfo.additionalPayeeSecondarySales
      ).to.be.equal(valuesToUpdateTo[4]);
      expect(
        projectArtistPaymentInfo.additionalPayeeSecondarySalesPercentage
      ).to.be.equal(valuesToUpdateTo[5]);
    });
  });

  describe("getPrimaryRevenueSplits", function () {
    it("returns expected values for projectZero", async function () {
      const revenueSplits = await this.genArt721Core
        .connect(this.accounts.user)
        .getPrimaryRevenueSplits(
          this.projectZero,
          ethers.utils.parseEther("1")
        );
      // expect revenue splits to be properly calculated
      // Art Blocks
      const artblocksAddress = await this.genArt721Core.artblocksAddress();
      expect(revenueSplits.recipients_[2]).to.be.equal(artblocksAddress);
      expect(revenueSplits.revenues_[2]).to.be.equal(
        ethers.utils.parseEther("0.10")
      );
      // Additional Payee
      const additionalPayeePrimarySalesAddress =
        await this.genArt721Core.projectIdToAdditionalPayeePrimarySales(
          this.projectZero
        );
      expect(revenueSplits.recipients_[1]).to.be.equal(
        additionalPayeePrimarySalesAddress
      );
      expect(revenueSplits.revenues_[1]).to.be.equal(
        ethers.utils.parseEther("0")
      );
      // Artist
      const artistAddress = await this.genArt721Core.projectIdToArtistAddress(
        this.projectZero
      );
      expect(revenueSplits.recipients_[0]).to.be.equal(artistAddress);
      expect(revenueSplits.revenues_[0]).to.be.equal(
        ethers.utils.parseEther("0.90")
      );
    });

    it("returns expected values for projectOne, with updated payment addresses and percentages", async function () {
      // add project
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .addProject("name", this.accounts.artist2.address);
      // artist2 populates an addditional payee
      const proposeArtistPaymentAddressesAndSplitsArgs = [
        this.projectOne,
        this.accounts.artist2.address,
        this.accounts.additional2.address,
        51,
        this.accounts.user2.address,
        0,
      ];
      await this.genArt721Core
        .connect(this.accounts.artist2)
        .proposeArtistPaymentAddressesAndSplits(
          ...proposeArtistPaymentAddressesAndSplitsArgs
        );
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .adminAcceptArtistAddressesAndSplits(
          ...proposeArtistPaymentAddressesAndSplitsArgs
        );
      // update Art Blocks percentage to 20%
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .updateArtblocksPercentage(20);
      // change Art Blocks payment address to random address
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .updateArtblocksAddress(this.accounts.user.address);
      // check for expected values
      const revenueSplits = await this.genArt721Core
        .connect(this.accounts.user)
        .getPrimaryRevenueSplits(this.projectOne, ethers.utils.parseEther("1"));
      // expect revenue splits to be properly calculated
      // Art Blocks
      expect(revenueSplits.recipients_[2]).to.be.equal(
        this.accounts.user.address
      );
      expect(revenueSplits.revenues_[2]).to.be.equal(
        ethers.utils.parseEther("0.20")
      );
      // Additional Payee (0.8 * 0.51 = 0.408)
      expect(revenueSplits.recipients_[1]).to.be.equal(
        proposeArtistPaymentAddressesAndSplitsArgs[2]
      );
      expect(revenueSplits.revenues_[1]).to.be.equal(
        ethers.utils.parseEther("0.408")
      );
      // Artist (0.8 * 0.51 = 0.392)
      expect(revenueSplits.recipients_[0]).to.be.equal(
        proposeArtistPaymentAddressesAndSplitsArgs[1]
      );
      expect(revenueSplits.revenues_[0]).to.be.equal(
        ethers.utils.parseEther("0.392")
      );
    });
  });
});
