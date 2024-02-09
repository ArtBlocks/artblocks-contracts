import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";
import { ethers } from "hardhat";
import { revertMessages } from "../../constants";
import { Logger } from "@ethersproject/logger";
import {
  configureProjectZeroAuctionAndAdvanceToStartTime,
  configureDefaultProjectZero,
  advanceToAuctionStartTime,
  initializeMinBidInProjectZeroAuction,
  configureProjectZeroAuctionAndSelloutLiveAuction,
  configureProjectZeroAuctionSelloutAndAdvanceToStateD,
  mintTokenOnDifferentMinter,
  initializeMinBidInProjectZeroAuctionAndAdvanceToEnd,
  initializeMinBidInProjectZeroAuctionAndEnterExtraTime,
  initializeProjectZeroTokenZeroAuctionAndMint,
} from "./helpers";
import { BigNumber, constants } from "ethers";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterRAMV0";
const TARGET_MINTER_VERSION = "v0.0.0";

// hard-coded minter constants
const MIN_AUCTION_DURATION_SECONDS = 10 * ONE_MINUTE; // 10 minutes
const AUCTION_BUFFER_SECONDS = 5 * ONE_MINUTE; // 5 minutes
const MAX_AUCTION_EXTRA_SECONDS = 60 * ONE_MINUTE; // 60 minutes
const MAX_AUCTION_ADMIN_EMERGENCY_EXTENSION_HOURS = 72; // 72 hours
const ADMIN_ARTIST_ONLY_MINT_TIME_SECONDS = 72 * ONE_HOUR; // 72 hours

const runForEach = [
  {
    core: "GenArt721CoreV3",
  },
  // TODO uncomment all cores
  // {
  //   core: "GenArt721CoreV3_Explorations",
  // },
  // {
  //   core: "GenArt721CoreV3_Engine",
  // },
  // {
  //   core: "GenArt721CoreV3_Engine_Flex",
  // },
];

