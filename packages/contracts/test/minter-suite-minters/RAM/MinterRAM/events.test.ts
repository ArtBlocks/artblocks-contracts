import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";
import { Common_Events } from "../../common.events";
import { ethers } from "hardhat";
import { AbiCoder } from "ethers/lib/utils";
import { revertMessages } from "../../constants";
import { Logger } from "@ethersproject/logger";
import {
  configureProjectZeroAuctionAndAdvanceToStartTime,
  configureProjectZeroAuctionAndSelloutLiveAuction,
  initializeMinBidInProjectZeroAuction,
  configureProjectZeroAuctionSelloutAndAdvanceToStateD,
  selloutProjectZeroAuctionAndAdvanceToStateC,
  configureDefaultProjectZero,
} from "./helpers";
import { BigNumber, constants } from "ethers";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterRAMV0";
const TARGET_MINTER_VERSION = "v0.0.0";

// hard-coded minter constants
const MIN_AUCTION_DURATION_SECONDS = 10 * 60; // 10 minutes
const AUCTION_BUFFER_SECONDS = 5 * 60; // 5 minutes
const MAX_AUCTION_EXTRA_SECONDS = 60 * 60; // 60 minutes
const MAX_AUCTION_ADMIN_EMERGENCY_EXTENSION_HOURS = 72; // 72 hours
const ADMIN_ARTIST_ONLY_MINT_TIME_SECONDS = 72 * 60 * 60; // 72 hours

const runForEach = [
  {
    core: "GenArt721CoreV3",
  },
  {
    core: "GenArt721CoreV3_Explorations",
  },
  {
    core: "GenArt721CoreV3_Engine",
  },
  {
    core: "GenArt721CoreV3_Engine_Flex",
  },
];

