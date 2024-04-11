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
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import {
  T_Config,
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
  "GenArt721CoreV3", // flagship V3 core
  "GenArt721CoreV3_Explorations", // V3 core explorations contract
  // Given the many differences for the views for betwen CoreV3 and CoreV3_Engine,
  // for config set of _Views tests, the _Engine variants have been split out.
];

// helper function to update artist financial data
async function updateArtistFinance(
  config: T_Config,
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
  await config.genArt721Core
    .connect(currentArtistAccount)
    .proposeArtistPaymentAddressesAndSplits(
      ...proposeArtistPaymentAddressesAndSplitsArgs
    );
  await config.genArt721Core
    .connect(config.accounts.deployer)
    .adminAcceptArtistAddressesAndSplits(
      ...proposeArtistPaymentAddressesAndSplitsArgs
    );
}

/**
 * Tests regarding view functions for V3 core.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`${coreContractName} Views`, async function () {
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

      // add project
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

    describe("coreVersion", function () {
      it("returns expected value", async function () {
        const config = await loadFixture(_beforeEach);
        let targetCoreVersion = "v3.2.2";
        if (coreContractName === "GenArt721CoreV3_Explorations") {
          targetCoreVersion = "v3.2.3";
        }
        const coreVersion = await config.genArt721Core
          .connect(config.accounts.deployer)
          .coreVersion();
        expect(coreVersion).to.be.equal(targetCoreVersion);
      });
    });

    describe("coreType", function () {
      it("returns expected value", async function () {
        const config = await loadFixture(_beforeEach);
        const coreType = await config.genArt721Core
          .connect(config.accounts.deployer)
          .coreType();
        // coreType is same for GenArt721CoreV3 and GenArt721CoreV3_Explorations
        expect(coreType).to.be.equal("GenArt721CoreV3");
      });
    });

    describe("ART_BLOCKS_ERC721TOKEN_ADDRESS_V0", function () {
      it("returns expected value", async function () {
        const config = await loadFixture(_beforeEach);
        if (coreContractName === "GenArt721CoreV3_Explorations") {
          try {
            await config.genArt721Core
              .connect(config.accounts.deployer)
              .ART_BLOCKS_ERC721TOKEN_ADDRESS_V0();
            throw new Error("expected no function to be found");
          } catch (error) {
            console.log("throws as expected for GenArt721CoreV3_Explorations");
          }
        } else if (coreContractName === "GenArt721CoreV3") {
          const reference = await config.genArt721Core
            .connect(config.accounts.deployer)
            .ART_BLOCKS_ERC721TOKEN_ADDRESS_V0();
          expect(reference).to.be.equal(
            "0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a"
          );
        } else {
          throw new Error("unexpected core contract name");
        }
      });
    });

    describe("ART_BLOCKS_ERC721TOKEN_ADDRESS_V1", function () {
      it("returns expected value", async function () {
        const config = await loadFixture(_beforeEach);
        if (coreContractName === "GenArt721CoreV3_Explorations") {
          try {
            await config.genArt721Core
              .connect(config.accounts.deployer)
              .ART_BLOCKS_ERC721TOKEN_ADDRESS_V1();
            throw new Error("expected no function to be found");
          } catch (error) {
            console.log("throws as expected for GenArt721CoreV3_Explorations");
          }
        } else if (coreContractName === "GenArt721CoreV3") {
          const reference = await config.genArt721Core
            .connect(config.accounts.deployer)
            .ART_BLOCKS_ERC721TOKEN_ADDRESS_V1();
          expect(reference).to.be.equal(
            "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270"
          );
        } else {
          throw new Error("unexpected core contract name");
        }
      });
    });

    describe("artblocksCurationRegistryAddress", function () {
      it("returns expected default value", async function () {
        const config = await loadFixture(_beforeEach);
        const reference = await config.genArt721Core
          .connect(config.accounts.deployer)
          .artblocksCurationRegistryAddress();
        expect(reference).to.be.equal(constants.ZERO_ADDRESS);
      });

      it("returns expected populated value", async function () {
        const config = await loadFixture(_beforeEach);
        if (coreContractName === "GenArt721CoreV3_Explorations") {
          await expectRevert(
            config.genArt721Core
              .connect(config.accounts.deployer)
              .updateArtblocksCurationRegistryAddress(
                config.accounts.additional.address
              ),
            "Action not supported"
          );
        } else if (coreContractName === "GenArt721CoreV3") {
          // admin set to dummy address
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateArtblocksCurationRegistryAddress(
              config.accounts.additional.address
            );
          // expect value to be updated
          const reference = await config.genArt721Core
            .connect(config.accounts.deployer)
            .artblocksCurationRegistryAddress();
          expect(reference).to.be.equal(config.accounts.additional.address);
        } else {
          throw new Error("Unexpected core contract name");
        }
      });

      it("only allows admin to update value", async function () {
        const config = await loadFixture(_beforeEach);
        // expect revert when non-admin attempts to update
        for (const account of [
          config.accounts.artist,
          config.accounts.additional,
        ]) {
          await expectRevert(
            config.genArt721Core
              .connect(account)
              .updateArtblocksCurationRegistryAddress(
                config.accounts.additional.address
              ),
            "Only Admin ACL allowed"
          );
        }
        if (coreContractName === "GenArt721CoreV3_Explorations") {
          console.log(
            "skipping portion of test confirming admin can update due to unsupported action"
          );
        } else if (coreContractName === "GenArt721CoreV3") {
          // admin allowed to update
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateArtblocksCurationRegistryAddress(
              config.accounts.additional.address
            );
        } else {
          throw new Error("Unexpected core contract name");
        }
      });
    });

    describe("artblocksOnChainGeneratorAddress", function () {
      it("returns expected default value", async function () {
        const config = await loadFixture(_beforeEach);
        const reference = await config.genArt721Core
          .connect(config.accounts.deployer)
          .artblocksOnChainGeneratorAddress();
        expect(reference).to.be.equal(constants.ZERO_ADDRESS);
      });

      it("returns expected populated value", async function () {
        const config = await loadFixture(_beforeEach);
        // admin set to dummy address
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksOnChainGeneratorAddress(
            config.accounts.additional.address
          );
        // expect value to be updated
        const reference = await config.genArt721Core
          .connect(config.accounts.deployer)
          .artblocksOnChainGeneratorAddress();
        expect(reference).to.be.equal(config.accounts.additional.address);
      });

      it("only allows admin to update value", async function () {
        const config = await loadFixture(_beforeEach);
        // expect revert when non-admin attempts to update
        for (const account of [
          config.accounts.artist,
          config.accounts.additional,
        ]) {
          await expectRevert(
            config.genArt721Core
              .connect(account)
              .updateArtblocksOnChainGeneratorAddress(
                config.accounts.additional.address
              ),
            "Only Admin ACL allowed"
          );
        }
        // admin allowed to update
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksOnChainGeneratorAddress(
            config.accounts.additional.address
          );
      });
    });

    describe("artblocksDependencyRegistryAddress", function () {
      it("returns expected default value", async function () {
        const config = await loadFixture(_beforeEach);
        const reference = await config.genArt721Core
          .connect(config.accounts.deployer)
          .artblocksDependencyRegistryAddress();
        expect(reference).to.be.equal(constants.ZERO_ADDRESS);
      });

      it("returns expected populated value", async function () {
        const config = await loadFixture(_beforeEach);
        // admin set to dummy address
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksDependencyRegistryAddress(
            config.accounts.additional.address
          );
        // expect value to be updated
        const reference = await config.genArt721Core
          .connect(config.accounts.deployer)
          .artblocksDependencyRegistryAddress();
        expect(reference).to.be.equal(config.accounts.additional.address);
      });

      it("only allows admin to update value", async function () {
        const config = await loadFixture(_beforeEach);
        // expect revert when non-admin attempts to update
        for (const account of [
          config.accounts.artist,
          config.accounts.additional,
        ]) {
          await expectRevert(
            config.genArt721Core
              .connect(account)
              .updateArtblocksDependencyRegistryAddress(
                config.accounts.additional.address
              ),
            "Only Admin ACL allowed"
          );
        }
        // admin allowed to update
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksDependencyRegistryAddress(
            config.accounts.additional.address
          );
      });
    });

    describe("projectScriptDetails", function () {
      it("returns expected default values", async function () {
        const config = await loadFixture(_beforeEach);
        const projectScriptDetails = await config.genArt721Core
          .connect(config.accounts.deployer)
          .projectScriptDetails(config.projectZero);
        expect(projectScriptDetails.scriptTypeAndVersion).to.be.equal("");
        expect(projectScriptDetails.aspectRatio).to.be.equal("");
        expect(projectScriptDetails.scriptCount).to.be.equal(0);
      });

      it("returns expected populated values", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectScriptType(
            config.projectZero,
            ethers.utils.formatBytes32String("p5js@v1.2.3")
          );
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectAspectRatio(config.projectZero, "1.777777778");
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectScript(config.projectZero, "if(true){}");

        const projectScriptDetails = await config.genArt721Core
          .connect(config.accounts.deployer)
          .projectScriptDetails(config.projectZero);
        expect(projectScriptDetails.scriptTypeAndVersion).to.be.equal(
          "p5js@v1.2.3"
        );
        expect(projectScriptDetails.aspectRatio).to.be.equal("1.777777778");
        expect(projectScriptDetails.scriptCount).to.be.equal(1);
      });

      it("validates aspect ratio format details", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectAspectRatio(config.projectZero, "1.7777777778"),
          "Aspect ratio format too long"
        );
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectAspectRatio(config.projectZero, "2/3"),
          "Improperly formatted aspect ratio"
        );
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectAspectRatio(config.projectZero, "1.2.3.4"),
          "Improperly formatted aspect ratio"
        );
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectAspectRatio(config.projectZero, "."),
          "Aspect ratio has no numbers"
        );
      });
    });

    describe("projectStateData", function () {
      it("returns expected values", async function () {
        const config = await loadFixture(_beforeEach);
        const projectStateData = await config.genArt721Core
          .connect(config.accounts.deployer)
          .projectStateData(config.projectZero);
        expect(projectStateData.invocations).to.be.equal(0);
        expect(projectStateData.maxInvocations).to.be.equal(15);
        expect(projectStateData.active).to.be.true;
        expect(projectStateData.paused).to.be.true;
        expect(projectStateData.completedTimestamp).to.be.equal(0);
        expect(projectStateData.locked).to.be.false;
      });

      it("returns expected values after unpausing", async function () {
        const config = await loadFixture(_beforeEach);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .toggleProjectIsPaused(config.projectZero);
        const projectStateData = await config.genArt721Core
          .connect(config.accounts.deployer)
          .projectStateData(config.projectZero);
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
        const config = await loadFixture(_beforeEach);
        const projectDetails = await config.genArt721Core
          .connect(config.accounts.deployer)
          .projectDetails(config.projectZero);
        expect(projectDetails.projectName).to.be.equal("name");
        expect(projectDetails.artist).to.be.equal("");
        expect(projectDetails.description).to.be.equal("");
        expect(projectDetails.website).to.be.equal("");
        expect(projectDetails.license).to.be.equal("");
      });

      it("returns expected values after populating", async function () {
        const config = await loadFixture(_beforeEach);
        // artist populates values
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectArtistName(config.projectZero, "artist");
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectDescription(config.projectZero, "description");
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectWebsite(config.projectZero, "website");
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectLicense(config.projectZero, "MIT");

        // check for expected values
        const projectDetails = await config.genArt721Core
          .connect(config.accounts.deployer)
          .projectDetails(config.projectZero);
        expect(projectDetails.projectName).to.be.equal("name");
        expect(projectDetails.artist).to.be.equal("artist");
        expect(projectDetails.description).to.be.equal("description");
        expect(projectDetails.website).to.be.equal("website");
        expect(projectDetails.license).to.be.equal("MIT");
      });
    });

    describe("projectArtistPaymentInfo", function () {
      it("returns expected default values", async function () {
        const config = await loadFixture(_beforeEach);
        const projectArtistPaymentInfo = await config.genArt721Core
          .connect(config.accounts.deployer)
          .projectArtistPaymentInfo(config.projectZero);
        expect(projectArtistPaymentInfo.artistAddress).to.be.equal(
          config.accounts.artist.address
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
        const config = await loadFixture(_beforeEach);
        const valuesToUpdateTo = [
          config.projectZero,
          config.accounts.artist2.address,
          config.accounts.additional.address,
          50,
          config.accounts.additional2.address,
          51,
        ];
        // artist proposes new values
        await config.genArt721Core
          .connect(config.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo);
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...valuesToUpdateTo);
        // new artist sets new secondary royalty percentage
        await config.genArt721Core
          .connect(config.accounts.artist2)
          .updateProjectSecondaryMarketRoyaltyPercentage(config.projectZero, 5);
        // check for expected values
        const projectArtistPaymentInfo = await config.genArt721Core
          .connect(config.accounts.deployer)
          .projectArtistPaymentInfo(config.projectZero);
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
        const config = await loadFixture(_beforeEach);
        const revenueSplits = await config.genArt721Core
          .connect(config.accounts.user)
          .getPrimaryRevenueSplits(
            config.projectZero,
            ethers.utils.parseEther("1")
          );
        // expect revenue splits to be properly calculated
        // Art Blocks
        const artblocksAddress =
          await config.genArt721Core.artblocksPrimarySalesAddress();
        expect(revenueSplits.artblocksAddress_).to.be.equal(artblocksAddress);
        expect(revenueSplits.artblocksRevenue_).to.be.equal(
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
        const artistAddress =
          await config.genArt721Core.projectIdToArtistAddress(
            config.projectZero
          );
        expect(revenueSplits.artistAddress_).to.be.equal(artistAddress);
        expect(revenueSplits.artistRevenue_).to.be.equal(
          ethers.utils.parseEther("0.90")
        );
      });

      it("returns expected values for projectOne, with updated payment addresses and percentages", async function () {
        const config = await loadFixture(_beforeEach);
        // add project
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .addProject("name", config.accounts.artist2.address);
        await updateArtistFinance(
          config,
          config.projectOne,
          config.accounts.artist2,
          {
            artistAddress: config.accounts.artist2.address,
            additionalPayeePrimarySalesAddress:
              config.accounts.additional2.address,
            additionalPayeePrimarySalesPercentage: 51,
            additionalPayeeSecondarySalesAddress: config.accounts.user2.address,
            additionalPayeeSecondarySalesPercentage: 52,
          }
        );
        // update Art Blocks percentage to 20%
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksPrimarySalesPercentage(20);
        // change Art Blocks payment address to random address
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksPrimarySalesAddress(config.accounts.user.address);
        // check for expected values
        const revenueSplits = await config.genArt721Core
          .connect(config.accounts.user)
          .getPrimaryRevenueSplits(
            config.projectOne,
            ethers.utils.parseEther("1")
          );
        // expect revenue splits to be properly calculated
        // Art Blocks
        expect(revenueSplits.artblocksAddress_).to.be.equal(
          config.accounts.user.address
        );
        expect(revenueSplits.artblocksRevenue_).to.be.equal(
          ethers.utils.parseEther("0.20")
        );
        // Additional Payee (0.8 * 0.51 = 0.408)
        expect(revenueSplits.additionalPayeePrimaryAddress_).to.be.equal(
          config.accounts.additional2.address
        );
        expect(revenueSplits.additionalPayeePrimaryRevenue_).to.be.equal(
          ethers.utils.parseEther("0.408")
        );
        // Artist (0.8 * 0.51 = 0.392)
        expect(revenueSplits.artistAddress_).to.be.equal(
          config.accounts.artist2.address
        );
        expect(revenueSplits.artistRevenue_).to.be.equal(
          ethers.utils.parseEther("0.392")
        );
      });

      it("reverts on improper address inputs", async function () {
        const config = await loadFixture(_beforeEach);
        // addProject
        expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .addProject("name", constants.ZERO_ADDRESS),
          "Must input non-zero address"
        );
        // updateArtblocksCurationRegistryAddress
        expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateArtblocksCurationRegistryAddress(constants.ZERO_ADDRESS),
          "Must input non-zero address"
        );
        // updateArtblocksDependencyRegistryAddress
        expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateArtblocksDependencyRegistryAddress(constants.ZERO_ADDRESS),
          "Must input non-zero address"
        );
        // updateArtblocksPrimarySalesAddress
        expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateArtblocksPrimarySalesAddress(constants.ZERO_ADDRESS),
          "Must input non-zero address"
        );
        // updateArtblocksSecondarySalesAddress
        expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateArtblocksSecondarySalesAddress(constants.ZERO_ADDRESS),
          "Must input non-zero address"
        );
        // updateMinterContract
        expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateMinterContract(constants.ZERO_ADDRESS),
          "Must input non-zero address"
        );
        // updateRandomizerAddress
        expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateRandomizerAddress(constants.ZERO_ADDRESS),
          "Must input non-zero address"
        );
        // updateProjectArtistAddress
        expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProjectArtistAddress(
              config.projectZero,
              constants.ZERO_ADDRESS
            ),
          "Must input non-zero address"
        );

        const proposeArtistPaymentAddressesAndSplitsArgs = [
          config.projectZero,
          constants.ZERO_ADDRESS,
          constants.ZERO_ADDRESS,
          0,
          constants.ZERO_ADDRESS,
          0,
        ];
        // proposeArtistPaymentAddressesAndSplits
        expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .proposeArtistPaymentAddressesAndSplits(
              ...proposeArtistPaymentAddressesAndSplitsArgs
            ),
          "Must input non-zero address"
        );
        // adminAcceptArtistAddressesAndSplits
        expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .adminAcceptArtistAddressesAndSplits(
              ...proposeArtistPaymentAddressesAndSplitsArgs
            ),
          "Must input non-zero address"
        );
      });

      it("reverts on improper string inputs", async function () {
        const config = await loadFixture(_beforeEach);
        // addProject
        expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .addProject("", config.accounts.artist.address),
          "Must input non-empty string"
        );
        // updateProjectName
        expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProjectName(config.projectZero, ""),
          "Must input non-empty string"
        );
        // updateProjectArtistName
        expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProjectArtistName(config.projectZero, ""),
          "Must input non-empty string"
        );
        // updateProjectLicense
        expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProjectLicense(config.projectZero, ""),
          "Must input non-empty string"
        );
        // addProjectScript
        expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .addProjectScript(config.projectZero, ""),
          "Must input non-empty string"
        );
        // updateProjectScript
        expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProjectScript(config.projectZero, 0, ""),
          "Must input non-empty string"
        );
        // updateProjectAspectRatio
        expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProjectAspectRatio(config.projectZero, ""),
          "Must input non-empty string"
        );
        // updateProjectBaseURI
        expectRevert(
          config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectBaseURI(config.projectZero, ""),
          "Must input non-empty string"
        );
        // updateDefaultBaseURI
        expectRevert(
          config.genArt721Core
            .connect(config.accounts.deployer)
            .updateDefaultBaseURI(""),
          "Must input non-empty string"
        );
      });

      it("returns expected values for projectOne, with updated payment addresses and percentages only to Additional Payee Primary", async function () {
        const config = await loadFixture(_beforeEach);
        // add project
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .addProject("name", config.accounts.artist2.address);
        // artist2 populates an addditional payee
        await updateArtistFinance(
          config,
          config.projectOne,
          config.accounts.artist2,
          {
            artistAddress: config.accounts.artist2.address,
            additionalPayeePrimarySalesAddress:
              config.accounts.additional2.address,
            additionalPayeePrimarySalesPercentage: 100,
            additionalPayeeSecondarySalesAddress: config.accounts.user2.address,
            additionalPayeeSecondarySalesPercentage: 0,
          }
        );
        // update Art Blocks primary sales percentage to 20%
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksPrimarySalesPercentage(20);
        // change Art Blocks primary sales payment address to random address
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksPrimarySalesAddress(config.accounts.user.address);
        // check for expected values
        const revenueSplits = await config.genArt721Core
          .connect(config.accounts.user)
          .getPrimaryRevenueSplits(
            config.projectOne,
            ethers.utils.parseEther("1")
          );
        // expect revenue splits to be properly calculated
        // Art Blocks
        expect(revenueSplits.artblocksAddress_).to.be.equal(
          config.accounts.user.address
        );
        expect(revenueSplits.artblocksRevenue_).to.be.equal(
          ethers.utils.parseEther("0.20")
        );
        // Additional Payee (0.8 * 1.00 = 0.0.8)
        expect(revenueSplits.additionalPayeePrimaryAddress_).to.be.equal(
          config.accounts.additional2.address
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
        const config = await loadFixture(_beforeEach);
        // mint token for projectZero
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        // check for expected values
        const royaltiesData = await config.genArt721Core
          .connect(config.accounts.user)
          .getRoyalties(config.projectZeroTokenZero.toNumber());
        // Artist
        // This is a special case where expected revenue is 0, so not included in the array
        // Additional Payee
        // This is a special case where expected revenue is 0, so not included in the array
        // Art Blocks
        const artblocksSecondarySalesAddress =
          await config.genArt721Core.artblocksSecondarySalesAddress();
        expect(royaltiesData.recipients[0]).to.be.equal(
          artblocksSecondarySalesAddress
        );
        expect(royaltiesData.bps[0]).to.be.equal(250);
        expect(royaltiesData.recipients.length).to.be.equal(1);
        expect(royaltiesData.bps.length).to.be.equal(1);
      });

      it("returns expected configured values for valid projectOne token, three non-zero royalties", async function () {
        const config = await loadFixture(_beforeEach);
        // add project
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .addProject("name", config.accounts.artist2.address);
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .toggleProjectIsActive(config.projectOne);
        await config.genArt721Core
          .connect(config.accounts.artist2)
          .updateProjectMaxInvocations(
            config.projectOne,
            config.maxInvocations
          );

        // configure minter for project one
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(config.projectOne, config.minter.address);
        await config.minter
          .connect(config.accounts.artist2)
          .updatePricePerTokenInWei(config.projectOne, 0);

        // mint token for projectOne
        await config.minter
          .connect(config.accounts.artist2)
          .purchase(config.projectOne);

        // configure royalties for projectOne
        await config.genArt721Core
          .connect(config.accounts.artist2)
          .updateProjectSecondaryMarketRoyaltyPercentage(config.projectOne, 10);
        // artist2 populates an addditional payee
        await updateArtistFinance(
          config,
          config.projectOne,
          config.accounts.artist2,
          {
            artistAddress: config.accounts.artist2.address,
            additionalPayeePrimarySalesAddress: constants.ZERO_ADDRESS,
            additionalPayeePrimarySalesPercentage: 0,
            additionalPayeeSecondarySalesAddress:
              config.accounts.additional2.address,
            additionalPayeeSecondarySalesPercentage: 51,
          }
        );
        // update Art Blocks secondary BPS to 2.4%
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksSecondarySalesBPS(240);
        // change Art Blocks payment address to random address
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksSecondarySalesAddress(config.accounts.user.address);

        // check for expected values
        const royaltiesData = await config.genArt721Core
          .connect(config.accounts.user)
          .getRoyalties(config.projectOneTokenZero.toNumber());
        // Artist
        const artistAddress = config.accounts.artist2.address;
        expect(royaltiesData.recipients[0]).to.be.equal(artistAddress);
        // artist BPS = 10% * 100 (BPS/%) * 0.49 to artist = 490 BPS
        expect(royaltiesData.bps[0]).to.be.equal(490);
        // Additional Payee
        const projectIdToAdditionalPayeeSecondarySales =
          config.accounts.additional2.address;
        expect(royaltiesData.recipients[1]).to.be.equal(
          projectIdToAdditionalPayeeSecondarySales
        );
        // artist BPS = 10% * 100 (BPS/%) * 0.51 to additional = 510 BPS
        expect(royaltiesData.bps[1]).to.be.equal(510);
        // Art Blocks
        const artblocksSecondarySalesAddress = config.accounts.user.address;
        expect(royaltiesData.recipients[2]).to.be.equal(
          artblocksSecondarySalesAddress
        );
        expect(royaltiesData.bps[2]).to.be.equal(240);
      });

      it("returns expected configured values for valid projectOne token, only artist royalties are zero", async function () {
        const config = await loadFixture(_beforeEach);
        // add project
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .addProject("name", config.accounts.artist2.address);
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .toggleProjectIsActive(config.projectOne);
        await config.genArt721Core
          .connect(config.accounts.artist2)
          .updateProjectMaxInvocations(
            config.projectOne,
            config.maxInvocations
          );

        // configure minter for project one
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(config.projectOne, config.minter.address);
        await config.minter
          .connect(config.accounts.artist2)
          .updatePricePerTokenInWei(config.projectOne, 0);

        // mint token for projectOne
        await config.minter
          .connect(config.accounts.artist2)
          .purchase(config.projectOne);

        // configure royalties for projectOne
        await config.genArt721Core
          .connect(config.accounts.artist2)
          .updateProjectSecondaryMarketRoyaltyPercentage(config.projectOne, 10);
        // artist2 populates an addditional payee
        const proposeArtistPaymentAddressesAndSplitsArgs = [
          config.projectOne,
          config.accounts.artist2.address,
          constants.ZERO_ADDRESS,
          0,
          config.accounts.additional2.address, // additional secondary address
          100, // additonal secondary percentage
        ];
        await config.genArt721Core
          .connect(config.accounts.artist2)
          .proposeArtistPaymentAddressesAndSplits(
            ...proposeArtistPaymentAddressesAndSplitsArgs
          );
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(
            ...proposeArtistPaymentAddressesAndSplitsArgs
          );
        // update Art Blocks secondary BPS to 2.4%
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksSecondarySalesBPS(240);
        // change Art Blocks payment address to random address
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksSecondarySalesAddress(config.accounts.user.address);

        // check for expected values
        const royaltiesData = await config.genArt721Core
          .connect(config.accounts.user)
          .getRoyalties(config.projectOneTokenZero.toNumber());
        // Artist
        // This is a special case where expected revenue is 0, so not included in the array
        // Additional Payee
        const projectIdToAdditionalPayeeSecondarySales =
          config.accounts.additional2.address;
        expect(royaltiesData.recipients[0]).to.be.equal(
          projectIdToAdditionalPayeeSecondarySales
        );
        // artist BPS = 10% * 100 (BPS/%) * 1.00 to additional = 1000 BPS
        expect(royaltiesData.bps[0]).to.be.equal(1000);
        // Art Blocks
        const artblocksSecondarySalesAddress = config.accounts.user.address;
        expect(royaltiesData.recipients[1]).to.be.equal(
          artblocksSecondarySalesAddress
        );
        expect(royaltiesData.bps[1]).to.be.equal(240);
      });

      it("returns expected configured values for valid projectOne token, only additional payee royalties are zero", async function () {
        const config = await loadFixture(_beforeEach);
        // add project
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .addProject("name", config.accounts.artist2.address);
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .toggleProjectIsActive(config.projectOne);
        await config.genArt721Core
          .connect(config.accounts.artist2)
          .updateProjectMaxInvocations(
            config.projectOne,
            config.maxInvocations
          );

        // configure minter for project one
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(config.projectOne, config.minter.address);
        await config.minter
          .connect(config.accounts.artist2)
          .updatePricePerTokenInWei(config.projectOne, 0);

        // mint token for projectOne
        await config.minter
          .connect(config.accounts.artist2)
          .purchase(config.projectOne);

        // configure royalties for projectOne
        await config.genArt721Core
          .connect(config.accounts.artist2)
          .updateProjectSecondaryMarketRoyaltyPercentage(config.projectOne, 10);
        // artist2 populates an addditional payee
        await updateArtistFinance(
          config,
          config.projectOne,
          config.accounts.artist2,
          {
            artistAddress: config.accounts.artist2.address,
            additionalPayeePrimarySalesAddress: constants.ZERO_ADDRESS,
            additionalPayeePrimarySalesPercentage: 0,
            additionalPayeeSecondarySalesAddress:
              config.accounts.additional2.address,
            additionalPayeeSecondarySalesPercentage: 0,
          }
        );
        // update Art Blocks secondary BPS to 2.4%
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksSecondarySalesBPS(240);
        // change Art Blocks payment address to random address
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksSecondarySalesAddress(config.accounts.user.address);

        // check for expected values
        const royaltiesData = await config.genArt721Core
          .connect(config.accounts.user)
          .getRoyalties(config.projectOneTokenZero.toNumber());
        // Artist
        const artistAddress = config.accounts.artist2.address;
        expect(royaltiesData.recipients[0]).to.be.equal(artistAddress);
        // artist BPS = 10% * 100 (BPS/%) * 1.00 to artist = 1000 BPS
        expect(royaltiesData.bps[0]).to.be.equal(1000);
        // Additional Payee
        // This is a special case where expected revenue is 0, so not included in the array
        // Art Blocks
        const artblocksSecondarySalesAddress = config.accounts.user.address;
        expect(royaltiesData.recipients[1]).to.be.equal(
          artblocksSecondarySalesAddress
        );
        expect(royaltiesData.bps[1]).to.be.equal(240);
      });

      it("returns expected configured values for valid projectOne token, only Art Blocks royalties are zero", async function () {
        const config = await loadFixture(_beforeEach);
        // add project
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .addProject("name", config.accounts.artist2.address);
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .toggleProjectIsActive(config.projectOne);
        await config.genArt721Core
          .connect(config.accounts.artist2)
          .updateProjectMaxInvocations(
            config.projectOne,
            config.maxInvocations
          );

        // configure minter for project one
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(config.projectOne, config.minter.address);
        await config.minter
          .connect(config.accounts.artist2)
          .updatePricePerTokenInWei(config.projectOne, 0);

        // mint token for projectOne
        await config.minter
          .connect(config.accounts.artist2)
          .purchase(config.projectOne);

        // configure royalties for projectOne
        await config.genArt721Core
          .connect(config.accounts.artist2)
          .updateProjectSecondaryMarketRoyaltyPercentage(config.projectOne, 10);
        // artist2 populates an addditional payee
        await updateArtistFinance(
          config,
          config.projectOne,
          config.accounts.artist2,
          {
            artistAddress: config.accounts.artist2.address,
            additionalPayeePrimarySalesAddress: constants.ZERO_ADDRESS,
            additionalPayeePrimarySalesPercentage: 0,
            additionalPayeeSecondarySalesAddress:
              config.accounts.additional2.address,
            additionalPayeeSecondarySalesPercentage: 51,
          }
        );
        // update Art Blocks secondary BPS to 0%
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksSecondarySalesBPS(0);
        // change Art Blocks payment address to random address
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksSecondarySalesAddress(config.accounts.user.address);

        // check for expected values
        const royaltiesData = await config.genArt721Core
          .connect(config.accounts.user)
          .getRoyalties(config.projectOneTokenZero.toNumber());
        // Artist
        const artistAddress = config.accounts.artist2.address;
        expect(royaltiesData.recipients[0]).to.be.equal(artistAddress);
        // artist BPS = 10% * 100 (BPS/%) * 0.49 to artist = 490 BPS
        expect(royaltiesData.bps[0]).to.be.equal(490);
        // Additional Payee
        const projectIdToAdditionalPayeeSecondarySales =
          config.accounts.additional2.address;
        expect(royaltiesData.recipients[1]).to.be.equal(
          projectIdToAdditionalPayeeSecondarySales
        );
        // artist BPS = 10% * 100 (BPS/%) * 0.51 to additional = 510 BPS
        expect(royaltiesData.bps[1]).to.be.equal(510);
        // Art Blocks
        // This is a special case where expected revenue is 0, so not included in the array
        expect(royaltiesData.recipients.length).to.be.equal(2);
        expect(royaltiesData.bps.length).to.be.equal(2);
      });

      it("returns expected configured values for valid projectOne token, all royalties are zero", async function () {
        const config = await loadFixture(_beforeEach);
        // add project
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .addProject("name", config.accounts.artist2.address);
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .toggleProjectIsActive(config.projectOne);
        await config.genArt721Core
          .connect(config.accounts.artist2)
          .updateProjectMaxInvocations(
            config.projectOne,
            config.maxInvocations
          );

        // configure minter for project one
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(config.projectOne, config.minter.address);
        await config.minter
          .connect(config.accounts.artist2)
          .updatePricePerTokenInWei(config.projectOne, 0);

        // mint token for projectOne
        await config.minter
          .connect(config.accounts.artist2)
          .purchase(config.projectOne);

        // configure royalties for projectOne
        await config.genArt721Core
          .connect(config.accounts.artist2)
          .updateProjectSecondaryMarketRoyaltyPercentage(config.projectOne, 0);
        // artist2 populates an addditional payee
        await updateArtistFinance(
          config,
          config.projectOne,
          config.accounts.artist2,
          {
            artistAddress: config.accounts.artist2.address,
            additionalPayeePrimarySalesAddress: constants.ZERO_ADDRESS,
            additionalPayeePrimarySalesPercentage: 0,
            additionalPayeeSecondarySalesAddress:
              config.accounts.additional2.address,
            additionalPayeeSecondarySalesPercentage: 51,
          }
        );
        // update Art Blocks secondary BPS to 0%
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksSecondarySalesBPS(0);
        // change Art Blocks payment address to random address
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksSecondarySalesAddress(config.accounts.user.address);

        // check for expected values
        const royaltiesData = await config.genArt721Core
          .connect(config.accounts.user)
          .getRoyalties(config.projectOneTokenZero.toNumber());
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
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.user)
            .getRoyalties(config.projectZeroTokenZero.toNumber()),
          "Token ID does not exist"
        );
      });
    });

    describe("getRoyaltyData", function () {
      it("returns expected default values for valid projectZero token", async function () {
        const config = await loadFixture(_beforeEach);
        // mint token for projectZero
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        // check for expected values
        const royaltyData = await config.genArt721Core
          .connect(config.accounts.user)
          .getRoyaltyData(config.projectZeroTokenZero.toNumber());
        // Expect proper royalty data
        expect(royaltyData.artistAddress).to.be.equal(
          config.accounts.artist.address
        );
        expect(royaltyData.additionalPayee).to.be.equal(constants.ZERO_ADDRESS);
        expect(royaltyData.additionalPayeePercentage).to.be.equal(0);
        expect(royaltyData.royaltyFeeByID).to.be.equal(0);
      });

      it("returns expected configured values for valid projectOne token, three non-zero royalties", async function () {
        const config = await loadFixture(_beforeEach);
        // add project
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .addProject("name", config.accounts.artist2.address);
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .toggleProjectIsActive(config.projectOne);
        await config.genArt721Core
          .connect(config.accounts.artist2)
          .updateProjectMaxInvocations(
            config.projectOne,
            config.maxInvocations
          );

        // configure minter for project one
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(config.projectOne, config.minter.address);
        await config.minter
          .connect(config.accounts.artist2)
          .updatePricePerTokenInWei(config.projectOne, 0);

        // mint token for projectOne
        await config.minter
          .connect(config.accounts.artist2)
          .purchase(config.projectOne);

        // configure royalties for projectOne
        await config.genArt721Core
          .connect(config.accounts.artist2)
          .updateProjectSecondaryMarketRoyaltyPercentage(config.projectOne, 10);
        // artist2 populates an addditional payee
        await updateArtistFinance(
          config,
          config.projectOne,
          config.accounts.artist2,
          {
            artistAddress: config.accounts.artist2.address,
            additionalPayeePrimarySalesAddress: constants.ZERO_ADDRESS,
            additionalPayeePrimarySalesPercentage: 0,
            additionalPayeeSecondarySalesAddress:
              config.accounts.additional2.address,
            additionalPayeeSecondarySalesPercentage: 51,
          }
        );
        // update Art Blocks secondary BPS to 2.4%
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksSecondarySalesBPS(240);
        // change Art Blocks payment address to random address
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksSecondarySalesAddress(config.accounts.user.address);

        // check for expected values
        const royaltyData = await config.genArt721Core
          .connect(config.accounts.user)
          .getRoyaltyData(config.projectOneTokenZero.toNumber());
        // Expect proper royalty data
        expect(royaltyData.artistAddress).to.be.equal(
          config.accounts.artist2.address
        );
        expect(royaltyData.additionalPayee).to.be.equal(
          config.accounts.additional2.address
        );
        expect(royaltyData.additionalPayeePercentage).to.be.equal(51);
        expect(royaltyData.royaltyFeeByID).to.be.equal(10);
      });

      it("returns expected configured values for valid projectOne token, only artist royalties are zero", async function () {
        const config = await loadFixture(_beforeEach);
        // add project
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .addProject("name", config.accounts.artist2.address);
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .toggleProjectIsActive(config.projectOne);
        await config.genArt721Core
          .connect(config.accounts.artist2)
          .updateProjectMaxInvocations(
            config.projectOne,
            config.maxInvocations
          );

        // configure minter for project one
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(config.projectOne, config.minter.address);
        await config.minter
          .connect(config.accounts.artist2)
          .updatePricePerTokenInWei(config.projectOne, 0);

        // mint token for projectOne
        await config.minter
          .connect(config.accounts.artist2)
          .purchase(config.projectOne);

        // configure royalties for projectOne
        await config.genArt721Core
          .connect(config.accounts.artist2)
          .updateProjectSecondaryMarketRoyaltyPercentage(config.projectOne, 10);
        // artist2 populates an addditional payee
        await updateArtistFinance(
          config,
          config.projectOne,
          config.accounts.artist2,
          {
            artistAddress: config.accounts.artist2.address,
            additionalPayeePrimarySalesAddress: constants.ZERO_ADDRESS,
            additionalPayeePrimarySalesPercentage: 0,
            additionalPayeeSecondarySalesAddress:
              config.accounts.additional2.address,
            additionalPayeeSecondarySalesPercentage: 100,
          }
        );
        // update Art Blocks secondary BPS to 2.4%
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksSecondarySalesBPS(240);
        // change Art Blocks payment address to random address
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksSecondarySalesAddress(config.accounts.user.address);

        // check for expected values
        const royaltyData = await config.genArt721Core
          .connect(config.accounts.user)
          .getRoyaltyData(config.projectOneTokenZero.toNumber());
        // Expect proper royalty data
        expect(royaltyData.artistAddress).to.be.equal(
          config.accounts.artist2.address
        );
        expect(royaltyData.additionalPayee).to.be.equal(
          config.accounts.additional2.address
        );
        expect(royaltyData.additionalPayeePercentage).to.be.equal(100);
        expect(royaltyData.royaltyFeeByID).to.be.equal(10);
      });

      it("returns expected configured values for valid projectOne token, only additional payee royalties are zero", async function () {
        const config = await loadFixture(_beforeEach);
        // add project
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .addProject("name", config.accounts.artist2.address);
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .toggleProjectIsActive(config.projectOne);
        await config.genArt721Core
          .connect(config.accounts.artist2)
          .updateProjectMaxInvocations(
            config.projectOne,
            config.maxInvocations
          );

        // configure minter for project one
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(config.projectOne, config.minter.address);
        await config.minter
          .connect(config.accounts.artist2)
          .updatePricePerTokenInWei(config.projectOne, 0);

        // mint token for projectOne
        await config.minter
          .connect(config.accounts.artist2)
          .purchase(config.projectOne);

        // configure royalties for projectOne
        await config.genArt721Core
          .connect(config.accounts.artist2)
          .updateProjectSecondaryMarketRoyaltyPercentage(config.projectOne, 10);
        // artist2 populates an addditional payee
        await updateArtistFinance(
          config,
          config.projectOne,
          config.accounts.artist2,
          {
            artistAddress: config.accounts.artist2.address,
            additionalPayeePrimarySalesAddress: constants.ZERO_ADDRESS,
            additionalPayeePrimarySalesPercentage: 0,
            additionalPayeeSecondarySalesAddress:
              config.accounts.additional2.address,
            additionalPayeeSecondarySalesPercentage: 0,
          }
        );
        // update Art Blocks secondary BPS to 2.4%
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksSecondarySalesBPS(240);
        // change Art Blocks payment address to random address
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksSecondarySalesAddress(config.accounts.user.address);

        // check for expected values
        const royaltyData = await config.genArt721Core
          .connect(config.accounts.user)
          .getRoyaltyData(config.projectOneTokenZero.toNumber());
        // Expect proper royalty data
        expect(royaltyData.artistAddress).to.be.equal(
          config.accounts.artist2.address
        );
        expect(royaltyData.additionalPayee).to.be.equal(
          config.accounts.additional2.address
        );
        expect(royaltyData.additionalPayeePercentage).to.be.equal(0);
        expect(royaltyData.royaltyFeeByID).to.be.equal(10);
      });

      it("reverts when asking for invalid token", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.user)
            .getRoyalties(config.projectZeroTokenZero.toNumber()),
          "Token ID does not exist"
        );
      });
    });

    describe("artblocksPrimarySalesPercentage", function () {
      it("returns expected default value", async function () {
        const config = await loadFixture(_beforeEach);
        // check for expected values
        const viewData = await config.genArt721Core
          .connect(config.accounts.user)
          .artblocksPrimarySalesPercentage();
        expect(viewData).to.be.equal(10);
      });

      it("returns expected configured values for projectZero", async function () {
        const config = await loadFixture(_beforeEach);
        // configure Art Blocks primary sales percentage
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksPrimarySalesPercentage(11);

        // check for expected values
        const viewData = await config.genArt721Core
          .connect(config.accounts.user)
          .artblocksPrimarySalesPercentage();
        expect(viewData).to.be.equal(11);
      });
    });

    describe("projectIdToSecondaryMarketRoyaltyPercentage", function () {
      it("returns expected default value", async function () {
        const config = await loadFixture(_beforeEach);
        // check for expected values
        const viewData = await config.genArt721Core
          .connect(config.accounts.user)
          .projectIdToSecondaryMarketRoyaltyPercentage(config.projectZero);
        expect(viewData).to.be.equal(0);
      });

      it("returns expected configured values for projectZero", async function () {
        const config = await loadFixture(_beforeEach);
        // configure royalties for projectOne
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectSecondaryMarketRoyaltyPercentage(
            config.projectZero,
            10
          );

        // check for expected values
        const viewData = await config.genArt721Core
          .connect(config.accounts.user)
          .projectIdToSecondaryMarketRoyaltyPercentage(config.projectZero);
        expect(viewData).to.be.equal(10);
      });
    });

    describe("projectIdToAdditionalPayeePrimarySales", function () {
      it("returns expected default value", async function () {
        const config = await loadFixture(_beforeEach);
        // check for expected values
        const viewData = await config.genArt721Core
          .connect(config.accounts.user)
          .projectIdToAdditionalPayeePrimarySales(config.projectZero);
        expect(viewData).to.be.equal(constants.ZERO_ADDRESS);
      });

      it("returns expected configured values for projectOne", async function () {
        const config = await loadFixture(_beforeEach);
        // add project
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .addProject("name", config.accounts.artist2.address);
        // artist2 populates an addditional payee
        await updateArtistFinance(
          config,
          config.projectOne,
          config.accounts.artist2,
          {
            artistAddress: config.accounts.artist2.address,
            additionalPayeePrimarySalesAddress:
              config.accounts.additional.address,
            additionalPayeePrimarySalesPercentage: 49,
            additionalPayeeSecondarySalesAddress:
              config.accounts.additional2.address,
            additionalPayeeSecondarySalesPercentage: 51,
          }
        );
        // check for expected values
        const viewData = await config.genArt721Core
          .connect(config.accounts.user)
          .projectIdToAdditionalPayeePrimarySales(config.projectOne);
        expect(viewData).to.be.equal(config.accounts.additional.address);
      });
    });

    describe("projectIdToAdditionalPayeePrimarySalesPercentage", function () {
      it("returns expected default value", async function () {
        const config = await loadFixture(_beforeEach);
        // check for expected values
        const viewData = await config.genArt721Core
          .connect(config.accounts.user)
          .projectIdToAdditionalPayeePrimarySalesPercentage(config.projectZero);
        expect(viewData).to.be.equal(0);
      });

      it("returns expected configured values for projectOne", async function () {
        const config = await loadFixture(_beforeEach);
        // add project
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .addProject("name", config.accounts.artist2.address);
        // artist2 populates an addditional payee
        await updateArtistFinance(
          config,
          config.projectOne,
          config.accounts.artist2,
          {
            artistAddress: config.accounts.artist2.address,
            additionalPayeePrimarySalesAddress:
              config.accounts.additional.address,
            additionalPayeePrimarySalesPercentage: 49,
            additionalPayeeSecondarySalesAddress:
              config.accounts.additional2.address,
            additionalPayeeSecondarySalesPercentage: 51,
          }
        );
        // check for expected values
        const viewData = await config.genArt721Core
          .connect(config.accounts.user)
          .projectIdToAdditionalPayeePrimarySalesPercentage(config.projectOne);
        expect(viewData).to.be.equal(49);
      });
    });

    describe("projectIdToAdditionalPayeeSecondarySales", function () {
      it("returns expected default value", async function () {
        const config = await loadFixture(_beforeEach);
        // check for expected values
        const viewData = await config.genArt721Core
          .connect(config.accounts.user)
          .projectIdToAdditionalPayeeSecondarySales(config.projectZero);
        expect(viewData).to.be.equal(constants.ZERO_ADDRESS);
      });

      it("returns expected configured values for projectOne", async function () {
        const config = await loadFixture(_beforeEach);
        // add project
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .addProject("name", config.accounts.artist2.address);
        // artist2 populates an addditional payee
        await updateArtistFinance(
          config,
          config.projectOne,
          config.accounts.artist2,
          {
            artistAddress: config.accounts.artist2.address,
            additionalPayeePrimarySalesAddress:
              config.accounts.additional.address,
            additionalPayeePrimarySalesPercentage: 49,
            additionalPayeeSecondarySalesAddress:
              config.accounts.additional2.address,
            additionalPayeeSecondarySalesPercentage: 51,
          }
        );
        // check for expected values
        const viewData = await config.genArt721Core
          .connect(config.accounts.user)
          .projectIdToAdditionalPayeeSecondarySales(config.projectOne);
        expect(viewData).to.be.equal(config.accounts.additional2.address);
      });
    });

    describe("projectIdToAdditionalPayeeSecondarySalesPercentage", function () {
      it("returns expected default value", async function () {
        const config = await loadFixture(_beforeEach);
        // check for expected values
        const viewData = await config.genArt721Core
          .connect(config.accounts.user)
          .projectIdToAdditionalPayeeSecondarySalesPercentage(
            config.projectZero
          );
        expect(viewData).to.be.equal(0);
      });

      it("returns expected configured values for projectOne", async function () {
        const config = await loadFixture(_beforeEach);
        // add project
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .addProject("name", config.accounts.artist2.address);
        // artist2 populates an addditional payee
        await updateArtistFinance(
          config,
          config.projectOne,
          config.accounts.artist2,
          {
            artistAddress: config.accounts.artist2.address,
            additionalPayeePrimarySalesAddress:
              config.accounts.additional.address,
            additionalPayeePrimarySalesPercentage: 49,
            additionalPayeeSecondarySalesAddress:
              config.accounts.additional2.address,
            additionalPayeeSecondarySalesPercentage: 51,
          }
        );
        // check for expected values
        const viewData = await config.genArt721Core
          .connect(config.accounts.user)
          .projectIdToAdditionalPayeeSecondarySalesPercentage(
            config.projectOne
          );
        expect(viewData).to.be.equal(51);
      });
    });

    describe("numHistoricalRandomizers", function () {
      it("returns value of one upon initial configuration", async function () {
        const config = await loadFixture(_beforeEach);
        const numHistoricalRandomizers = await config.genArt721Core
          .connect(config.accounts.user)
          .numHistoricalRandomizers();
        expect(numHistoricalRandomizers).to.be.equal(1);
      });

      it("increments value when more randomizers are added", async function () {
        const config = await loadFixture(_beforeEach);
        // update to dummy randomizer address
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateRandomizerAddress(config.accounts.deployer.address);
        // expect incremented number of randomizers
        const numHistoricalRandomizers = await config.genArt721Core
          .connect(config.accounts.user)
          .numHistoricalRandomizers();
        expect(numHistoricalRandomizers).to.be.equal(2);
      });
    });

    describe("getHistoricalRandomizerAt", function () {
      it("returns initial randomizer at index of zero upon initial configuration", async function () {
        const config = await loadFixture(_beforeEach);
        const randomizerAddress = await config.genArt721Core
          .connect(config.accounts.user)
          .getHistoricalRandomizerAt(0);
        expect(randomizerAddress).to.be.equal(config.randomizer.address);
      });

      it("returns initial and next randomizer at expected indices when >1 randomizer in history", async function () {
        const config = await loadFixture(_beforeEach);
        // update to dummy randomizer address
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateRandomizerAddress(config.accounts.deployer.address);
        // expect initial randomizer at index zero
        const initialRandomizer = await config.genArt721Core
          .connect(config.accounts.user)
          .getHistoricalRandomizerAt(0);
        expect(initialRandomizer).to.be.equal(config.randomizer.address);
        // expect next randomizer at index one
        const nextRandomizer = await config.genArt721Core
          .connect(config.accounts.user)
          .getHistoricalRandomizerAt(1);
        expect(nextRandomizer).to.be.equal(config.accounts.deployer.address);
      });

      it("reverts when invalid index is queried", async function () {
        const config = await loadFixture(_beforeEach);
        // expect revert when query out of bounds index
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.user)
            .getHistoricalRandomizerAt(2),
          "Index out of bounds"
        );
      });
    });

    describe("projectScriptByIndex", function () {
      it("returns empty string by default", async function () {
        const config = await loadFixture(_beforeEach);
        const emptyProjectScript = await config.genArt721Core
          .connect(config.accounts.user)
          .projectScriptByIndex(config.projectZero, 0);
        expect(emptyProjectScript).to.be.equal("");
      });

      it("returns expected populated string", async function () {
        const config = await loadFixture(_beforeEach);
        // add a couple project scripts
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectScript(config.projectZero, "console.log('hello')");
        await config.genArt721Core
          .connect(config.accounts.artist)
          .addProjectScript(config.projectZero, "console.log('world')");
        const projectScript = await config.genArt721Core
          .connect(config.accounts.user)
          .projectScriptByIndex(config.projectZero, 1);
        expect(projectScript).to.be.equal("console.log('world')");
      });
    });

    describe("projectURIInfo", function () {
      it("returns default string by default", async function () {
        const config = await loadFixture(_beforeEach);
        const emptyProjectURI = await config.genArt721Core
          .connect(config.accounts.user)
          .projectURIInfo(config.projectZero);
        if (coreContractName === "GenArt721CoreV3") {
          expect(emptyProjectURI).to.be.equal("https://token.artblocks.io/");
        } else if (coreContractName === "GenArt721CoreV3_Explorations") {
          expect(emptyProjectURI).to.be.equal(
            `https://token.artblocks.io/${config.genArt721Core.address.toLowerCase()}/`
          );
        } else {
          throw new Error("Invalid core contract name");
        }
      });

      it("returns expected populated projectURI", async function () {
        const config = await loadFixture(_beforeEach);
        // add a couple project scripts
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectBaseURI(config.projectZero, "https://example.com/");
        const projectURI = await config.genArt721Core
          .connect(config.accounts.user)
          .projectURIInfo(config.projectZero);
        expect(projectURI).to.be.equal("https://example.com/");
      });
    });

    describe("tokenURI", function () {
      it("returns default base URI if projectURI is not populated", async function () {
        const config = await loadFixture(_beforeEach);
        // mint token for projectZero
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        // check tokenURI
        const tokenURIForDefaultProjectURI = await config.genArt721Core
          .connect(config.accounts.user)
          .tokenURI(config.projectZeroTokenZero.toNumber());
        if (coreContractName === "GenArt721CoreV3") {
          expect(tokenURIForDefaultProjectURI).to.be.equal(
            `https://token.artblocks.io/${config.projectZeroTokenZero.toString()}`
          );
        } else if (coreContractName === "GenArt721CoreV3_Explorations") {
          expect(tokenURIForDefaultProjectURI).to.be.equal(
            `https://token.artblocks.io/${config.genArt721Core.address.toLowerCase()}/${config.projectZeroTokenZero.toString()}`
          );
        } else {
          throw new Error("Invalid core contract name");
        }
      });

      it("returns updated default base URI if contract base URI is updated after constructor", async function () {
        const config = await loadFixture(_beforeEach);
        // update contract base URI
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateDefaultBaseURI("https://tokenz.AB.com/");
        // add new project
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .addProject("projectOne", config.accounts.artist.address);
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .toggleProjectIsActive(config.projectOne);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(
            config.projectOne,
            config.maxInvocations
          );

        // configure minter for project zero
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(config.projectOne, config.minter.address);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(config.projectOne, 0);
        // mint token for projectOne
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectOne);

        // check tokenURI
        const tokenURIForEmptyProjectURI = await config.genArt721Core
          .connect(config.accounts.user)
          .tokenURI(config.projectOneTokenZero.toNumber());
        expect(tokenURIForEmptyProjectURI).to.be.equal(
          `https://tokenz.AB.com/${config.projectOneTokenZero.toString()}`
        );
      });

      it("returns expected tokenURI after a populated projectURI", async function () {
        const config = await loadFixture(_beforeEach);
        // mint token for projectZero
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        // set project base URI to non-empty string
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectBaseURI(config.projectZero, "https://example.com/");
        // check tokenURI
        const tokenURI = await config.genArt721Core
          .connect(config.accounts.user)
          .tokenURI(config.projectZeroTokenZero.toNumber());
        expect(tokenURI).to.be.equal(
          `https://example.com/${config.projectZeroTokenZero.toString()}`
        );
      });

      it("returns expected tokenURI after a populated projectURI (short URI edge-case)", async function () {
        const config = await loadFixture(_beforeEach);
        // mint token for projectZero
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        // set project base URI to non-empty string
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectBaseURI(config.projectZero, "/");
        // check tokenURI
        const tokenURI = await config.genArt721Core
          .connect(config.accounts.user)
          .tokenURI(config.projectZeroTokenZero.toNumber());
        expect(tokenURI).to.be.equal(
          `/${config.projectZeroTokenZero.toString()}`
        );
      });

      it("returns expected tokenURI after a populated projectURI (long URI edge-case)", async function () {
        const config = await loadFixture(_beforeEach);
        const longURI = "https://example.com/".repeat(100);
        // mint token for projectZero
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        // set project base URI to non-empty string
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectBaseURI(config.projectZero, longURI);
        // check tokenURI
        const tokenURI = await config.genArt721Core
          .connect(config.accounts.user)
          .tokenURI(config.projectZeroTokenZero.toNumber());
        expect(tokenURI).to.be.equal(
          `${longURI}${config.projectZeroTokenZero.toString()}`
        );
      });

      it("reverts when token does not exist", async function () {
        const config = await loadFixture(_beforeEach);
        // expect revert when token does not exist
        await expectRevert(
          config.genArt721Core
            .connect(config.accounts.user)
            .tokenURI(config.projectZeroTokenZero.toNumber()),
          "Token ID does not exist"
        );
      });
    });

    describe("isMintWhitelisted", function () {
      it("returns true for minterFilter", async function () {
        const config = await loadFixture(_beforeEach);
        const emptyProjectURI = await config.genArt721Core
          .connect(config.accounts.user)
          .projectURIInfo(config.projectZero);
        expect(
          await config.genArt721Core
            .connect(config.accounts.user)
            .isMintWhitelisted(config.minterFilter.address)
        ).to.be.true;
      });

      it("returns false for non-minterFilter", async function () {
        const config = await loadFixture(_beforeEach);
        const emptyProjectURI = await config.genArt721Core
          .connect(config.accounts.user)
          .projectURIInfo(config.projectZero);
        expect(
          await config.genArt721Core
            .connect(config.accounts.user)
            .isMintWhitelisted(config.minter.address)
        ).to.be.false;
      });
    });

    describe("tokenIdToProjectId", function () {
      it("returns expected value", async function () {
        const config = await loadFixture(_beforeEach);
        // project Zero, token zero
        let projectId = await config.genArt721Core
          .connect(config.accounts.user)
          .tokenIdToProjectId(config.projectZeroTokenZero.toNumber());
        expect(projectId).to.be.equal(config.projectZero);
        // project One, token zero
        projectId = await config.genArt721Core
          .connect(config.accounts.user)
          .tokenIdToProjectId(config.projectOneTokenZero.toNumber());
        expect(projectId).to.be.equal(config.projectOne);
        // project One, token one
        projectId = await config.genArt721Core
          .connect(config.accounts.user)
          .tokenIdToProjectId(config.projectOneTokenOne.toNumber());
        expect(projectId).to.be.equal(config.projectOne);
        // project Two, token one
        projectId = await config.genArt721Core
          .connect(config.accounts.user)
          .tokenIdToProjectId(config.projectTwoTokenOne.toNumber());
        expect(projectId).to.be.equal(config.projectTwo);
      });
    });
  });
}
