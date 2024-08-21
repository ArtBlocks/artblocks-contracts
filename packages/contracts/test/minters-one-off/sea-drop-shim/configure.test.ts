import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../util/common";
import { ethers } from "hardhat";
import { expect } from "chai";

import { T_Config } from "../../util/common";
import {
  GenArt721CoreV3_Engine,
  MinterFilterV2,
  SeaDropXArtBlocksShim,
} from "../../../scripts/contracts";
import { ZERO_ADDRESS } from "../../../scripts/util/constants";
import { revertMessages } from "./constants";

interface T_SeaDropShimTestConfig extends T_Config {
  genArt721Core: GenArt721CoreV3_Engine;
  minterFilter: MinterFilterV2;
  minter: SeaDropXArtBlocksShim;
  projectZero: number;
}

// @dev testing with V3 engine sufficient - no different logic is tested with flex, etc.
const runForEach = [
  {
    core: "GenArt721CoreV3_Engine",
  },
];

// we don't mock SeaDrop contract, instead rely on end-to-end testing on testnet for SeaDrop integration
// @dev this maintains security via testing our contract logic, but also tests the integration with SeaDrop
// on systems outside of our dev environment and developed by third party teams
const SEA_DROP_ADDRESS = ethers.Wallet.createRandom().address;

const ERROR_CALL_NON_CONTRACT = "function call to a non-contract account";

