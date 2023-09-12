import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import {
  advanceToAuctionStartTime,
  initializeProjectZeroTokenZeroAuction,
  initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd,
  initializeProjectZeroTokenZeroAuctionAndSettle,
} from "./helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";
import { ethers } from "hardhat";
import { BigNumber, constants } from "ethers";
import { revertMessages } from "../../constants";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterSEAV1";
const TARGET_MINTER_VERSION = "v1.0.0";

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
  describe(`${TARGET_MINTER_NAME} Integration w/ core ${params.core}`, async function () {
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

      // await config.minter
      //   .connect(config.accounts.artist)
      //   .configureFutureAuctions(
      //     config.projectZero,
      //     config.genArt721Core.address,
      //     config.startTime,
      //     config.defaultAuctionLengthSeconds,
      //     config.pricePerTokenInWei,
      //     config.bidIncrementPercentage
      //   );

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
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectOne, 15);

      config.isEngine = params.core.includes("Engine");

      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      config.startTime = block.timestamp + ONE_MINUTE;
      config.bidIncrementPercentage = 5; // 5%
      config.basePrice = config.pricePerTokenInWei; // better naming for this minter

      return config;
    }

    describe("payment splitting", async function () {
      beforeEach(async function () {
        const config = await loadFixture(_beforeEach);
        config.deadReceiver = await deployAndGet(
          config,
          "DeadReceiverMock",
          []
        );
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.pricePerTokenInWei,
            config.bidIncrementPercentage
          );
        // pass config to tests in this describe block
        this.config = config;
      });

      it("requires successful payment to render provider", async function () {
        // get config from beforeEach
        const config = this.config;
        // update render provider address to a contract that reverts on receive
        // call appropriate core function to update render provider address
        if (config.isEngine) {
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProviderSalesAddresses(
              config.deadReceiver.address,
              config.accounts.additional.address,
              config.accounts.artist2.address,
              config.accounts.additional2.address
            );
        } else {
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateArtblocksPrimarySalesAddress(config.deadReceiver.address);
        }
        // expect revert when settling auction
        await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .settleAuction(targetToken, config.genArt721Core.address),
          "Render Provider payment failed"
        );
      });

      it("requires successful payment to platform provider", async function () {
        // get config from beforeEach
        const config = this.config;
        // update render provider address to a contract that reverts on receive
        // only relevant for engine core contracts
        if (config.isEngine) {
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProviderSalesAddresses(
              config.accounts.artist.address,
              config.accounts.additional.address,
              config.deadReceiver.address,
              config.accounts.additional2.address
            );
          // expect revert when settling auction
          await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .settleAuction(targetToken, config.genArt721Core.address),
            "Platform Provider payment failed"
          );
        } else {
          // @dev no-op for non-engine contracts
        }
      });

      it("requires successful payment to artist", async function () {
        // get config from beforeEach
        const config = this.config;
        // update artist address to a contract that reverts on receive
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateProjectArtistAddress(
            config.projectZero,
            config.deadReceiver.address
          );
        // expect revert when settling auction
        await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .settleAuction(targetToken, config.genArt721Core.address),
          "Artist payment failed"
        );
      });

      it("requires successful payment to artist additional payee", async function () {
        // get config from beforeEach
        const config = this.config;
        // update artist additional payee to a contract that reverts on receive
        const proposedAddressesAndSplits = [
          config.projectZero,
          config.accounts.artist.address,
          config.deadReceiver.address,
          // @dev 50% to additional, 50% to artist, to ensure additional is paid
          50,
          config.accounts.additional2.address,
          // @dev split for secondary sales doesn't matter for config test
          50,
        ];
        await config.genArt721Core
          .connect(config.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(
            ...proposedAddressesAndSplits
          );
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...proposedAddressesAndSplits);
        // expect revert when settling auction
        await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .settleAuction(targetToken, config.genArt721Core.address),
          "Additional Payee payment failed"
        );
      });

      it("handles zero platform and artist payment values", async function () {
        // get config from beforeEach
        const config = this.config;
        // update platform to zero percent
        // route to appropriate core function
        if (config.isEngine) {
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProviderPrimarySalesPercentages(0, 0);
        } else {
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateArtblocksPrimarySalesPercentage(0);
        }
        // update artist primary split to zero
        const proposedAddressesAndSplits = [
          config.projectZero,
          config.accounts.artist.address,
          config.accounts.additional.address,
          // @dev 100% to additional, 0% to artist, to induce zero artist payment
          100,
          config.accounts.additional2.address,
          // @dev split for secondary sales doesn't matter for config test
          50,
        ];
        await config.genArt721Core
          .connect(config.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(
            ...proposedAddressesAndSplits
          );
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...proposedAddressesAndSplits);
        // expect successful auction settlement
        await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        await config.minter
          .connect(config.accounts.user)
          .settleAuction(targetToken, config.genArt721Core.address);
      });
    });

    describe("createBid", async function () {
      describe("initializes auction with bid", async function () {
        it("reverts if project not configured", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .createBid(targetToken, config.genArt721Core.address),
            revertMessages.onlyConfiguredProjects
          );
        });

        it("reverts if project start time is in future", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime + ONE_DAY * 365, // start time set in future
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );

          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .createBid(targetToken, config.genArt721Core.address),
            revertMessages.onlyGteStartTime
          );
        });

        it("reverts if insufficient initial bid", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenOne.toString()
          );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          await advanceToAuctionStartTime(config);
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .createBid(targetToken, config.genArt721Core.address, {
                value: config.basePrice.sub(1),
              }),
            revertMessages.insufficientInitialBid
          );
        });

        it("requires next token is populated", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          // set max invocations to 1 to hit max invocations quickly
          await config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.genArt721Core.address,
              1
            );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              0, // start at any time
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          await initializeProjectZeroTokenZeroAuctionAndSettle(config);
          // next token isn't populated, so we should revert
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .createBid(targetToken, config.genArt721Core.address, {
                value: config.basePrice,
              }),
            revertMessages.onlyNextTokenPopulated
          );
        });

        it("requires correct token ID", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenOne.toString()
          );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              0, // start at any time
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          // expect revert when incorrect token is passed
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .createBid(targetToken.add(1), config.genArt721Core.address, {
                value: config.basePrice,
              }),
            revertMessages.incorrectTokenId
          );
        });

        it("updates state", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              0, // start at any time
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          // perform action
          const tx = await config.minter
            .connect(config.accounts.user)
            .createBid(targetToken, config.genArt721Core.address, {
              value: config.basePrice,
            });
          const receipt = tx.wait();
          const auctionStartTimestamp = (
            await config.accounts.deployer.provider.getBlock(
              receipt.blockNumber
            )
          ).timestamp;
          const expectedAuctionEndTimestamp =
            auctionStartTimestamp + config.defaultAuctionLengthSeconds;
          // validate state update
          const seaProjectConfig =
            await config.minter.SEAProjectConfigurationDetails(
              config.projectZero,
              config.genArt721Core.address
            );
          // auction parameters
          expect(seaProjectConfig.activeAuction.tokenId).to.equal(
            config.projectZeroTokenZero.toNumber()
          );
          expect(seaProjectConfig.activeAuction.currentBid).to.equal(
            config.basePrice
          );
          expect(seaProjectConfig.activeAuction.currentBidder).to.equal(
            config.accounts.user.address
          );
          expect(seaProjectConfig.activeAuction.endTime).to.equal(
            expectedAuctionEndTimestamp
          );
          expect(
            seaProjectConfig.activeAuction.minBidIncrementPercentage
          ).to.equal(config.bidIncrementPercentage);
          expect(seaProjectConfig.activeAuction.settled).to.be.false;
          // project parameters
          expect(seaProjectConfig.nextTokenNumberIsPopulated).to.be.true;
          expect(seaProjectConfig.nextTokenNumber).to.equal(
            config.projectZeroTokenOne.toNumber()
          );
        });

        it("doesn't mint token to next slot if reached max invocations", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.genArt721Core.address,
              1
            );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              0, // start at any time
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          // perform action
          const tx = await config.minter
            .connect(config.accounts.user)
            .createBid(targetToken, config.genArt721Core.address, {
              value: config.basePrice,
            });
          // validate state update
          const seaProjectConfig =
            await config.minter.SEAProjectConfigurationDetails(
              config.projectZero,
              config.genArt721Core.address
            );
          // verify next token is not populated
          expect(seaProjectConfig.nextTokenNumberIsPopulated).to.be.false;
        });

        it("edge case: does start last token's auction while paused (if already loaded into minter's next token slot)", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          // set max invocations to 2 on the minter
          await config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.genArt721Core.address,
              2
            );
          // configure future auctions
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              0, // start at any time
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          await initializeProjectZeroTokenZeroAuctionAndSettle(config);
          // pause the project
          await config.genArt721Core
            .connect(config.accounts.artist)
            .toggleProjectIsPaused(config.projectZero);
          // new auction should be able to be started by user, since last token
          // already loaded into minter's next token slot during previous
          // auction's initialization
          const targetTokenOne = BigNumber.from(
            config.projectZeroTokenOne.toString()
          );
          // new auction may be started by user, since last token already loaded
          // into minter's next token slot
          await config.minter
            .connect(config.accounts.user)
            .createBid(targetTokenOne, config.genArt721Core.address, {
              value: config.basePrice,
            });
          // verify new auction was created
          const seaProjectConfig =
            await config.minter.SEAProjectConfigurationDetails(
              config.projectZero,
              config.genArt721Core.address
            );
          expect(seaProjectConfig.activeAuction.tokenId).to.equal(
            targetTokenOne
          );
        });
      });

      describe("places bid on existing auction (no initialization required)", async function () {
        it("reverts if incorrect token ID", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenOne.toString()
          );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          await initializeProjectZeroTokenZeroAuction(config);
          // expect revert when incorrect token is passed
          await expectRevert(
            config.minter
              .connect(config.accounts.user2)
              .createBid(targetToken.add(1), config.genArt721Core.address, {
                value: config.basePrice.mul(2),
              }),
            revertMessages.tokenNotBeingAuctioned
          );
        });

        it("reverts if auction already ended", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
          // expect revert since auction has ended
          await expectRevert(
            config.minter
              .connect(config.accounts.user2)
              .createBid(targetToken, config.genArt721Core.address, {
                value: config.basePrice.mul(2),
              }),
            revertMessages.auctionAlreadyEnded
          );
        });

        it("reverts if bid is not sufficiently higher than current bid", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          await initializeProjectZeroTokenZeroAuction(config);
          // expect revert since bid is not sufficiently higher than current bid
          await expectRevert(
            config.minter
              .connect(config.accounts.user2)
              .createBid(targetToken, config.genArt721Core.address, {
                value: config.basePrice.add(1),
              }),
            revertMessages.bidTooLow
          );
        });

        it("updates auction state (no auction extension required)", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          await initializeProjectZeroTokenZeroAuction(config);
          // perform action
          const initialSeaProjectConfig =
            await config.minter.SEAProjectConfigurationDetails(
              config.projectZero,
              config.genArt721Core.address
            );
          const minNextBid = config.basePrice
            .mul(
              initialSeaProjectConfig.activeAuction.minBidIncrementPercentage
            )
            .div(100)
            .add(config.basePrice);
          await config.minter
            .connect(config.accounts.user2)
            .createBid(targetToken, config.genArt721Core.address, {
              value: minNextBid,
            });
          // validate state update
          const seaProjectConfig =
            await config.minter.SEAProjectConfigurationDetails(
              config.projectZero,
              config.genArt721Core.address
            );
          // auction parameters
          expect(seaProjectConfig.activeAuction.tokenId).to.equal(
            config.projectZeroTokenZero.toNumber()
          );
          expect(seaProjectConfig.activeAuction.currentBid).to.equal(
            minNextBid
          );
          expect(seaProjectConfig.activeAuction.currentBidder).to.equal(
            config.accounts.user2.address
          );
          expect(seaProjectConfig.activeAuction.endTime).to.equal(
            initialSeaProjectConfig.activeAuction.endTime // no extension
          );
        });

        it("updates auction state (auction extension required)", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          await initializeProjectZeroTokenZeroAuction(config);
          // extend to 5 seconds before end of auction (5 for some testing margin)
          await ethers.provider.send("evm_mine", [
            config.startTime + config.defaultAuctionLengthSeconds - 5,
          ]);
          // perform action
          const initialSeaProjectConfig =
            await config.minter.SEAProjectConfigurationDetails(
              config.projectZero,
              config.genArt721Core.address
            );
          const minNextBid = config.basePrice
            .mul(
              initialSeaProjectConfig.activeAuction.minBidIncrementPercentage
            )
            .div(100)
            .add(config.basePrice);
          const tx = await config.minter
            .connect(config.accounts.user2)
            .createBid(targetToken, config.genArt721Core.address, {
              value: minNextBid,
            });
          const receipt = tx.wait();
          const bidTimestamp = (
            await config.accounts.deployer.provider.getBlock(
              receipt.blockNumber
            )
          ).timestamp;
          // validate state update
          const seaProjectConfig =
            await config.minter.SEAProjectConfigurationDetails(
              config.projectZero,
              config.genArt721Core.address
            );
          // auction parameters
          expect(seaProjectConfig.activeAuction.tokenId).to.equal(
            config.projectZeroTokenZero.toNumber()
          );
          expect(seaProjectConfig.activeAuction.currentBid).to.equal(
            minNextBid
          );
          expect(seaProjectConfig.activeAuction.currentBidder).to.equal(
            config.accounts.user2.address
          );
          // new end time is gt initial end time
          expect(seaProjectConfig.activeAuction.endTime).to.be.gt(
            initialSeaProjectConfig.activeAuction.endTime
          );
          // auction was extended appropriate amount
          const minterConfigurationDetails =
            await config.minter.minterConfigurationDetails();
          expect(seaProjectConfig.activeAuction.endTime).to.equal(
            bidTimestamp + minterConfigurationDetails.minterTimeBufferSeconds_
          );
        });

        it("refunds previous bidder (no force transfer)", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          await initializeProjectZeroTokenZeroAuction(config);
          // record initial bidder's balance
          const initialBalance = await config.accounts.user.getBalance();
          // second bidder places bid, initiating refund to original bidder
          await config.minter
            .connect(config.accounts.user2)
            .createBid(targetToken, config.genArt721Core.address, {
              value: config.basePrice.mul(2),
            });
          // validate refund
          const finalBalance = await config.accounts.user.getBalance();
          expect(finalBalance).to.equal(initialBalance.add(config.basePrice));
        });

        it("refunds previous bidder (fallback force transfer)", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          const deadReceiverBidder = await deployAndGet(
            config,
            "DeadReceiverBidderMock",
            []
          );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          await initializeProjectZeroTokenZeroAuction(config);
          // place bid with dead receiver mock
          const bid2Value = config.basePrice.mul(11).div(10);
          await deadReceiverBidder
            .connect(config.accounts.user2)
            .createBidOnAuctionSharedMinter(
              config.minter.address,
              targetToken,
              config.genArt721Core.address,
              {
                value: bid2Value,
              }
            );
          // verify that the dead receiver mock received the funds as ETH fallback
          // when they are outbid
          const deadReceiverBalanceBefore = await ethers.provider.getBalance(
            deadReceiverBidder.address
          );
          const Bid3Value = bid2Value.mul(11).div(10);
          await config.minter
            .connect(config.accounts.user)
            .createBid(targetToken, config.genArt721Core.address, {
              value: Bid3Value,
            });
          const deadReceiverBalanceAfter = await ethers.provider.getBalance(
            deadReceiverBidder.address
          );
          // change in balance should be equal to bid2Value
          expect(deadReceiverBalanceAfter).to.equal(
            deadReceiverBalanceBefore.add(bid2Value)
          );
        });
      });

      it("does not allow reentrancy", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );
        // deploy autoBidder reentrancy contract
        const autoBidder = await deployAndGet(
          config,
          "ReentrancySEAAutoBidderMockShared",
          []
        );
        // perform attack
        // initialize auction via the auto bidder
        await ethers.provider.send("evm_mine", [config.startTime - 1]);
        const targetTokenId = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        const initialBidValue = config.basePrice;
        await autoBidder.attack(
          targetTokenId,
          config.genArt721Core.address,
          config.minter.address,
          initialBidValue,
          { value: config.basePrice.mul(5) }
        );
        const autoBidderBalanceBeforeRefund = await ethers.provider.getBalance(
          autoBidder.address
        );
        // when outbid, check that auto bidder does not attain reentrancy or DoS attack
        const bid2Value = config.basePrice.mul(110).div(100);
        await config.minter
          .connect(config.accounts.user)
          .createBid(targetTokenId, config.genArt721Core.address, {
            value: bid2Value,
          });
        // verify that user is the leading bidder, not the auto bidder
        const auctionDetails = await config.minter.projectActiveAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(auctionDetails.currentBidder).to.equal(
          config.accounts.user.address
        );
        // verify that the auto bidder received their bid back in ETH
        const autoBidderBalanceAfterRefund = await ethers.provider.getBalance(
          autoBidder.address
        );
        expect(
          autoBidderBalanceAfterRefund.sub(autoBidderBalanceBeforeRefund)
        ).to.equal(initialBidValue);
      });
    });

    describe("settleAuction", async function () {
      it("reverts if auction not initialized", async function () {
        const config = await loadFixture(_beforeEach);
        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        // expect revert when auction not initialized
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .settleAuction(targetToken, config.genArt721Core.address),
          revertMessages.auctionNotInitialized
        );
      });

      it("returns early when auction is for a different token ID", async function () {
        const config = await loadFixture(_beforeEach);
        const targetToken = BigNumber.from(
          config.projectZeroTokenOne.toString() // different token ID
        );
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );
        await initializeProjectZeroTokenZeroAuction(config);
        // expect early return when auction is for a different token ID
        await config.minter
          .connect(config.accounts.user)
          .settleAuction(targetToken, config.genArt721Core.address);
        // verify auction is not settled
        const seaProjectConfig =
          await config.minter.SEAProjectConfigurationDetails(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(seaProjectConfig.activeAuction.settled).to.be.false;
      });

      it("returns early when auction is already settled", async function () {
        const config = await loadFixture(_beforeEach);
        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );
        await initializeProjectZeroTokenZeroAuctionAndSettle(config);
        // expect early return when auction is already settled (no revert)
        await config.minter
          .connect(config.accounts.user)
          .settleAuction(targetToken, config.genArt721Core.address);
      });

      it("reverts if auction not ended", async function () {
        const config = await loadFixture(_beforeEach);
        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );
        await initializeProjectZeroTokenZeroAuction(config);
        // expect revert when auction not ended
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .settleAuction(targetToken, config.genArt721Core.address),
          revertMessages.auctionNotEnded
        );
      });

      it("updates state", async function () {
        const config = await loadFixture(_beforeEach);
        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );
        await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
        // verify/record initial state
        const initialMinterBalance = await ethers.provider.getBalance(
          config.minter.address
        );
        const initialSeaProjectConfig =
          await config.minter.SEAProjectConfigurationDetails(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(initialSeaProjectConfig.activeAuction.settled).to.be.false;

        // perform action
        await config.minter
          .connect(config.accounts.user)
          .settleAuction(targetToken, config.genArt721Core.address);
        // validate state update
        const minterBalance = await ethers.provider.getBalance(
          config.minter.address
        );
        expect(minterBalance).to.equal(
          initialMinterBalance.sub(config.basePrice)
        );
        const seaProjectConfig =
          await config.minter.SEAProjectConfigurationDetails(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(seaProjectConfig.activeAuction.settled).to.be.true;
        const ownerOfTargetToken =
          await config.genArt721Core.ownerOf(targetToken);
        expect(ownerOfTargetToken).to.equal(config.accounts.user.address);
      });
    });

    describe("settleAuctionAndCreateBid", async function () {
      // @dev individual calls to settleAuction and createBid are tested
      // in their respective describe blocks
      it("reverts if settle and bid token are not in same project", async function () {
        const config = await loadFixture(_beforeEach);
        const settleTokenId = BigNumber.from(
          config.projectZeroTokenOne.toString()
        );
        const bidTokenId = BigNumber.from(
          config.projectOneTokenZero.toString() // different project
        );
        // expect revert when tokens arent in same project
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .settleAuctionAndCreateBid(
              settleTokenId,
              bidTokenId,
              config.genArt721Core.address,
              {
                value: config.basePrice,
              }
            ),
          revertMessages.onlySameProject
        );
      });

      it("settles and bids on correct auction", async function () {
        const config = await loadFixture(_beforeEach);
        const settleTokenId = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        const bidTokenId = BigNumber.from(
          config.projectZeroTokenOne.toString() // different project
        );
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );
        await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
        // expect settle and bid to succeed, indicating successful routing of
        // input args
        await config.minter
          .connect(config.accounts.user2)
          .settleAuctionAndCreateBid(
            settleTokenId,
            bidTokenId,
            config.genArt721Core.address,
            {
              value: config.basePrice,
            }
          );
        // verify that settle and bid were successful
        const seaProjectConfig =
          await config.minter.SEAProjectConfigurationDetails(
            config.projectZero,
            config.genArt721Core.address
          );
        // new active auction for token one should not be settled
        expect(seaProjectConfig.activeAuction.settled).to.be.false;
        // new active auction for token one should have correct token ID
        expect(seaProjectConfig.activeAuction.tokenId).to.equal(
          bidTokenId.toNumber()
        );
      });
    });
  });
});