runForEach.forEach((params) => {
  describe(`${TARGET_MINTER_NAME} View w/ core ${params.core}`, async function () {
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
        .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);

      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      config.startTime = block.timestamp + ONE_MINUTE;
      config.basePrice = config.pricePerTokenInWei; // better naming for this minter

      return config;
    }

    describe("createBid", async function () {
      it("reverts if no minter assigned", async function () {
        const config = await _beforeEach();
        // unassign minter on minter filter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .removeMinterForProject(
            config.projectZero,
            config.genArt721Core.address
          );
        // advance to State B
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // no minter assigned on minter filter
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, 0, {
              value: config.basePrice,
            }),
          revertMessages.noMinterAssigned
        );
      });

      it("reverts if different minter assigned", async function () {
        const config = await _beforeEach();
        // assign a different minter for the project on minter filter
        const differentMinter = await deployAndGet(config, "MinterSetPriceV5", [
          config.minterFilter.address,
        ]);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .approveMinterGlobally(differentMinter.address);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(
            config.projectZero,
            config.genArt721Core.address,
            differentMinter.address
          );
        // advance to State B
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // minter not active error
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, 0, {
              value: config.basePrice,
            }),
          revertMessages.minterNotActive
        );
      });

      it("reverts if not in State B (pre-auction)", async function () {
        const config = await _beforeEach();
        // unconfigured auction
        // not in State B error
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, 0, {
              value: config.basePrice,
            }),
          revertMessages.onlyStateB
        );
        // configure, remian in State A
        await configureDefaultProjectZero(config);
        // not in State B error
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, 0, {
              value: config.basePrice,
            }),
          revertMessages.onlyStateB
        );
      });

      it("reverts if not in State B (post-auction)", async function () {
        const config = await _beforeEach();
        // advance to State C
        await initializeMinBidInProjectZeroAuctionAndAdvanceToEnd(config);
        // not in State B error
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, 0, {
              value: config.basePrice,
            }),
          revertMessages.onlyStateB
        );
      });

      it("reverts if bid slot is gt 511", async function () {
        const config = await _beforeEach();
        // advance to State B
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // place bid in theoretical slot 512
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, 512, {
              value: config.basePrice?.mul(256),
            }),
          revertMessages.slotIndexOutOfRange
        );
      });

      it("reverts if msg.value does not match slot index bid value", async function () {
        const config = await _beforeEach();
        // advance to State B
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // place bid
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, 0, {
              value: config.basePrice.add(1),
            }),
          revertMessages.valueDNEBidSlot
        );
      });

      it("reverts if no tokens allowed in auction", async function () {
        const config = await _beforeEach();
        // configure auction and advance to start time
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // reduce max invocations for project to zero
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 0);
        // first bid should refresh max invocations, and revert because no tokens allowed in auction
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, 0, {
              value: config.basePrice,
            }),
          revertMessages.noTokensInAuction
        );
      });

      it("reverts if insufficient outbid value", async function () {
        const config = await _beforeEach();
        // "sellout" live auction
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // place insufficient outbid value
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, 0, {
              value: config.basePrice,
            }),
          revertMessages.insufficientBidValue
        );
      });

      it("updates state when successful, non-time extension, non-sellout", async function () {
        const config = await _beforeEach();
        // advance to State B
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // get state before
        const auctionBefore = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        // place bid, non-sellout, non-time extension
        const bidValue = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          1
        );
        await config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 1, {
            value: bidValue,
          });
        // get state after
        const auctionAfter = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        // verify relevant state updates
        expect(auctionBefore.auctionTimestampEnd).to.equal(
          auctionAfter.auctionTimestampEnd
        );
        expect(auctionBefore.numBids).to.equal(0);
        expect(auctionAfter.numBids).to.equal(1);
        expect(auctionAfter.minBidSlotIndex).to.equal(1);
        // verify min bid slot can still be decreased
        await config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 0, {
            value: config.basePrice,
          });
        const auctionAfter2 = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(auctionAfter2.minBidSlotIndex).to.equal(0);
      });

      it("updates state when successful, time extension, sellout", async function () {
        const config = await _beforeEach();
        // advance to State B, sellout live auction
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // advance to 1 min before auction end
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds - 60,
        ]);
        // get state before
        const auctionBefore = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        // place bid, sellout, time extension
        const bidValue = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          2
        );
        await config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 2, {
            value: bidValue,
          });
        // get state after
        const auctionAfter = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        // verify relevant state updates
        expect(parseInt(auctionBefore.auctionTimestampEnd, 10)).to.be.lessThan(
          parseInt(auctionAfter.auctionTimestampEnd, 10)
        );
        expect(auctionBefore.numBids).to.equal(15);
        expect(auctionAfter.numBids).to.equal(15);
        expect(auctionAfter.minBidSlotIndex).to.equal(0);
      });

      it("updates state when successful, non-time extension, sellout", async function () {
        const config = await _beforeEach();
        // advance to State B, sellout live auction
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // get state before
        const auctionBefore = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        // place bid, sellout, no time extension (not placed in buffer time)
        const bidValue = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          2
        );
        await config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 2, {
            value: bidValue,
          });
        // get state after
        const auctionAfter = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        // verify relevant state updates
        expect(parseInt(auctionBefore.auctionTimestampEnd, 10)).to.equal(
          parseInt(auctionAfter.auctionTimestampEnd, 10)
        );
        expect(auctionBefore.numBids).to.equal(15);
        expect(auctionAfter.numBids).to.equal(15);
        expect(auctionAfter.minBidSlotIndex).to.equal(0);
      });
    });

    describe("topUpBid", async function () {
      it("reverts if no minter assigned", async function () {
        const config = await _beforeEach();
        // unassign minter on minter filter
        await config.minterFilter
          .connect(config.accounts.deployer)
          .removeMinterForProject(
            config.projectZero,
            config.genArt721Core.address
          );
        // advance to State B
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // no minter assigned on minter filter
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .topUpBid(config.projectZero, config.genArt721Core.address, 0, 0, {
              value: config.basePrice,
            }),
          revertMessages.noMinterAssigned
        );
      });

      it("reverts if different minter assigned", async function () {
        const config = await _beforeEach();
        // assign a different minter for the project on minter filter
        const differentMinter = await deployAndGet(config, "MinterSetPriceV5", [
          config.minterFilter.address,
        ]);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .approveMinterGlobally(differentMinter.address);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(
            config.projectZero,
            config.genArt721Core.address,
            differentMinter.address
          );
        // advance to State B
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // minter not active error
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .topUpBid(config.projectZero, config.genArt721Core.address, 0, 0, {
              value: config.basePrice,
            }),
          revertMessages.minterNotActive
        );
      });

      it("reverts if not in State B (pre-auction)", async function () {
        const config = await _beforeEach();
        // unconfigured auction
        // not in State B error
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .topUpBid(config.projectZero, config.genArt721Core.address, 0, 0, {
              value: config.basePrice,
            }),
          revertMessages.onlyStateB
        );
      });

      it("reverts if not in State B (post-auction)", async function () {
        const config = await _beforeEach();
        // advance to State C
        await initializeMinBidInProjectZeroAuctionAndAdvanceToEnd(config);
        // not in State B error
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .topUpBid(config.projectZero, config.genArt721Core.address, 0, 0, {
              value: config.basePrice,
            }),
          revertMessages.onlyStateB
        );
      });

      it("reverts if bid slot is gt 511", async function () {
        const config = await _beforeEach();
        // advance to State B
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // place bid in theoretical slot 512
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .topUpBid(
              config.projectZero,
              config.genArt721Core.address,
              0,
              512,
              {
                value: config.basePrice?.mul(256),
              }
            ),
          revertMessages.slotIndexOutOfRange
        );
      });

      it("reverts if bid does not exist", async function () {
        const config = await _beforeEach();
        // advance to State B
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // top up bid that does not exist (bid ID 0)
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .topUpBid(config.projectZero, config.genArt721Core.address, 0, 0, {
              value: config.basePrice,
            }),
          revertMessages.bidDNE
        );
      });

      it("reverts if mgs.sender is not bidder of referenced bid", async function () {
        const config = await _beforeEach();
        // advance to State B
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // place bid
        await config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 0, {
            value: config.basePrice,
          });
        // top up bid from different address
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .topUpBid(config.projectZero, config.genArt721Core.address, 1, 0, {
              value: config.basePrice,
            }),
          revertMessages.onlyBidderOfExistingBid
        );
      });

      it("reverts if incorrect added value", async function () {
        const config = await _beforeEach();
        // advance to State B
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // place bid
        await config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 0, {
            value: config.basePrice,
          });
        // top up bid with incorrect added value (too low)
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .topUpBid(config.projectZero, config.genArt721Core.address, 1, 2, {
              value: 1, // need more than 1 wei to top up to slot 2
            }),
          revertMessages.incorrectAddedValue
        );
        // top up bid with incorrect added value (too high)
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .topUpBid(config.projectZero, config.genArt721Core.address, 1, 2, {
              value: ethers.utils.parseEther("1.0"), // need less than 1 ETH to top up to slot 2
            }),
          revertMessages.incorrectAddedValue
        );
      });

      it("updates state when successful, non-sellout", async function () {
        const config = await _beforeEach();
        // advance to State B
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // place bid
        await config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 0, {
            value: config.basePrice,
          });
        // get state before
        const auctionBefore = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        // top up bid
        const addedValue = (
          await config.minter.slotIndexToBidValue(
            config.projectZero,
            config.genArt721Core.address,
            1
          )
        ).sub(
          await config.minter.slotIndexToBidValue(
            config.projectZero,
            config.genArt721Core.address,
            0
          )
        );
        await config.minter
          .connect(config.accounts.user)
          .topUpBid(config.projectZero, config.genArt721Core.address, 1, 1, {
            value: addedValue,
          });
        // get state after
        const auctionAfter = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        // verify relevant state updates
        expect(auctionBefore.auctionTimestampEnd).to.equal(
          auctionAfter.auctionTimestampEnd
        );
        expect(auctionBefore.numBids).to.equal(1);
        expect(auctionAfter.numBids).to.equal(1);
        expect(auctionBefore.minBidSlotIndex).to.equal(0);
        expect(auctionAfter.minBidSlotIndex).to.equal(1);
      });

      it("updates state when successful, sellout", async function () {
        const config = await _beforeEach();
        // advance to State B
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // place bid in slot 0
        await config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 0, {
            value: config.basePrice,
          });
        // place 14 more bids in slot 1
        const slot1Value = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          1
        );
        for (let i = 0; i < 14; i++) {
          await config.minter
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, 1, {
              value: slot1Value,
            });
        }
        // get state before
        const auctionBefore = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        // top up bid id 1
        const addedValue = slot1Value.sub(
          await config.minter.slotIndexToBidValue(
            config.projectZero,
            config.genArt721Core.address,
            0
          )
        );
        await config.minter
          .connect(config.accounts.user)
          .topUpBid(config.projectZero, config.genArt721Core.address, 1, 1, {
            value: addedValue,
          });
        // get state after
        const auctionAfter = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        // verify relevant state updates
        expect(auctionBefore.auctionTimestampEnd).to.equal(
          auctionAfter.auctionTimestampEnd
        );
        expect(auctionBefore.numBids).to.equal(15);
        expect(auctionAfter.numBids).to.equal(15);
        expect(auctionBefore.minBidSlotIndex).to.equal(0);
        expect(auctionAfter.minBidSlotIndex).to.equal(1);
      });
    });

    describe("purchaseTo", async function () {
      it("reverts if not in States D or E (unconfigured, A, and B)", async function () {
        const config = await _beforeEach();
        // unconfigured
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseTo(
              config.accounts.user2.address,
              config.projectZero,
              config.genArt721Core.address,
              {
                value: config.basePrice,
              }
            ),
          revertMessages.onlyStatesDE
        );
        // configure auction in State A
        await configureDefaultProjectZero(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseTo(
              config.accounts.user2.address,
              config.projectZero,
              config.genArt721Core.address,
              {
                value: config.basePrice,
              }
            ),
          revertMessages.onlyStatesDE
        );
        // advance to State B
        await advanceToAuctionStartTime(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseTo(
              config.accounts.user2.address,
              config.projectZero,
              config.genArt721Core.address,
              {
                value: config.basePrice,
              }
            ),
          revertMessages.onlyStatesDE
        );
      });

      it("reverts if not in States D or E (check State C)", async function () {
        const config = await _beforeEach();
        // advance to State C
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds,
        ]);
        // expect revert
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseTo(
              config.accounts.user2.address,
              config.projectZero,
              config.genArt721Core.address,
              {
                value: config.basePrice,
              }
            ),
          revertMessages.onlyStatesDE
        );
      });

      it("reverts if no invocations remaining", async function () {
        const config = await _beforeEach();
        // advance to State D
        await configureProjectZeroAuctionSelloutAndAdvanceToStateD(config);
        // no invocations remaining
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseTo(
              config.accounts.user2.address,
              config.projectZero,
              config.genArt721Core.address,
              {
                value: config.basePrice,
              }
            ),
          revertMessages.reachedMaxInvocations
        );
      });

      it("reverts if not sent auction reserve price", async function () {
        const config = await _beforeEach();
        // advance to State D
        await initializeMinBidInProjectZeroAuctionAndAdvanceToEnd(config);
        // expect revert (value too low)
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseTo(
              config.accounts.user2.address,
              config.projectZero,
              config.genArt721Core.address,
              {
                value: config.basePrice.sub(1),
              }
            ),
          revertMessages.onlyAuctionReservePrice
        );
        // expect revert (value too high)
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseTo(
              config.accounts.user2.address,
              config.projectZero,
              config.genArt721Core.address,
              {
                value: config.basePrice.add(1),
              }
            ),
          revertMessages.onlyAuctionReservePrice
        );
      });

      it("updates state when successful", async function () {
        const config = await _beforeEach();
        // advance to State D
        await initializeMinBidInProjectZeroAuctionAndAdvanceToEnd(config);
        // get state before
        const auctionBefore = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        const projectBalanceBefore = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const artistBalanceBefore = await config.accounts.artist.getBalance();
        const deployerBalanceBefore =
          await config.accounts.deployer.getBalance();
        // purchase token
        await config.minter
          .connect(config.accounts.user)
          .purchaseTo(
            config.accounts.user2.address,
            config.projectZero,
            config.genArt721Core.address,
            {
              value: config.basePrice,
            }
          );
        // get state after
        const auctionAfter = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        const projectBalanceAfter = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const artistBalanceAfter = await config.accounts.artist.getBalance();
        const deployerBalanceAfter =
          await config.accounts.deployer.getBalance();
        // verify relevant state updates
        expect(auctionBefore.numBids).to.equal(1);
        expect(auctionAfter.numBids).to.equal(1);
        expect(auctionBefore.minBidSlotIndex).to.equal(0);
        expect(auctionAfter.minBidSlotIndex).to.equal(0);
        // only balance on minter should be from single bid, unaffected by purchase
        expect(projectBalanceBefore).to.equal(config.basePrice);
        expect(projectBalanceAfter).to.equal(config.basePrice);
        // artist balance should increase by base price * 90%
        expect(artistBalanceAfter.sub(artistBalanceBefore)).to.equal(
          config.basePrice.mul(9).div(10)
        );
        // deployer balance should increase by base price * 10%
        expect(deployerBalanceAfter.sub(deployerBalanceBefore)).to.equal(
          config.basePrice.div(10)
        );
        // new token should be owned by user2
        const tokenOwner = await config.genArt721Core.ownerOf(0);
        expect(tokenOwner).to.equal(config.accounts.user2.address);
        // allows 13 more purchase without reverting
        for (let i = 0; i < 13; i++) {
          await config.minter
            .connect(config.accounts.user)
            .purchaseTo(
              config.accounts.user2.address,
              config.projectZero,
              config.genArt721Core.address,
              {
                value: config.basePrice,
              }
            );
        }
        // reverts on next purchase because no invocations remaining
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseTo(
              config.accounts.user2.address,
              config.projectZero,
              config.genArt721Core.address,
              {
                value: config.basePrice,
              }
            ),
          revertMessages.reachedMaxInvocations
        );
      });

      it("reverts before sending minter into E1 state", async function () {
        const config = await _beforeEach();
        // advance to State D
        await initializeMinBidInProjectZeroAuctionAndAdvanceToEnd(config);
        // set max invocations to 1 on core contract, keep minter stale
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 1);
        // purchase should revert to avoid tripping into E1 state
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseTo(
              config.accounts.user2.address,
              config.projectZero,
              config.genArt721Core.address,
              {
                value: config.basePrice,
              }
            ),
          revertMessages.reachedMaxInvocations
        );
      });
    });

    describe("purchase", async function () {
      it("should send token to msg.sender", async function () {
        const config = await _beforeEach();
        // advance to State D
        await initializeMinBidInProjectZeroAuctionAndAdvanceToEnd(config);
        // purchase token
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.basePrice,
          });
        // new token should be owned by user
        const tokenOwner = await config.genArt721Core.ownerOf(0);
        expect(tokenOwner).to.equal(config.accounts.user.address);
      });
    });
  });
});