runForEach.forEach((params) => {
  describe(`SeaDropXArtBlocksShim Configure w/ core ${params.core}`, async function () {
    async function _beforeEach() {
      // load minter filter V2 fixture
      const config = await loadFixture(setupConfigWitMinterFilterV2Suite);
      // deploy core contract and register on core registry
      ({
        genArt721Core: config.genArt721Core,
        randomizer: config.randomizer,
        adminACL: config.adminACL,
      } = await deployCore(config, params.core, config.coreRegistry));

      // update core's minter as the minter filter
      await config.genArt721Core.updateMinterContract(
        config.minterFilter.address
      );

      // Project setup (do prior to minter deployment for pre-syncing artist address in constructor test)
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );

      config.minter = await deployAndGet(config, "SeaDropXArtBlocksShim", [
        config.minterFilter.address,
        SEA_DROP_ADDRESS,
        config.genArt721Core.address,
        config.projectZero,
      ]);

      // approve and set minter for project
      await config.minterFilter
        .connect(config.accounts.deployer)
        .approveMinterForContract(
          config.genArt721Core.address,
          config.minter.address
        );
      await config.minterFilter.setMinterForProject(
        config.projectZero,
        config.genArt721Core.address,
        config.minter.address
      );

      // set up project 0
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 15);

      return config as T_SeaDropShimTestConfig;
    }

    describe("Deployment", async function () {
      it("set SeaDrop address in constructor", async function () {
        const config = await loadFixture(_beforeEach);
        const actualSeaDropAddress = await config.minter.allowedSeaDrop();
        expect(actualSeaDropAddress).to.equal(SEA_DROP_ADDRESS);
      });

      it("set GenArt721Core address in constructor", async function () {
        const config = await loadFixture(_beforeEach);
        const actualCoreAddress = await config.minter.genArt721Core();
        expect(actualCoreAddress).to.equal(config.genArt721Core.address);
      });

      it("set project as projectZero in constructor", async function () {
        const config = await loadFixture(_beforeEach);
        const actualProjectZero = await config.minter.projectId();
        expect(actualProjectZero).to.equal(config.projectZero);
      });

      it("set artist as owner in constructor", async function () {
        const config = await loadFixture(_beforeEach);
        const actualOwner = await config.minter.owner();
        expect(actualOwner).to.equal(config.accounts.artist.address);
      });
    });

    describe("syncOwnerToArtistAddress", async function () {
      it("updates to new artist address", async function () {
        const config = await loadFixture(_beforeEach);
        const newArtistAddress = config.accounts.artist2.address;
        await config.genArt721Core.updateProjectArtistAddress(
          config.projectZero,
          newArtistAddress
        );
        await config.minter.syncOwnerToArtistAddress();
        const actualOwner = await config.minter.owner();
        expect(actualOwner).to.equal(newArtistAddress);
      });
    });

    describe("updateAllowedSeaDrop", async function () {
      it("reverts as not supported", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter.updateAllowedSeaDrop([ZERO_ADDRESS]),
          revertMessages.updateAllowedSeaDropNotSupported
        );
      });
    });

    describe("updatePublicDrop", async function () {
      const newDropData = {
        mintPrice: 0,
        startTime: 0,
        endTime: 1000,
        maxTotalMintableByWallet: 2,
        feeBps: 0,
        restrictFeeRecipients: false,
      };

      it("reverts on not artist", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .updatePublicDrop(SEA_DROP_ADDRESS, newDropData),
          revertMessages.onlyArtistOrSelf
        );
      });

      it("reverts on wrong SeaDrop address", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .updatePublicDrop(ZERO_ADDRESS, newDropData)
        ).to.be.revertedWithCustomError(config.minter, "OnlyAllowedSeaDrop");
      });

      it("calls SeaDrop implementation when called by artist", async function () {
        const config = await loadFixture(_beforeEach);
        // will still revert as SeaDrop not implemented/mocked, but not with authentication error
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .updatePublicDrop(SEA_DROP_ADDRESS, newDropData),
          ERROR_CALL_NON_CONTRACT
        );
      });
    });

    describe("updateAllowList", async function () {
      const newAllowListData = {
        merkleRoot: ethers.constants.HashZero,
        publicKeyURIs: [],
        allowListURI: "",
      };
      it("reverts on not artist", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .updateAllowList(ZERO_ADDRESS, newAllowListData),
          revertMessages.onlyArtistOrSelf
        );
      });

      it("reverts on wrong SeaDrop address", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .updateAllowList(ZERO_ADDRESS, newAllowListData)
        ).to.be.revertedWithCustomError(config.minter, "OnlyAllowedSeaDrop");
      });

      it("calls SeaDrop implementation when called by artist", async function () {
        const config = await loadFixture(_beforeEach);
        // will still revert as SeaDrop not implemented/mocked, but not with authentication error
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .updateAllowList(SEA_DROP_ADDRESS, newAllowListData),
          ERROR_CALL_NON_CONTRACT
        );
      });
    });

    describe("updateTokenGatedDrop", async function () {
      const tokenGatedDropStage = {
        mintPrice: 0,
        maxTotalMintableByWallet: 1,
        startTime: 0,
        endTime: 1000,
        dropStageIndex: 0,
        maxTokenSupplyForStage: 100,
        feeBps: 100,
        restrictFeeRecipients: true,
      };
      it("reverts on not artist", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .updateTokenGatedDrop(
              SEA_DROP_ADDRESS,
              ZERO_ADDRESS,
              tokenGatedDropStage
            ),
          revertMessages.onlyArtistOrSelf
        );
      });

      it("reverts on wrong SeaDrop address", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .updateTokenGatedDrop(
              ZERO_ADDRESS,
              ZERO_ADDRESS,
              tokenGatedDropStage
            )
        ).to.be.revertedWithCustomError(config.minter, "OnlyAllowedSeaDrop");
      });

      it("calls SeaDrop implementation when called by artist", async function () {
        const config = await loadFixture(_beforeEach);
        // will still revert as SeaDrop not implemented/mocked, but not with authentication error
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .updateTokenGatedDrop(
              SEA_DROP_ADDRESS,
              ZERO_ADDRESS,
              tokenGatedDropStage
            ),
          ERROR_CALL_NON_CONTRACT
        );
      });
    });

    describe("updateDropURI", async function () {
      it("reverts on not artist", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .updateDropURI(SEA_DROP_ADDRESS, ""),
          revertMessages.onlyArtistOrSelf
        );
      });

      it("reverts on wrong SeaDrop address", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .updateDropURI(ZERO_ADDRESS, "")
        ).to.be.revertedWithCustomError(config.minter, "OnlyAllowedSeaDrop");
      });

      it("calls SeaDrop implementation when called by artist", async function () {
        const config = await loadFixture(_beforeEach);
        // will still revert as SeaDrop not implemented/mocked, but not with authentication error
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .updateDropURI(SEA_DROP_ADDRESS, ""),
          ERROR_CALL_NON_CONTRACT
        );
      });
    });

    describe("updateCreatorPayoutAddress", async function () {
      it("reverts on not artist", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .updateCreatorPayoutAddress(SEA_DROP_ADDRESS, ZERO_ADDRESS),
          revertMessages.onlyArtistOrSelf
        );
      });

      it("reverts on wrong SeaDrop address", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .updateCreatorPayoutAddress(ZERO_ADDRESS, ZERO_ADDRESS)
        ).to.be.revertedWithCustomError(config.minter, "OnlyAllowedSeaDrop");
      });

      it("calls SeaDrop implementation when called by artist", async function () {
        const config = await loadFixture(_beforeEach);
        // will still revert as SeaDrop not implemented/mocked, but not with authentication error
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .updateCreatorPayoutAddress(SEA_DROP_ADDRESS, ZERO_ADDRESS),
          ERROR_CALL_NON_CONTRACT
        );
      });
    });

    // while fees do not affect minted tokens, allowing fees to be set makes OS UI work as expected, and
    // therefore does not cause reverts in our contract logic
    describe("updateAllowedFeeRecipient", async function () {
      it("reverts on not artist", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .updateAllowedFeeRecipient(SEA_DROP_ADDRESS, ZERO_ADDRESS, true),
          revertMessages.onlyArtistOrSelf
        );
      });

      it("reverts on wrong SeaDrop address", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .updateAllowedFeeRecipient(ZERO_ADDRESS, ZERO_ADDRESS, true)
        ).to.be.revertedWithCustomError(config.minter, "OnlyAllowedSeaDrop");
      });

      it("calls SeaDrop implementation when called by artist", async function () {
        const config = await loadFixture(_beforeEach);
        // will still revert as SeaDrop not implemented/mocked, but not with authentication error
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .updateAllowedFeeRecipient(SEA_DROP_ADDRESS, ZERO_ADDRESS, true),
          ERROR_CALL_NON_CONTRACT
        );
      });
    });

    describe("updateSignedMintValidationParams", async function () {
      const signedMintValidationParams = {
        minMintPrice: 0,
        maxMaxTotalMintableByWallet: 1,
        minStartTime: 0,
        maxEndTime: 1000,
        maxMaxTokenSupplyForStage: 100,
        minFeeBps: 0,
        maxFeeBps: 100,
      };
      it("reverts on not artist", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .updateSignedMintValidationParams(
              SEA_DROP_ADDRESS,
              ZERO_ADDRESS,
              signedMintValidationParams
            ),
          revertMessages.onlyArtistOrSelf
        );
      });

      it("reverts on wrong SeaDrop address", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .updateSignedMintValidationParams(
              ZERO_ADDRESS,
              ZERO_ADDRESS,
              signedMintValidationParams
            )
        ).to.be.revertedWithCustomError(config.minter, "OnlyAllowedSeaDrop");
      });

      it("calls SeaDrop implementation when called by artist", async function () {
        const config = await loadFixture(_beforeEach);
        // will still revert as SeaDrop not implemented/mocked, but not with authentication error
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .updateSignedMintValidationParams(
              SEA_DROP_ADDRESS,
              ZERO_ADDRESS,
              signedMintValidationParams
            ),
          ERROR_CALL_NON_CONTRACT
        );
      });
    });

    describe("updatePayer", async function () {
      it("reverts on not artist", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .updatePayer(SEA_DROP_ADDRESS, ZERO_ADDRESS, true),
          revertMessages.onlyArtistOrSelf
        );
      });

      it("reverts on wrong SeaDrop address", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .updatePayer(ZERO_ADDRESS, ZERO_ADDRESS, true)
        ).to.be.revertedWithCustomError(config.minter, "OnlyAllowedSeaDrop");
      });

      it("calls SeaDrop implementation when called by artist", async function () {
        const config = await loadFixture(_beforeEach);
        // will still revert as SeaDrop not implemented/mocked, but not with authentication error
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .updatePayer(SEA_DROP_ADDRESS, ZERO_ADDRESS, true),
          ERROR_CALL_NON_CONTRACT
        );
      });
    });

    describe("setBaseURI", async function () {
      it("reverts as not supported", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter.setBaseURI(""),
          revertMessages.setBaseURINotSupported
        );
      });
    });

    describe("setContractURI", async function () {
      it("reverts as not supported", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter.setContractURI(""),
          revertMessages.setContractURINotSupported
        );
      });
    });

    describe("setMaxSupply", async function () {
      it("reverts on not artist", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter.connect(config.accounts.deployer).setMaxSupply(1),
          revertMessages.onlyArtistOrSelf
        );
      });

      it("reverts when maxSupply > core max invocations", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter.connect(config.accounts.artist).setMaxSupply(16),
          revertMessages.maxSupplyExceedsMaxInvocations
        );
      });

      it("updates maxSupply when less than core max invocations", async function () {
        const config = await loadFixture(_beforeEach);
        const configuredValue = 10;
        await config.minter
          .connect(config.accounts.artist)
          .setMaxSupply(configuredValue);
        const maxSupply = await config.minter.maxSupply();
        expect(maxSupply).to.equal(configuredValue);
      });

      it("updates maxSupply when equal to core max invocations", async function () {
        const config = await loadFixture(_beforeEach);
        const configuredValue = 15;
        await config.minter
          .connect(config.accounts.artist)
          .setMaxSupply(configuredValue);
        const maxSupply = await config.minter.maxSupply();
        expect(maxSupply).to.equal(configuredValue);
      });
    });

    describe("setProvenanceHash", async function () {
      it("reverts as not supported", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter.setProvenanceHash(ethers.constants.HashZero),
          revertMessages.setProvenanceHashNotSupported
        );
      });
    });

    describe("setRoyaltyInfo", async function () {
      const royaltyInfo = {
        royaltyAddress: ZERO_ADDRESS,
        royaltyBps: 0,
      };
      it("reverts as not supported", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter.setRoyaltyInfo(royaltyInfo),
          revertMessages.setRoyaltyInfoNotSupported
        );
      });
    });

    // @dev multiConfigure reverts are tested, but logic consistent with OpenSea's reference implementation not tested
    // to simplify required mocks and focus on our developed contract logic
    // Additional e2e testing was completed on OpenSea's website to confirm multiConfigure functionality
    describe("multiConfigure", async function () {
      const publicDropStruct = {
        mintPrice: 0,
        startTime: 0,
        endTime: 0,
        maxTotalMintableByWallet: 1,
        feeBps: 0,
        restrictFeeRecipients: true,
      }; // TODO
      const allowListDataStruct = {
        merkleRoot: ethers.constants.HashZero,
        publicKeyURIs: [],
        allowListURI: "",
      }; // TODO
      // const tokenGatedDropStageStruct = {}; // TODO
      // const signedMintValidationParamsStruct = {}; // TODO
      const multiConfigureStruct = {
        maxSupply: 0,
        baseURI: "",
        contractURI: "",
        seaDropImpl: SEA_DROP_ADDRESS,
        publicDrop: publicDropStruct,
        dropURI: "",
        allowListData: allowListDataStruct,
        creatorPayoutAddress: ZERO_ADDRESS,
        provenanceHash: ethers.constants.HashZero,
        allowedFeeRecipients: [],
        disallowedFeeRecipients: [],
        allowedPayers: [],
        disallowedPayers: [],
        tokenGatedAllowedNftTokens: [],
        tokenGatedDropStages: [],
        disallowedTokenGatedAllowedNftTokens: [],
        signers: [],
        signedMintValidationParams: [],
        disallowedSigners: [],
      };
      it("reverts when not artist", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .multiConfigure(multiConfigureStruct),
          revertMessages.onlyArtist
        );
      });

      it("updates state when maxSupply > 0", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter.connect(config.accounts.artist).multiConfigure({
          ...multiConfigureStruct,
          maxSupply: 1,
        });
        const maxSupply = await config.minter.maxSupply();
        expect(maxSupply).to.equal(1);
      });

      it("reverts when baseURI is not empty", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter.connect(config.accounts.artist).multiConfigure({
            ...multiConfigureStruct,
            baseURI: "test",
          }),
          revertMessages.setBaseURINotSupported
        );
      });

      it("reverts when contractURI is not empty", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter.connect(config.accounts.artist).multiConfigure({
            ...multiConfigureStruct,
            contractURI: "test",
          }),
          revertMessages.setContractURINotSupported
        );
      });

      it("reverts when provenanceHash is not empty", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter.connect(config.accounts.artist).multiConfigure({
            ...multiConfigureStruct,
            provenanceHash: ethers.constants.HashZero.replace("0x0", "0x1"),
          }),
          revertMessages.setProvenanceHashNotSupported
        );
      });

      it("does nothing when all fields are empty", async function () {
        const config = await loadFixture(_beforeEach);
        // @dev no reverts expected
        await config.minter
          .connect(config.accounts.artist)
          .multiConfigure(multiConfigureStruct);
      });
    });
  });
});
