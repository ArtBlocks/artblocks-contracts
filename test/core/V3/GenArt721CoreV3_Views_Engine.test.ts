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
  deployCoreWithMinterFilter,
} from "../../util/common";

export type ArtistFinanceProposal = {
  artistAddress: string;
  additionalPayeePrimarySalesAddress: string;
  additionalPayeePrimarySalesPercentage: number;
  additionalPayeeSecondarySalesAddress: string;
  additionalPayeeSecondarySalesPercentage: number;
};

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3_Engine", // V3 core engine contract
];

// helper function to update artist financial data
async function updateArtistFinance(
  projectId: number,
  currentArtistAccount: SignerWithAddress,
  proposal: ArtistFinanceProposal
): Promise<void> {
  const proposeArtistPaymentAddressesAndSplitsArgs = [
    projectId,
    proposal.artistAddress,
    proposal.additionalPayeePrimarySalesAddress,
    proposal.additionalPayeePrimarySalesPercentage,
    proposal.additionalPayeeSecondarySalesAddress,
    proposal.additionalPayeeSecondarySalesPercentage,
  ];
  await this.genArt721Core
    .connect(currentArtistAccount)
    .proposeArtistPaymentAddressesAndSplits(
      ...proposeArtistPaymentAddressesAndSplitsArgs
    );
  await this.genArt721Core
    .connect(this.accounts.deployer)
    .adminAcceptArtistAddressesAndSplits(
      ...proposeArtistPaymentAddressesAndSplitsArgs
    );
}