runForEach.forEach((params) => {
  describe(`${TARGET_MINTER_NAME} Events w/ core ${params.core}`, async function () {
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

      config.minter = await deployAndGet(config, TARGET_MINTER_NAME, [
        config.minterFilter.address,
      ]);

      await config.minterFilter
        .connect(config.accounts.deployer)
        .approveMinterGlobally(config.minter.address);

      config.higherPricePerTokenInWei = config.pricePerTokenInWei.add(
        ethers.utils.parseEther("0.1")
      );

      // Project setup
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );

      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectOne);

      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectOne);

      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectZero,
          config.genArt721Core.address,
          config.minter.address
        );
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectOne,
          config.genArt721Core.address,
          config.minter.address
        );

      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 15);

      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      config.startTime = block.timestamp + ONE_MINUTE;
      config.basePrice = config.pricePerTokenInWei; // better naming for this minter

      return config;
    }

    describe("Common Minter Events Tests", async function () {
      await Common_Events(_beforeEach);
    });

    describe("minter-level config updates", async function () {
      describe("constructor events for minter config init", async function () {
        it("minter-level config constants emitted in constructor", async function () {
          const config = await loadFixture(_beforeEach);
          const contractFactory =
            await ethers.getContractFactory(TARGET_MINTER_NAME);
          const tx = await contractFactory.deploy(config.minterFilter.address);
          const receipt = await tx.deployTransaction.wait();
          // target event "MinAuctionDurationSecondsUpdated" is the log at index 0
          let targetLog = receipt.logs[0];
          // expect log 0 to be MinAuctionDurationSecondsUpdated
          expect(targetLog.topics[0]).to.be.equal(
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes(
                "MinAuctionDurationSecondsUpdated(uint256)"
              )
            )
          );
          // expect field to be the hard-coded default value
          const abiCoder = new AbiCoder();
          expect(targetLog.data).to.be.equal(
            abiCoder.encode(["uint256"], [MIN_AUCTION_DURATION_SECONDS])
          );
          // expect log 1 to be MinterRefundGasLimitUpdated
          targetLog = receipt.logs[1];
          expect(targetLog.topics[0]).to.be.equal(
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes("MinterRefundGasLimitUpdated(uint24)")
            )
          );
          // expect field to be the hard-coded default value
          expect(targetLog.data).to.be.equal(
            abiCoder.encode(["uint32"], [30_000])
          );
          // expect log 2 to be AuctionBufferTimeParamsUpdated
          targetLog = receipt.logs[2];
          expect(targetLog.topics[0]).to.be.equal(
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes(
                "AuctionBufferTimeParamsUpdated(uint256,uint256)"
              )
            )
          );
          // expect field to be the hard-coded default value
          expect(targetLog.data).to.be.equal(
            abiCoder.encode(
              ["uint256", "uint256"],
              [AUCTION_BUFFER_SECONDS, MAX_AUCTION_EXTRA_SECONDS]
            )
          );
          // expect log 3 to be NumSlotsUpdated
          targetLog = receipt.logs[3];
          expect(targetLog.topics[0]).to.be.equal(
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes("NumSlotsUpdated(uint256)")
            )
          );
          // expect field to be the hard-coded default value
          expect(targetLog.data).to.be.equal(
            abiCoder.encode(["uint256"], [512])
          );
        });
      });
    });

    describe("ContractConfigUpdated", async function () {
      it("is emitted when the contract config is updated", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.deployer)
            .setContractConfig(config.genArt721Core.address, false, true)
        )
          .to.emit(config.minter, "ContractConfigUpdated")
          .withArgs(config.genArt721Core.address, true, false, true);
      });
    });

    describe("AuctionConfigUpdated", async function () {
      it("is emitted when setAuctionDetails is called", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter.connect(config.accounts.artist).setAuctionDetails(
            config.projectZero, // projectId
            config.genArt721Core.address, // coreContract
            config.startTime, // timestampStart
            config.startTime + config.defaultAuctionLengthSeconds, // timestampEnd
            config.basePrice, // basePrice
            true, // allowExtraTime
            true // adminArtistOnlyMintPeriodIfSellout
          )
        )
          .to.emit(config.minter, "AuctionConfigUpdated")
          .withArgs(
            config.projectZero, // projectId
            config.genArt721Core.address, // coreContract
            config.startTime, // timestampStart
            config.startTime + config.defaultAuctionLengthSeconds, // timestampEnd
            config.basePrice, // basePrice
            true, // allowExtraTime
            true, // adminArtistOnlyMintPeriodIfSellout
            15 // numTokensInAuction
          );
      });
    });

    describe("NumTokensInAuctionUpdated", async function () {
      it("is emitted when manually limit project max invocations", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero, // projectId
              config.genArt721Core.address, // coreContract
              10 // numTokensInAuction
            )
        )
          .to.emit(config.minter, "NumTokensInAuctionUpdated")
          .withArgs(config.projectZero, config.genArt721Core.address, 10);
      });

      it("is emitted when setAuctionDetails is called", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter.connect(config.accounts.artist).setAuctionDetails(
            config.projectZero, // projectId
            config.genArt721Core.address, // coreContract
            config.startTime, // timestampStart
            config.startTime + config.defaultAuctionLengthSeconds, // timestampEnd
            config.basePrice, // basePrice
            true, // allowExtraTime
            true // adminArtistOnlyMintPeriodIfSellout
          )
        )
          .to.emit(config.minter, "NumTokensInAuctionUpdated")
          .withArgs(config.projectZero, config.genArt721Core.address, 15);
      });

      it("is emitted when first bid is placed in auction", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // artist reduces max invocations on core contract
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 10);
        // expect initial bid to catch this update
        await expect(
          config.minter
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, 0, {
              value: config.basePrice,
            })
        )
          .to.emit(config.minter, "NumTokensInAuctionUpdated")
          .withArgs(config.projectZero, config.genArt721Core.address, 10);
      });
    });

    describe("AuctionTimestampEndUpdated", async function () {
      it("is emitted when admin adds emergency auction hours", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // admin adds 1 hour to auction
        await expect(
          config.minter
            .connect(config.accounts.deployer)
            .adminAddEmergencyAuctionHours(
              config.projectZero,
              config.genArt721Core.address,
              1
            )
        )
          .to.emit(config.minter, "AuctionTimestampEndUpdated")
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime + config.defaultAuctionLengthSeconds + ONE_HOUR
          );
      });

      it("is emitted when artist reduces auction length", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // artist reduces auction length by 1 hour
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .reduceAuctionLength(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime + config.defaultAuctionLengthSeconds - ONE_MINUTE
            )
        )
          .to.emit(config.minter, "AuctionTimestampEndUpdated")
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime + config.defaultAuctionLengthSeconds - ONE_MINUTE
          );
      });

      it("is emitted when sellout bid placed in auction buffer time", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // advance to auction buffer time
        await ethers.provider.send("evm_mine", [
          config.startTime +
            config.defaultAuctionLengthSeconds -
            AUCTION_BUFFER_SECONDS,
        ]);
        // get proper bid value
        const minNextBid = await config.minter.getMinimumNextBid(
          config.projectZero,
          config.genArt721Core.address
        );
        // expect initial bid to trigger the event
        await expect(
          config.minter
            .connect(config.accounts.user)
            .createBid(
              config.projectZero,
              config.genArt721Core.address,
              minNextBid.minNextBidSlotIndex,
              {
                value: minNextBid.minNextBidValueInWei,
              }
            )
        )
          .to.emit(config.minter, "AuctionTimestampEndUpdated")
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime + config.defaultAuctionLengthSeconds + 1
          );
      });
    });

    describe("BidCreated", async function () {
      it("is not emitted when topping up a bid", async function () {
        const config = await loadFixture(_beforeEach);
        await initializeMinBidInProjectZeroAuction(config);
        // top up bid 1 to slot 1
        const slot1Value = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          1
        );
        await expect(
          config.minter
            .connect(config.accounts.user)
            .topUpBid(config.projectZero, config.genArt721Core.address, 1, 1, {
              value: slot1Value.sub(config.basePrice),
            })
        ).to.not.emit(config.minter, "BidCreated");
      });

      it("is emitted when creating a new bid", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // place bid 1
        await expect(
          config.minter
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, 0, {
              value: config.basePrice,
            })
        )
          .to.emit(config.minter, "BidCreated")
          .withArgs(
            config.projectZero, // projectId
            config.genArt721Core.address, // coreContract
            0, // slotIndex
            1, // bidId
            config.accounts.user.address // bidder
          );
      });
    });

    describe("BidRemoved", async function () {
      it("is emitted when a bid is removed via outbid", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // expect outbid to trigger the event
        const minNextBid = await config.minter.getMinimumNextBid(
          config.projectZero,
          config.genArt721Core.address
        );
        await expect(
          config.minter
            .connect(config.accounts.user)
            .createBid(
              config.projectZero,
              config.genArt721Core.address,
              minNextBid.minNextBidSlotIndex,
              {
                value: minNextBid.minNextBidValueInWei,
              }
            )
        )
          .to.emit(config.minter, "BidRemoved")
          .withArgs(
            config.projectZero, // projectId
            config.genArt721Core.address, // coreContract
            15 // bidId of lowest, latest bid
          );
      });
    });

    describe("BidToppedUp", async function () {
      it("is emitted when topping up a bid", async function () {
        const config = await loadFixture(_beforeEach);
        await initializeMinBidInProjectZeroAuction(config);
        // top up bid 1 to slot 2
        const slot2Value = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          2
        );
        const addedValue = slot2Value.sub(config.basePrice);
        await expect(
          config.minter
            .connect(config.accounts.user)
            .topUpBid(config.projectZero, config.genArt721Core.address, 1, 2, {
              value: addedValue,
            })
        )
          .to.emit(config.minter, "BidToppedUp")
          .withArgs(
            config.projectZero, // projectId
            config.genArt721Core.address, // coreContract
            1, // bidId
            2 // newSlotIndex
          );
      });
    });

    describe("BidSettled", async function () {
      it("is emitted when bid is auto-refunded", async function () {
        const config = await loadFixture(_beforeEach);
        await selloutProjectZeroAuctionAndAdvanceToStateC(config);
        // enter E1 by artist reducing max invocations on core contract
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 14);
        // expect auto-refund to trigger the event
        await expect(
          config.minter
            .connect(config.accounts.deployer)
            .adminAutoRefundBidsToResolveE1(
              config.projectZero,
              config.genArt721Core.address,
              1
            )
        )
          .to.emit(config.minter, "BidSettled")
          .withArgs(
            config.projectZero, // projectId
            config.genArt721Core.address, // coreContract
            15 // bidId
          );
      });

      it("is emitted when a bid is direct refunded", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionSelloutAndAdvanceToStateD(config);
        // enter E1 by artist reducing max invocations on core contract
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 14);
        // expect direct refund to trigger the event
        await expect(
          config.minter
            .connect(config.accounts.deployer)
            .adminArtistDirectRefundWinners(
              config.projectZero,
              config.genArt721Core.address,
              [1]
            )
        )
          .to.emit(config.minter, "BidSettled")
          .withArgs(
            config.projectZero, // projectId
            config.genArt721Core.address, // coreContract
            1 // bidId
          );
      });

      it("is emitted when a bid is settled by minting", async function () {
        const config = await loadFixture(_beforeEach);
        await selloutProjectZeroAuctionAndAdvanceToStateC(config);
        // auto-mint should trigger the event
        await expect(
          config.minter
            .connect(config.accounts.deployer)
            .adminArtistAutoMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              1
            )
        )
          .to.emit(config.minter, "BidSettled")
          .withArgs(
            config.projectZero, // projectId
            config.genArt721Core.address, // coreContract
            1 // bidId
          );
      });

      it("is emitted when a bid is settled", async function () {
        const config = await loadFixture(_beforeEach);
        await selloutProjectZeroAuctionAndAdvanceToStateC(config);
        // expect direct settle to trigger the event
        await expect(
          config.minter
            .connect(config.accounts.user)
            .collectSettlements(
              config.projectZero,
              config.genArt721Core.address,
              [1]
            )
        )
          .to.emit(config.minter, "BidSettled")
          .withArgs(
            config.projectZero, // projectId
            config.genArt721Core.address, // coreContract
            1 // bidId
          );
      });
    });

    describe("BidMinted", async function () {
      it("is emitted when a bid is auto-minted", async function () {
        const config = await loadFixture(_beforeEach);
        await selloutProjectZeroAuctionAndAdvanceToStateC(config);
        // auto-mint should trigger the event
        await expect(
          config.minter
            .connect(config.accounts.deployer)
            .adminArtistAutoMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              1
            )
        )
          .to.emit(config.minter, "BidMinted")
          .withArgs(
            config.projectZero, // projectId
            config.genArt721Core.address, // coreContract
            1, // bidId
            0 // tokenId
          );
      });

      it("is emitted when a bid is direct minted", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionSelloutAndAdvanceToStateD(config);
        // direct mint should trigger the event
        await expect(
          config.minter
            .connect(config.accounts.deployer)
            .adminArtistDirectMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              [9]
            )
        )
          .to.emit(config.minter, "BidMinted")
          .withArgs(
            config.projectZero, // projectId
            config.genArt721Core.address, // coreContract
            9, // bidId
            0 // tokenId
          );
      });
    });

    describe("BidRefunded", async function () {
      it("is emitted when a bid is auto-refunded", async function () {
        const config = await loadFixture(_beforeEach);
        await selloutProjectZeroAuctionAndAdvanceToStateC(config);
        // enter E1 by artist reducing max invocations on core contract
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 14);
        // expect auto-refund to trigger the event
        await expect(
          config.minter
            .connect(config.accounts.deployer)
            .adminAutoRefundBidsToResolveE1(
              config.projectZero,
              config.genArt721Core.address,
              1
            )
        )
          .to.emit(config.minter, "BidRefunded")
          .withArgs(
            config.projectZero, // projectId
            config.genArt721Core.address, // coreContract
            15 // bidId
          );
      });

      it("is emitted when a bid is direct refunded", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionSelloutAndAdvanceToStateD(config);
        // enter E1 by artist reducing max invocations on core contract
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 14);
        // expect direct refund to trigger the event
        await expect(
          config.minter
            .connect(config.accounts.deployer)
            .adminArtistDirectRefundWinners(
              config.projectZero,
              config.genArt721Core.address,
              [1]
            )
        )
          .to.emit(config.minter, "BidRefunded")
          .withArgs(
            config.projectZero, // projectId
            config.genArt721Core.address, // coreContract
            1 // bidId
          );
      });
    });

    describe("TokenPurchased", async function () {
      it("is emitted when a token is purchased", async function () {
        const config = await loadFixture(_beforeEach);
        await configureDefaultProjectZero(config);
        // advance to State D
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds + ONE_HOUR * 72,
        ]);
        await expect(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.basePrice,
            })
        )
          .to.emit(config.minter, "TokenPurchased")
          .withArgs(
            config.projectZero, // projectId
            config.genArt721Core.address, // coreContract
            0, // tokenId
            config.accounts.user.address // purchaser
          );
      });
    });
  });
});