/**
 * Tests regarding view functions for V3 core.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`${coreContractName} Views`, async function () {
    beforeEach(async function () {
      // standard accounts and constants
      this.accounts = await getAccounts();
      await assignDefaultConstants.call(this);

      // deploy and configure minter filter and minter
      ({
        genArt721Core: this.genArt721Core,
        minterFilter: this.minterFilter,
        randomizer: this.randomizer,
        adminACL: this.adminACL,
      } = await deployCoreWithMinterFilter.call(
        this,
        coreContractName,
        "MinterFilterV1"
      ));

      this.minter = await deployAndGet.call(this, "MinterSetPriceV2", [
        this.genArt721Core.address,
        this.minterFilter.address,
      ]);

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

    describe("coreVersion", function () {
      it("returns expected value", async function () {
        let targetCoreVersion = "v3.1.1";
        const coreVersion = await this.genArt721Core
          .connect(this.accounts.deployer)
          .coreVersion();
        expect(coreVersion).to.be.equal(targetCoreVersion);
      });
    });

    describe("coreType", function () {
      it("returns expected value", async function () {
        const coreType = await this.genArt721Core
          .connect(this.accounts.deployer)
          .coreType();
        expect(coreType).to.be.equal("GenArt721CoreV3_Engine");
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
        for (const account of [
          this.accounts.artist,
          this.accounts.additional,
        ]) {
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
        expect(projectScriptDetails.scriptTypeAndVersion).to.be.equal("");
        expect(projectScriptDetails.aspectRatio).to.be.equal("");
        expect(projectScriptDetails.scriptCount).to.be.equal(0);
      });

      it("returns expected populated values", async function () {
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectScriptType(
            this.projectZero,
            ethers.utils.formatBytes32String("p5js@v1.2.3")
          );
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectAspectRatio(this.projectZero, "1.777777778");
        await this.genArt721Core
          .connect(this.accounts.artist)
          .addProjectScript(this.projectZero, "if(true){}");

        const projectScriptDetails = await this.genArt721Core
          .connect(this.accounts.deployer)
          .projectScriptDetails(this.projectZero);
        expect(projectScriptDetails.scriptTypeAndVersion).to.be.equal(
          "p5js@v1.2.3"
        );
        expect(projectScriptDetails.aspectRatio).to.be.equal("1.777777778");
        expect(projectScriptDetails.scriptCount).to.be.equal(1);
      });

      it("validates aspect ratio format details", async function () {
        await expectRevert(
          this.genArt721Core
            .connect(this.accounts.artist)
            .updateProjectAspectRatio(this.projectZero, "1.7777777778"),
          "Aspect ratio format too long"
        );
        await expectRevert(
          this.genArt721Core
            .connect(this.accounts.artist)
            .updateProjectAspectRatio(this.projectZero, "2/3"),
          "Improperly formatted aspect ratio"
        );
        await expectRevert(
          this.genArt721Core
            .connect(this.accounts.artist)
            .updateProjectAspectRatio(this.projectZero, "1.2.3.4"),
          "Improperly formatted aspect ratio"
        );
        await expectRevert(
          this.genArt721Core
            .connect(this.accounts.artist)
            .updateProjectAspectRatio(this.projectZero, "."),
          "Aspect ratio has no numbers"
        );
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
        expect(projectStateData.completedTimestamp).to.be.equal(0);
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
        expect(projectStateData.completedTimestamp).to.be.equal(0);
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
        expect(
          projectArtistPaymentInfo.additionalPayeePrimarySales
        ).to.be.equal(constants.ZERO_ADDRESS);
        expect(
          projectArtistPaymentInfo.additionalPayeePrimarySalesPercentage
        ).to.be.equal(0);
        expect(
          projectArtistPaymentInfo.additionalPayeeSecondarySales
        ).to.be.equal(constants.ZERO_ADDRESS);
        expect(
          projectArtistPaymentInfo.additionalPayeeSecondarySalesPercentage
        ).to.be.equal(0);
        expect(
          projectArtistPaymentInfo.secondaryMarketRoyaltyPercentage
        ).to.be.equal(0);
      });

      it("returns expected values after updating artist payment addresses and splits, and secondary royalty percentage", async function () {
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
        // new artist sets new secondary royalty percentage
        await this.genArt721Core
          .connect(this.accounts.artist2)
          .updateProjectSecondaryMarketRoyaltyPercentage(this.projectZero, 5);
        // check for expected values
        const projectArtistPaymentInfo = await this.genArt721Core
          .connect(this.accounts.deployer)
          .projectArtistPaymentInfo(this.projectZero);
        expect(projectArtistPaymentInfo.artistAddress).to.be.equal(
          valuesToUpdateTo[1]
        );
        expect(
          projectArtistPaymentInfo.additionalPayeePrimarySales
        ).to.be.equal(valuesToUpdateTo[2]);
        expect(
          projectArtistPaymentInfo.additionalPayeePrimarySalesPercentage
        ).to.be.equal(valuesToUpdateTo[3]);
        expect(
          projectArtistPaymentInfo.additionalPayeeSecondarySales
        ).to.be.equal(valuesToUpdateTo[4]);
        expect(
          projectArtistPaymentInfo.additionalPayeeSecondarySalesPercentage
        ).to.be.equal(valuesToUpdateTo[5]);
        expect(
          projectArtistPaymentInfo.secondaryMarketRoyaltyPercentage
        ).to.be.equal(5);
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
        // Render provider
        const renderProviderAddress =
          await this.genArt721Core.renderProviderPrimarySalesAddress();
        expect(revenueSplits.renderProviderAddress_).to.be.equal(
          renderProviderAddress
        );
        expect(revenueSplits.renderProviderRevenue_).to.be.equal(
          ethers.utils.parseEther("0.10")
        );
        // Render provider
        const platformProviderAddress =
          await this.genArt721Core.platformProviderPrimarySalesAddress();
        expect(revenueSplits.platformProviderAddress_).to.be.equal(
          platformProviderAddress
        );
        expect(revenueSplits.platformProviderRevenue_).to.be.equal(
          ethers.utils.parseEther("0.10")
        );
        // Additional Payee
        // This is the special case where expected revenue is 0, so address should be null
        const additionalPayeePrimarySalesAddress = constants.ZERO_ADDRESS;
        expect(revenueSplits.additionalPayeePrimaryAddress_).to.be.equal(
          additionalPayeePrimarySalesAddress
        );
        expect(revenueSplits.additionalPayeePrimaryRevenue_).to.be.equal(
          ethers.utils.parseEther("0")
        );
        // Artist
        const artistAddress = await this.genArt721Core.projectIdToArtistAddress(
          this.projectZero
        );
        expect(revenueSplits.artistAddress_).to.be.equal(artistAddress);
        expect(revenueSplits.artistRevenue_).to.be.equal(
          ethers.utils.parseEther("0.80")
        );
      });

      it("returns expected values for projectOne, with updated payment addresses and percentages", async function () {
        // add project
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .addProject("name", this.accounts.artist2.address);
        await updateArtistFinance.call(
          this,
          this.projectOne,
          this.accounts.artist2,
          {
            artistAddress: this.accounts.artist2.address,
            additionalPayeePrimarySalesAddress:
              this.accounts.additional2.address,
            additionalPayeePrimarySalesPercentage: 51,
            additionalPayeeSecondarySalesAddress: this.accounts.user2.address,
            additionalPayeeSecondarySalesPercentage: 52,
          }
        );
        // update Render and Platform percentages to 5% and 15% respectively
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProviderPrimarySalesPercentages(
            // intentionally use different values for render and platform provider for
            // testing purposes
            5, // renderProviderPrimarySalesPercentage_
            15 // platformProviderPrimarySalesPercentage_
          );
        // change Render and Platform payment addresses to random address
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProviderSalesAddresses(
            this.accounts.user.address, // _renderProviderPrimarySalesAddress
            // secondary address is intentionally different than primary for testing here
            this.accounts.additional.address, // _renderProviderSecondarySalesAddress
            this.accounts.user2.address, // _platformProviderPrimarySalesAddress
            // secondary address is intentionally different than primary for testing here
            this.accounts.additional2.address // _platformProviderSecondarySalesAddress
          );
        // check for expected values
        const revenueSplits = await this.genArt721Core
          .connect(this.accounts.user)
          .getPrimaryRevenueSplits(
            this.projectOne,
            ethers.utils.parseEther("1")
          );
        // expect revenue splits to be properly calculated
        // Render provider
        // (5%)
        expect(revenueSplits.renderProviderAddress_).to.be.equal(
          this.accounts.user.address
        );
        expect(revenueSplits.renderProviderRevenue_).to.be.equal(
          ethers.utils.parseEther("0.05")
        );
        // Platform provider
        // (15%)
        expect(revenueSplits.platformProviderAddress_).to.be.equal(
          this.accounts.user2.address
        );
        expect(revenueSplits.platformProviderRevenue_).to.be.equal(
          ethers.utils.parseEther("0.15")
        );
        // Additional Payee
        // (0.8 * 0.51 = 0.408)
        expect(revenueSplits.additionalPayeePrimaryAddress_).to.be.equal(
          this.accounts.additional2.address
        );
        expect(revenueSplits.additionalPayeePrimaryRevenue_).to.be.equal(
          ethers.utils.parseEther("0.408")
        );
        // Artist
        // (0.8 * 0.49 = 0.392)
        expect(revenueSplits.artistAddress_).to.be.equal(
          this.accounts.artist2.address
        );
        expect(revenueSplits.artistRevenue_).to.be.equal(
          ethers.utils.parseEther("0.392")
        );
      });

      it("reverts on improper address inputs", async function () {
        // addProject
        expectRevert(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .addProject("name", constants.ZERO_ADDRESS),
          "Must input non-zero address"
        );
        // updateArtblocksDependencyRegistryAddress
        expectRevert(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .updateArtblocksDependencyRegistryAddress(constants.ZERO_ADDRESS),
          "Must input non-zero address"
        );
        // updateProviderSalesAddresses
        expectRevert(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .updateProviderSalesAddresses(
              constants.ZERO_ADDRESS,
              this.accounts.additional.address,
              this.accounts.additional.address,
              this.accounts.additional.address
            ),
          "Must input non-zero address"
        );
        expectRevert(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .updateProviderSalesAddresses(
              this.accounts.additional.address,
              constants.ZERO_ADDRESS,
              this.accounts.additional.address,
              this.accounts.additional.address
            ),
          "Must input non-zero address"
        );
        expectRevert(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .updateProviderSalesAddresses(
              this.accounts.additional.address,
              this.accounts.additional.address,
              constants.ZERO_ADDRESS,
              this.accounts.additional.address
            ),
          "Must input non-zero address"
        );
        expectRevert(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .updateProviderSalesAddresses(
              this.accounts.additional.address,
              this.accounts.additional.address,
              this.accounts.additional.address,
              constants.ZERO_ADDRESS
            ),
          "Must input non-zero address"
        );
        // updateMinterContract
        expectRevert(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .updateMinterContract(constants.ZERO_ADDRESS),
          "Must input non-zero address"
        );
        // updateRandomizerAddress
        expectRevert(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .updateRandomizerAddress(constants.ZERO_ADDRESS),
          "Must input non-zero address"
        );
        // updateProjectArtistAddress
        expectRevert(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .updateProjectArtistAddress(
              this.projectZero,
              constants.ZERO_ADDRESS
            ),
          "Must input non-zero address"
        );

        const proposeArtistPaymentAddressesAndSplitsArgs = [
          this.projectZero,
          constants.ZERO_ADDRESS,
          constants.ZERO_ADDRESS,
          0,
          constants.ZERO_ADDRESS,
          0,
        ];
        // proposeArtistPaymentAddressesAndSplits
        expectRevert(
          this.genArt721Core
            .connect(this.accounts.artist)
            .proposeArtistPaymentAddressesAndSplits(
              ...proposeArtistPaymentAddressesAndSplitsArgs
            ),
          "Must input non-zero address"
        );
        // adminAcceptArtistAddressesAndSplits
        expectRevert(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .adminAcceptArtistAddressesAndSplits(
              ...proposeArtistPaymentAddressesAndSplitsArgs
            ),
          "Must input non-zero address"
        );
      });

      it("reverts on improper string inputs", async function () {
        // addProject
        expectRevert(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .addProject("", this.accounts.artist.address),
          "Must input non-empty string"
        );
        // updateProjectName
        expectRevert(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .updateProjectName(this.projectZero, ""),
          "Must input non-empty string"
        );
        // updateProjectArtistName
        expectRevert(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .updateProjectArtistName(this.projectZero, ""),
          "Must input non-empty string"
        );
        // updateProjectLicense
        expectRevert(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .updateProjectLicense(this.projectZero, ""),
          "Must input non-empty string"
        );
        // addProjectScript
        expectRevert(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .addProjectScript(this.projectZero, ""),
          "Must input non-empty string"
        );
        // updateProjectScript
        expectRevert(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .updateProjectScript(this.projectZero, 0, ""),
          "Must input non-empty string"
        );
        // updateProjectAspectRatio
        expectRevert(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .updateProjectAspectRatio(this.projectZero, ""),
          "Must input non-empty string"
        );
        // updateProjectBaseURI
        expectRevert(
          this.genArt721Core
            .connect(this.accounts.artist)
            .updateProjectBaseURI(this.projectZero, ""),
          "Must input non-empty string"
        );
        // updateDefaultBaseURI
        expectRevert(
          this.genArt721Core
            .connect(this.accounts.deployer)
            .updateDefaultBaseURI(""),
          "Must input non-empty string"
        );
      });

      it("returns expected values for projectOne, with updated payment addresses and percentages only to Additional Payee Primary", async function () {
        // add project
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .addProject("name", this.accounts.artist2.address);
        // artist2 populates an addditional payee
        await updateArtistFinance.call(
          this,
          this.projectOne,
          this.accounts.artist2,
          {
            artistAddress: this.accounts.artist2.address,
            additionalPayeePrimarySalesAddress:
              this.accounts.additional2.address,
            additionalPayeePrimarySalesPercentage: 100,
            additionalPayeeSecondarySalesAddress: this.accounts.user2.address,
            additionalPayeeSecondarySalesPercentage: 0,
          }
        );
        // update Render and Platform percentages to 5% and 15% respectively
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProviderPrimarySalesPercentages(
            // intentionally use different values for render and platform provider for
            // testing purposes
            5, // renderProviderPrimarySalesPercentage_
            15 // platformProviderPrimarySalesPercentage_
          );
        // change Render and Platform payment addresses to random address
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProviderSalesAddresses(
            this.accounts.user.address, // _renderProviderPrimarySalesAddress
            // secondary address is intentionally different than primary for testing here
            this.accounts.additional.address, // _renderProviderSecondarySalesAddress
            this.accounts.user2.address, // _platformProviderPrimarySalesAddress
            // secondary address is intentionally different than primary for testing here
            this.accounts.additional2.address // _platformProviderSecondarySalesAddress
          );
        // check for expected values
        const revenueSplits = await this.genArt721Core
          .connect(this.accounts.user)
          .getPrimaryRevenueSplits(
            this.projectOne,
            ethers.utils.parseEther("1")
          );
        // expect revenue splits to be properly calculated
        // Render provider
        // (5%)
        expect(revenueSplits.renderProviderAddress_).to.be.equal(
          this.accounts.user.address
        );
        expect(revenueSplits.renderProviderRevenue_).to.be.equal(
          ethers.utils.parseEther("0.05")
        );
        // Platform provider
        // (15%)
        expect(revenueSplits.platformProviderAddress_).to.be.equal(
          this.accounts.user2.address
        );
        expect(revenueSplits.platformProviderRevenue_).to.be.equal(
          ethers.utils.parseEther("0.15")
        );
        // Additional Payee (0.8 * 1.00 = 0.6)
        expect(revenueSplits.additionalPayeePrimaryAddress_).to.be.equal(
          this.accounts.additional2.address
        );
        expect(revenueSplits.additionalPayeePrimaryRevenue_).to.be.equal(
          ethers.utils.parseEther("0.8")
        );
        // Artist (0.8 * 0 = 0), special case of zero revenue, expect null address
        expect(revenueSplits.artistAddress_).to.be.equal(
          constants.ZERO_ADDRESS
        );
        expect(revenueSplits.artistRevenue_).to.be.equal(
          ethers.utils.parseEther("0")
        );
      });
    });

    describe("getRoyalties", function () {
      it("returns expected default values for valid projectZero token", async function () {
        // mint token for projectZero
        await this.minter
          .connect(this.accounts.artist)
          .purchase(this.projectZero);
        // check for expected values
        const royaltiesData = await this.genArt721Core
          .connect(this.accounts.user)
          .getRoyalties(this.projectZeroTokenZero.toNumber());
        // generalized check on response size
        expect(royaltiesData.recipients.length).to.be.equal(2);
        expect(royaltiesData.bps.length).to.be.equal(2);
        // Artist
        // This is a special case where expected revenue is 0, so not included in the array
        // Additional Payee
        // This is a special case where expected revenue is 0, so not included in the array
        // Render provider
        const renderProviderSecondarySalesAddress =
          await this.genArt721Core.renderProviderSecondarySalesAddress();
        expect(royaltiesData.recipients[0]).to.be.equal(
          renderProviderSecondarySalesAddress
        );
        expect(royaltiesData.bps[0]).to.be.equal(250);
        // Platform provider
        const platformProviderSecondarySalesAddress =
          await this.genArt721Core.platformProviderSecondarySalesAddress();
        expect(royaltiesData.recipients[1]).to.be.equal(
          platformProviderSecondarySalesAddress
        );
        expect(royaltiesData.bps[1]).to.be.equal(250);
      });

      it("returns expected configured values for valid projectOne token, three non-zero royalties", async function () {
        // add project
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .addProject("name", this.accounts.artist2.address);
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .toggleProjectIsActive(this.projectOne);
        await this.genArt721Core
          .connect(this.accounts.artist2)
          .updateProjectMaxInvocations(this.projectOne, this.maxInvocations);

        // configure minter for project one
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(this.projectOne, this.minter.address);
        await this.minter
          .connect(this.accounts.artist2)
          .updatePricePerTokenInWei(this.projectOne, 0);

        // mint token for projectOne
        await this.minter
          .connect(this.accounts.artist2)
          .purchase(this.projectOne);

        // configure royalties for projectOne
        await this.genArt721Core
          .connect(this.accounts.artist2)
          .updateProjectSecondaryMarketRoyaltyPercentage(this.projectOne, 10);
        // artist2 populates an addditional payee
        await updateArtistFinance.call(
          this,
          this.projectOne,
          this.accounts.artist2,
          {
            artistAddress: this.accounts.artist2.address,
            additionalPayeePrimarySalesAddress: constants.ZERO_ADDRESS,
            additionalPayeePrimarySalesPercentage: 0,
            additionalPayeeSecondarySalesAddress:
              this.accounts.additional2.address,
            additionalPayeeSecondarySalesPercentage: 51,
          }
        );
        // update provider secondary BPS to 2.25% and 2.75%
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProviderSecondarySalesBPS(
            // intentionally use different render and platform provider values
            // for purposes of testing
            225, // _renderProviderSecondarySalesBPS
            275 // _platformProviderSecondarySalesBPS
          );
        // change provider payment addresses to random address
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProviderSalesAddresses(
            // primary address is intentionally different than primary for testing here
            this.accounts.additional.address, // _renderProviderPrimarySalesAddress
            this.accounts.user.address, // _renderProviderSecondarySalesAddress
            // primary address is intentionally different than primary for testing here
            this.accounts.additional2.address, // _platformProviderPrimarySalesAddress
            this.accounts.user2.address // _platformProviderSecondarySalesAddress
          );

        // check for expected values
        const royaltiesData = await this.genArt721Core
          .connect(this.accounts.user)
          .getRoyalties(this.projectOneTokenZero.toNumber());
        // validate data size
        expect(royaltiesData.recipients.length).to.be.equal(4);
        expect(royaltiesData.bps.length).to.be.equal(4);
        // Artist
        const artistAddress = this.accounts.artist2.address;
        expect(royaltiesData.recipients[0]).to.be.equal(artistAddress);
        // artist BPS = 10% * 100 (BPS/%) * 0.49 to artist = 490 BPS
        expect(royaltiesData.bps[0]).to.be.equal(490);
        // Additional Payee
        const projectIdToAdditionalPayeeSecondarySales =
          this.accounts.additional2.address;
        expect(royaltiesData.recipients[1]).to.be.equal(
          projectIdToAdditionalPayeeSecondarySales
        );
        // artist BPS = 10% * 100 (BPS/%) * 0.51 to additional = 510 BPS
        expect(royaltiesData.bps[1]).to.be.equal(510);
        // Render provider
        const renderProviderSecondarySalesAddress = this.accounts.user.address;
        expect(royaltiesData.recipients[2]).to.be.equal(
          renderProviderSecondarySalesAddress
        );
        expect(royaltiesData.bps[2]).to.be.equal(225);
        // Platform provider
        const platformProviderSecondarySalesAddress =
          this.accounts.user2.address;
        expect(royaltiesData.recipients[3]).to.be.equal(
          platformProviderSecondarySalesAddress
        );
        expect(royaltiesData.bps[3]).to.be.equal(275);
      });

      it("returns expected configured values for valid projectOne token, only artist royalties are zero", async function () {
        // add project
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .addProject("name", this.accounts.artist2.address);
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .toggleProjectIsActive(this.projectOne);
        await this.genArt721Core
          .connect(this.accounts.artist2)
          .updateProjectMaxInvocations(this.projectOne, this.maxInvocations);

        // configure minter for project one
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(this.projectOne, this.minter.address);
        await this.minter
          .connect(this.accounts.artist2)
          .updatePricePerTokenInWei(this.projectOne, 0);

        // mint token for projectOne
        await this.minter
          .connect(this.accounts.artist2)
          .purchase(this.projectOne);

        // configure royalties for projectOne
        await this.genArt721Core
          .connect(this.accounts.artist2)
          .updateProjectSecondaryMarketRoyaltyPercentage(this.projectOne, 10);
        // artist2 populates an addditional payee
        const proposeArtistPaymentAddressesAndSplitsArgs = [
          this.projectOne,
          this.accounts.artist2.address,
          constants.ZERO_ADDRESS,
          0,
          this.accounts.additional2.address, // additional secondary address
          100, // additonal secondary percentage
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
        // update provider secondary BPS to 2.25% and 2.75%
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProviderSecondarySalesBPS(
            // intentionally use different render and platform provider values
            // for purposes of testing
            225, // _renderProviderSecondarySalesBPS
            275 // _platformProviderSecondarySalesBPS
          );
        // change Render and Platform payment addresses to random address
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProviderSalesAddresses(
            // primary address is intentionally different than primary for testing here
            this.accounts.additional.address, // _renderProviderPrimarySalesAddress
            this.accounts.user.address, // _renderProviderSecondarySalesAddress
            // primary address is intentionally different than primary for testing here
            this.accounts.additional2.address, // _platformProviderPrimarySalesAddress
            this.accounts.user2.address // _platformProviderSecondarySalesAddress
          );

        // check for expected values
        const royaltiesData = await this.genArt721Core
          .connect(this.accounts.user)
          .getRoyalties(this.projectOneTokenZero.toNumber());
        // validate data size
        expect(royaltiesData.recipients.length).to.be.equal(3);
        expect(royaltiesData.bps.length).to.be.equal(3);
        // Artist
        // This is a special case where expected revenue is 0, so not included in the array
        // Additional Payee
        const projectIdToAdditionalPayeeSecondarySales =
          this.accounts.additional2.address;
        expect(royaltiesData.recipients[0]).to.be.equal(
          projectIdToAdditionalPayeeSecondarySales
        );
        // artist BPS = 10% * 100 (BPS/%) * 1.00 to additional = 1000 BPS
        expect(royaltiesData.bps[0]).to.be.equal(1000);
        // Render provider
        const renderProviderSecondarySalesAddress = this.accounts.user.address;
        expect(royaltiesData.recipients[1]).to.be.equal(
          renderProviderSecondarySalesAddress
        );
        expect(royaltiesData.bps[1]).to.be.equal(225);
        // Platform provider
        const platformProviderSecondarySalesAddress =
          this.accounts.user2.address;
        expect(royaltiesData.recipients[2]).to.be.equal(
          platformProviderSecondarySalesAddress
        );
        expect(royaltiesData.bps[2]).to.be.equal(275);
      });

      it("returns expected configured values for valid projectOne token, only additional payee royalties are zero", async function () {
        // add project
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .addProject("name", this.accounts.artist2.address);
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .toggleProjectIsActive(this.projectOne);
        await this.genArt721Core
          .connect(this.accounts.artist2)
          .updateProjectMaxInvocations(this.projectOne, this.maxInvocations);

        // configure minter for project one
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(this.projectOne, this.minter.address);
        await this.minter
          .connect(this.accounts.artist2)
          .updatePricePerTokenInWei(this.projectOne, 0);

        // mint token for projectOne
        await this.minter
          .connect(this.accounts.artist2)
          .purchase(this.projectOne);

        // configure royalties for projectOne
        await this.genArt721Core
          .connect(this.accounts.artist2)
          .updateProjectSecondaryMarketRoyaltyPercentage(this.projectOne, 10);
        // artist2 populates an addditional payee
        await updateArtistFinance.call(
          this,
          this.projectOne,
          this.accounts.artist2,
          {
            artistAddress: this.accounts.artist2.address,
            additionalPayeePrimarySalesAddress: constants.ZERO_ADDRESS,
            additionalPayeePrimarySalesPercentage: 0,
            additionalPayeeSecondarySalesAddress:
              this.accounts.additional2.address,
            additionalPayeeSecondarySalesPercentage: 0,
          }
        );
        // update provider secondary BPS to 2.25% and 2.75%
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProviderSecondarySalesBPS(
            // intentionally use different render and platform provider values
            // for purposes of testing
            225, // _renderProviderSecondarySalesBPS
            275 // _platformProviderSecondarySalesBPS
          );
        // change Render and Platform payment addresses to random address
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProviderSalesAddresses(
            // primary address is intentionally different than primary for testing here
            this.accounts.additional.address, // _renderProviderPrimarySalesAddress
            this.accounts.user.address, // _renderProviderSecondarySalesAddress
            // primary address is intentionally different than primary for testing here
            this.accounts.additional2.address, // _platformProviderPrimarySalesAddress
            this.accounts.user2.address // _platformProviderSecondarySalesAddress
          );

        // check for expected values
        const royaltiesData = await this.genArt721Core
          .connect(this.accounts.user)
          .getRoyalties(this.projectOneTokenZero.toNumber());
        // validate data size
        expect(royaltiesData.recipients.length).to.be.equal(3);
        expect(royaltiesData.bps.length).to.be.equal(3);
        // Artist
        const artistAddress = this.accounts.artist2.address;
        expect(royaltiesData.recipients[0]).to.be.equal(artistAddress);
        // artist BPS = 10% * 100 (BPS/%) * 1.00 to artist = 1000 BPS
        expect(royaltiesData.bps[0]).to.be.equal(1000);
        // Additional Payee
        // This is a special case where expected revenue is 0, so not included in the array
        // Render provider
        const renderProviderSecondarySalesAddress = this.accounts.user.address;
        expect(royaltiesData.recipients[1]).to.be.equal(
          renderProviderSecondarySalesAddress
        );
        expect(royaltiesData.bps[1]).to.be.equal(225);
        // Platform provider
        const platformProviderSecondarySalesAddress =
          this.accounts.user2.address;
        expect(royaltiesData.recipients[2]).to.be.equal(
          platformProviderSecondarySalesAddress
        );
        expect(royaltiesData.bps[2]).to.be.equal(275);
      });

      it("returns expected configured values for valid projectOne token, only Art Blocks royalties are zero", async function () {
        // add project
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .addProject("name", this.accounts.artist2.address);
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .toggleProjectIsActive(this.projectOne);
        await this.genArt721Core
          .connect(this.accounts.artist2)
          .updateProjectMaxInvocations(this.projectOne, this.maxInvocations);

        // configure minter for project one
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(this.projectOne, this.minter.address);
        await this.minter
          .connect(this.accounts.artist2)
          .updatePricePerTokenInWei(this.projectOne, 0);

        // mint token for projectOne
        await this.minter
          .connect(this.accounts.artist2)
          .purchase(this.projectOne);

        // configure royalties for projectOne
        await this.genArt721Core
          .connect(this.accounts.artist2)
          .updateProjectSecondaryMarketRoyaltyPercentage(this.projectOne, 10);
        // artist2 populates an addditional payee
        await updateArtistFinance.call(
          this,
          this.projectOne,
          this.accounts.artist2,
          {
            artistAddress: this.accounts.artist2.address,
            additionalPayeePrimarySalesAddress: constants.ZERO_ADDRESS,
            additionalPayeePrimarySalesPercentage: 0,
            additionalPayeeSecondarySalesAddress:
              this.accounts.additional2.address,
            additionalPayeeSecondarySalesPercentage: 51,
          }
        );
        // update provider secondary BPS to 0%
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProviderSecondarySalesBPS(
            0, // _renderProviderSecondarySalesBPS
            0 // _platformProviderSecondarySalesBPS
          );
        // change Render and Platform payment addresses to random address
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProviderSalesAddresses(
            // primary address is intentionally different than primary for testing here
            this.accounts.additional.address, // _renderProviderPrimarySalesAddress
            this.accounts.user.address, // _renderProviderSecondarySalesAddress
            // primary address is intentionally different than primary for testing here
            this.accounts.additional2.address, // _platformProviderPrimarySalesAddress
            this.accounts.user2.address // _platformProviderSecondarySalesAddress
          );

        // check for expected values
        const royaltiesData = await this.genArt721Core
          .connect(this.accounts.user)
          .getRoyalties(this.projectOneTokenZero.toNumber());
        // validate data size
        expect(royaltiesData.recipients.length).to.be.equal(2);
        expect(royaltiesData.bps.length).to.be.equal(2);
        // Artist
        const artistAddress = this.accounts.artist2.address;
        expect(royaltiesData.recipients[0]).to.be.equal(artistAddress);
        // artist BPS = 10% * 100 (BPS/%) * 0.49 to artist = 490 BPS
        expect(royaltiesData.bps[0]).to.be.equal(490);
        // Additional Payee
        const projectIdToAdditionalPayeeSecondarySales =
          this.accounts.additional2.address;
        expect(royaltiesData.recipients[1]).to.be.equal(
          projectIdToAdditionalPayeeSecondarySales
        );
        // artist BPS = 10% * 100 (BPS/%) * 0.51 to additional = 510 BPS
        expect(royaltiesData.bps[1]).to.be.equal(510);
        // Art Blocks
        // This is a special case where expected revenue is 0, so not included in the array
      });

      it("returns expected configured values for valid projectOne token, all royalties are zero", async function () {
        // add project
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .addProject("name", this.accounts.artist2.address);
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .toggleProjectIsActive(this.projectOne);
        await this.genArt721Core
          .connect(this.accounts.artist2)
          .updateProjectMaxInvocations(this.projectOne, this.maxInvocations);

        // configure minter for project one
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(this.projectOne, this.minter.address);
        await this.minter
          .connect(this.accounts.artist2)
          .updatePricePerTokenInWei(this.projectOne, 0);

        // mint token for projectOne
        await this.minter
          .connect(this.accounts.artist2)
          .purchase(this.projectOne);

        // configure royalties for projectOne
        await this.genArt721Core
          .connect(this.accounts.artist2)
          .updateProjectSecondaryMarketRoyaltyPercentage(this.projectOne, 0);
        // artist2 populates an addditional payee
        await updateArtistFinance.call(
          this,
          this.projectOne,
          this.accounts.artist2,
          {
            artistAddress: this.accounts.artist2.address,
            additionalPayeePrimarySalesAddress: constants.ZERO_ADDRESS,
            additionalPayeePrimarySalesPercentage: 0,
            additionalPayeeSecondarySalesAddress:
              this.accounts.additional2.address,
            additionalPayeeSecondarySalesPercentage: 51,
          }
        );
        // update provider secondary BPS to 0%
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProviderSecondarySalesBPS(
            0, // _renderProviderSecondarySalesBPS
            0 // _platformProviderSecondarySalesBPS
          );
        // change Render and Platform payment addresses to random address
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProviderSalesAddresses(
            // primary address is intentionally different than primary for testing here
            this.accounts.additional.address, // _renderProviderPrimarySalesAddress
            this.accounts.user.address, // _renderProviderSecondarySalesAddress
            // primary address is intentionally different than primary for testing here
            this.accounts.additional2.address, // _platformProviderPrimarySalesAddress
            this.accounts.user2.address // _platformProviderSecondarySalesAddress
          );

        // check for expected values
        const royaltiesData = await this.genArt721Core
          .connect(this.accounts.user)
          .getRoyalties(this.projectOneTokenZero.toNumber());
        // Artist
        // This is a special case where expected revenue is 0, so not included in the array
        // Additional Payee
        // This is a special case where expected revenue is 0, so not included in the array
        // Art Blocks
        // This is a special case where expected revenue is 0, so not included in the array
        expect(royaltiesData.recipients.length).to.be.equal(0);
        expect(royaltiesData.bps.length).to.be.equal(0);
      });

      it("reverts when asking for invalid token", async function () {
        await expectRevert(
          this.genArt721Core
            .connect(this.accounts.user)
            .getRoyalties(this.projectZeroTokenZero.toNumber()),
          "Token ID does not exist"
        );
      });
    });

    describe("providerPrimarySalesPercentages", function () {
      it("returns expected default value", async function () {
        // check for expected values
        const renderViewData = await this.genArt721Core
          .connect(this.accounts.user)
          .renderProviderPrimarySalesPercentage();
        expect(renderViewData).to.be.equal(10);
        const platformViewData = await this.genArt721Core
          .connect(this.accounts.user)
          .platformProviderPrimarySalesPercentage();
        expect(platformViewData).to.be.equal(10);
      });

      it("returns expected configured values for projectZero", async function () {
        // configure Art Blocks primary sales percentage
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProviderPrimarySalesPercentages(
            5, // renderProviderPrimarySalesPercentage_
            15 // platformProviderPrimarySalesPercentage_
          );

        // check for expected values
        const renderViewData = await this.genArt721Core
          .connect(this.accounts.user)
          .renderProviderPrimarySalesPercentage();
        expect(renderViewData).to.be.equal(5);
        const platformViewData = await this.genArt721Core
          .connect(this.accounts.user)
          .platformProviderPrimarySalesPercentage();
        expect(platformViewData).to.be.equal(15);
      });
    });

    describe("projectIdToSecondaryMarketRoyaltyPercentage", function () {
      it("returns expected default value", async function () {
        // check for expected values
        const viewData = await this.genArt721Core
          .connect(this.accounts.user)
          .projectIdToSecondaryMarketRoyaltyPercentage(this.projectZero);
        expect(viewData).to.be.equal(0);
      });

      it("returns expected configured values for projectZero", async function () {
        // configure royalties for projectOne
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectSecondaryMarketRoyaltyPercentage(this.projectZero, 10);

        // check for expected values
        const viewData = await this.genArt721Core
          .connect(this.accounts.user)
          .projectIdToSecondaryMarketRoyaltyPercentage(this.projectZero);
        expect(viewData).to.be.equal(10);
      });
    });

    describe("projectIdToAdditionalPayeePrimarySales", function () {
      it("returns expected default value", async function () {
        // check for expected values
        const viewData = await this.genArt721Core
          .connect(this.accounts.user)
          .projectIdToAdditionalPayeePrimarySales(this.projectZero);
        expect(viewData).to.be.equal(constants.ZERO_ADDRESS);
      });

      it("returns expected configured values for projectOne", async function () {
        // add project
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .addProject("name", this.accounts.artist2.address);
        // artist2 populates an addditional payee
        await updateArtistFinance.call(
          this,
          this.projectOne,
          this.accounts.artist2,
          {
            artistAddress: this.accounts.artist2.address,
            additionalPayeePrimarySalesAddress:
              this.accounts.additional.address,
            additionalPayeePrimarySalesPercentage: 49,
            additionalPayeeSecondarySalesAddress:
              this.accounts.additional2.address,
            additionalPayeeSecondarySalesPercentage: 51,
          }
        );
        // check for expected values
        const viewData = await this.genArt721Core
          .connect(this.accounts.user)
          .projectIdToAdditionalPayeePrimarySales(this.projectOne);
        expect(viewData).to.be.equal(this.accounts.additional.address);
      });
    });

    describe("projectIdToAdditionalPayeePrimarySalesPercentage", function () {
      it("returns expected default value", async function () {
        // check for expected values
        const viewData = await this.genArt721Core
          .connect(this.accounts.user)
          .projectIdToAdditionalPayeePrimarySalesPercentage(this.projectZero);
        expect(viewData).to.be.equal(0);
      });

      it("returns expected configured values for projectOne", async function () {
        // add project
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .addProject("name", this.accounts.artist2.address);
        // artist2 populates an addditional payee
        await updateArtistFinance.call(
          this,
          this.projectOne,
          this.accounts.artist2,
          {
            artistAddress: this.accounts.artist2.address,
            additionalPayeePrimarySalesAddress:
              this.accounts.additional.address,
            additionalPayeePrimarySalesPercentage: 49,
            additionalPayeeSecondarySalesAddress:
              this.accounts.additional2.address,
            additionalPayeeSecondarySalesPercentage: 51,
          }
        );
        // check for expected values
        const viewData = await this.genArt721Core
          .connect(this.accounts.user)
          .projectIdToAdditionalPayeePrimarySalesPercentage(this.projectOne);
        expect(viewData).to.be.equal(49);
      });
    });

    describe("projectIdToAdditionalPayeeSecondarySales", function () {
      it("returns expected default value", async function () {
        // check for expected values
        const viewData = await this.genArt721Core
          .connect(this.accounts.user)
          .projectIdToAdditionalPayeeSecondarySales(this.projectZero);
        expect(viewData).to.be.equal(constants.ZERO_ADDRESS);
      });

      it("returns expected configured values for projectOne", async function () {
        // add project
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .addProject("name", this.accounts.artist2.address);
        // artist2 populates an addditional payee
        await updateArtistFinance.call(
          this,
          this.projectOne,
          this.accounts.artist2,
          {
            artistAddress: this.accounts.artist2.address,
            additionalPayeePrimarySalesAddress:
              this.accounts.additional.address,
            additionalPayeePrimarySalesPercentage: 49,
            additionalPayeeSecondarySalesAddress:
              this.accounts.additional2.address,
            additionalPayeeSecondarySalesPercentage: 51,
          }
        );
        // check for expected values
        const viewData = await this.genArt721Core
          .connect(this.accounts.user)
          .projectIdToAdditionalPayeeSecondarySales(this.projectOne);
        expect(viewData).to.be.equal(this.accounts.additional2.address);
      });
    });

    describe("projectIdToAdditionalPayeeSecondarySalesPercentage", function () {
      it("returns expected default value", async function () {
        // check for expected values
        const viewData = await this.genArt721Core
          .connect(this.accounts.user)
          .projectIdToAdditionalPayeeSecondarySalesPercentage(this.projectZero);
        expect(viewData).to.be.equal(0);
      });

      it("returns expected configured values for projectOne", async function () {
        // add project
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .addProject("name", this.accounts.artist2.address);
        // artist2 populates an addditional payee
        await updateArtistFinance.call(
          this,
          this.projectOne,
          this.accounts.artist2,
          {
            artistAddress: this.accounts.artist2.address,
            additionalPayeePrimarySalesAddress:
              this.accounts.additional.address,
            additionalPayeePrimarySalesPercentage: 49,
            additionalPayeeSecondarySalesAddress:
              this.accounts.additional2.address,
            additionalPayeeSecondarySalesPercentage: 51,
          }
        );
        // check for expected values
        const viewData = await this.genArt721Core
          .connect(this.accounts.user)
          .projectIdToAdditionalPayeeSecondarySalesPercentage(this.projectOne);
        expect(viewData).to.be.equal(51);
      });
    });

    describe("numHistoricalRandomizers", function () {
      it("returns value of one upon initial configuration", async function () {
        const numHistoricalRandomizers = await this.genArt721Core
          .connect(this.accounts.user)
          .numHistoricalRandomizers();
        expect(numHistoricalRandomizers).to.be.equal(1);
      });

      it("increments value when more randomizers are added", async function () {
        // update to dummy randomizer address
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateRandomizerAddress(this.accounts.deployer.address);
        // expect incremented number of randomizers
        const numHistoricalRandomizers = await this.genArt721Core
          .connect(this.accounts.user)
          .numHistoricalRandomizers();
        expect(numHistoricalRandomizers).to.be.equal(2);
      });
    });

    describe("getHistoricalRandomizerAt", function () {
      it("returns initial randomizer at index of zero upon initial configuration", async function () {
        const randomizerAddress = await this.genArt721Core
          .connect(this.accounts.user)
          .getHistoricalRandomizerAt(0);
        expect(randomizerAddress).to.be.equal(this.randomizer.address);
      });

      it("returns initial and next randomizer at expected indices when >1 randomizer in history", async function () {
        // update to dummy randomizer address
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateRandomizerAddress(this.accounts.deployer.address);
        // expect initial randomizer at index zero
        const initialRandomizer = await this.genArt721Core
          .connect(this.accounts.user)
          .getHistoricalRandomizerAt(0);
        expect(initialRandomizer).to.be.equal(this.randomizer.address);
        // expect next randomizer at index one
        const nextRandomizer = await this.genArt721Core
          .connect(this.accounts.user)
          .getHistoricalRandomizerAt(1);
        expect(nextRandomizer).to.be.equal(this.accounts.deployer.address);
      });

      it("reverts when invalid index is queried", async function () {
        // expect revert when query out of bounds index
        await expectRevert(
          this.genArt721Core
            .connect(this.accounts.user)
            .getHistoricalRandomizerAt(2),
          "Index out of bounds"
        );
      });
    });

    describe("projectScriptByIndex", function () {
      it("returns empty string by default", async function () {
        const emptyProjectScript = await this.genArt721Core
          .connect(this.accounts.user)
          .projectScriptByIndex(this.projectZero, 0);
        expect(emptyProjectScript).to.be.equal("");
      });

      it("returns expected populated string", async function () {
        // add a couple project scripts
        await this.genArt721Core
          .connect(this.accounts.artist)
          .addProjectScript(this.projectZero, "console.log('hello')");
        await this.genArt721Core
          .connect(this.accounts.artist)
          .addProjectScript(this.projectZero, "console.log('world')");
        const projectScript = await this.genArt721Core
          .connect(this.accounts.user)
          .projectScriptByIndex(this.projectZero, 1);
        expect(projectScript).to.be.equal("console.log('world')");
      });
    });

    describe("projectURIInfo", function () {
      it("returns default string by default", async function () {
        const emptyProjectURI = await this.genArt721Core
          .connect(this.accounts.user)
          .projectURIInfo(this.projectZero);
        expect(emptyProjectURI).to.be.equal(
          `https://token.artblocks.io/${this.genArt721Core.address.toLowerCase()}/`
        );
      });

      it("returns expected populated projectURI", async function () {
        // add a couple project scripts
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectBaseURI(this.projectZero, "https://example.com/");
        const projectURI = await this.genArt721Core
          .connect(this.accounts.user)
          .projectURIInfo(this.projectZero);
        expect(projectURI).to.be.equal("https://example.com/");
      });
    });

    describe("tokenURI", function () {
      it("returns default base URI if projectURI is not populated", async function () {
        // mint token for projectZero
        await this.minter
          .connect(this.accounts.artist)
          .purchase(this.projectZero);
        // check tokenURI
        const tokenURIForDefaultProjectURI = await this.genArt721Core
          .connect(this.accounts.user)
          .tokenURI(this.projectZeroTokenZero.toNumber());
        expect(tokenURIForDefaultProjectURI).to.be.equal(
          `https://token.artblocks.io/${this.genArt721Core.address.toLowerCase()}/${this.projectZeroTokenZero.toString()}`
        );
      });

      it("returns updated default base URI if contract base URI is updated after constructor", async function () {
        // update contract base URI
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateDefaultBaseURI("https://tokenz.AB.com/");
        // add new project
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .addProject("projectOne", this.accounts.artist.address);
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .toggleProjectIsActive(this.projectOne);
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectMaxInvocations(this.projectOne, this.maxInvocations);

        // configure minter for project zero
        await this.minterFilter
          .connect(this.accounts.deployer)
          .setMinterForProject(this.projectOne, this.minter.address);
        await this.minter
          .connect(this.accounts.artist)
          .updatePricePerTokenInWei(this.projectOne, 0);
        // mint token for projectOne
        await this.minter
          .connect(this.accounts.artist)
          .purchase(this.projectOne);

        // check tokenURI
        const tokenURIForEmptyProjectURI = await this.genArt721Core
          .connect(this.accounts.user)
          .tokenURI(this.projectOneTokenZero.toNumber());
        expect(tokenURIForEmptyProjectURI).to.be.equal(
          `https://tokenz.AB.com/${this.projectOneTokenZero.toString()}`
        );
      });

      it("returns expected tokenURI after a populated projectURI", async function () {
        // mint token for projectZero
        await this.minter
          .connect(this.accounts.artist)
          .purchase(this.projectZero);
        // set project base URI to non-empty string
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectBaseURI(this.projectZero, "https://example.com/");
        // check tokenURI
        const tokenURI = await this.genArt721Core
          .connect(this.accounts.user)
          .tokenURI(this.projectZeroTokenZero.toNumber());
        expect(tokenURI).to.be.equal(
          `https://example.com/${this.projectZeroTokenZero.toString()}`
        );
      });

      it("returns expected tokenURI after a populated projectURI (short URI edge-case)", async function () {
        // mint token for projectZero
        await this.minter
          .connect(this.accounts.artist)
          .purchase(this.projectZero);
        // set project base URI to non-empty string
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectBaseURI(this.projectZero, "/");
        // check tokenURI
        const tokenURI = await this.genArt721Core
          .connect(this.accounts.user)
          .tokenURI(this.projectZeroTokenZero.toNumber());
        expect(tokenURI).to.be.equal(
          `/${this.projectZeroTokenZero.toString()}`
        );
      });

      it("returns expected tokenURI after a populated projectURI (long URI edge-case)", async function () {
        const longURI = "https://example.com/".repeat(100);
        // mint token for projectZero
        await this.minter
          .connect(this.accounts.artist)
          .purchase(this.projectZero);
        // set project base URI to non-empty string
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectBaseURI(this.projectZero, longURI);
        // check tokenURI
        const tokenURI = await this.genArt721Core
          .connect(this.accounts.user)
          .tokenURI(this.projectZeroTokenZero.toNumber());
        expect(tokenURI).to.be.equal(
          `${longURI}${this.projectZeroTokenZero.toString()}`
        );
      });

      it("reverts when token does not exist", async function () {
        // expect revert when token does not exist
        await expectRevert(
          this.genArt721Core
            .connect(this.accounts.user)
            .tokenURI(this.projectZeroTokenZero.toNumber()),
          "Token ID does not exist"
        );
      });
    });

    describe("isMintWhitelisted", function () {
      it("returns true for minterFilter", async function () {
        const emptyProjectURI = await this.genArt721Core
          .connect(this.accounts.user)
          .projectURIInfo(this.projectZero);
        expect(
          await this.genArt721Core
            .connect(this.accounts.user)
            .isMintWhitelisted(this.minterFilter.address)
        ).to.be.true;
      });

      it("returns false for non-minterFilter", async function () {
        const emptyProjectURI = await this.genArt721Core
          .connect(this.accounts.user)
          .projectURIInfo(this.projectZero);
        expect(
          await this.genArt721Core
            .connect(this.accounts.user)
            .isMintWhitelisted(this.minter.address)
        ).to.be.false;
      });
    });

    describe("tokenIdToProjectId", function () {
      it("returns expected value", async function () {
        // project Zero, token zero
        let projectId = await this.genArt721Core
          .connect(this.accounts.user)
          .tokenIdToProjectId(this.projectZeroTokenZero.toNumber());
        expect(projectId).to.be.equal(this.projectZero);
        // project One, token zero
        projectId = await this.genArt721Core
          .connect(this.accounts.user)
          .tokenIdToProjectId(this.projectOneTokenZero.toNumber());
        expect(projectId).to.be.equal(this.projectOne);
        // project One, token one
        projectId = await this.genArt721Core
          .connect(this.accounts.user)
          .tokenIdToProjectId(this.projectOneTokenOne.toNumber());
        expect(projectId).to.be.equal(this.projectOne);
        // project Two, token one
        projectId = await this.genArt721Core
          .connect(this.accounts.user)
          .tokenIdToProjectId(this.projectTwoTokenOne.toNumber());
        expect(projectId).to.be.equal(this.projectTwo);
      });
    });

    describe("tokenIdToHashSeed", function () {
      it("updates token hash seed from null to non-null when token is minted", async function () {
        // ensure token hash is initially zero
        expect(
          await this.genArt721Core.tokenIdToHashSeed(
            this.projectZeroTokenZero.toNumber()
          )
        ).to.be.equal("0x000000000000000000000000"); // bytes12(0)
        // mint a token and expect token hash seed to be updated to a non-zero hash
        await this.minter
          .connect(this.accounts.artist)
          .purchase(this.projectZero);
        expect(
          await this.genArt721Core.tokenIdToHashSeed(
            this.projectZeroTokenZero.toNumber()
          )
        ).to.not.be.equal(ethers.constants.HashZero);
      });
    });
  });
}
