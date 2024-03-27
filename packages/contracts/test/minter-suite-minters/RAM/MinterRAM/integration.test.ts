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
  selloutProjectZeroAuctionAndAdvanceToStateC,
  configureProjectZeroAuctionSelloutAndAdvanceToStateD,
  configureProjectZeroAuctionSelloutAndAdvanceToStateDWithE1,
  mintTokenOnDifferentMinter,
  initializeMinBidInProjectZeroAuctionAndAdvanceToEnd,
  initializeMinBidInProjectZeroAuctionAndEnterExtraTime,
  initializeProjectZeroTokenZeroAuctionAndMint,
  placeMinBidInProjectZeroAuction,
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
          revertMessages.onlyLiveAuction
        );
        // configure, remain in State A
        await configureDefaultProjectZero(config);
        // not in State B error
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, 0, {
              value: config.basePrice,
            }),
          revertMessages.onlyLiveAuction
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
          revertMessages.onlyLiveAuction
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
          revertMessages.onlySlotLtNumSlots
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
          revertMessages.onlyLiveAuction
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
          revertMessages.onlyLiveAuction
        );
      });

      it("reverts if bid slot is gt 511", async function () {
        const config = await _beforeEach();
        // advance to State B
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // place bid
        await config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 0, {
            value: config.basePrice,
          });
        // place bid in theoretical slot 512
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .topUpBid(
              config.projectZero,
              config.genArt721Core.address,
              1,
              512,
              {
                value: config.basePrice?.mul(256),
              }
            ),
          revertMessages.onlySlotLtNumSlots
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
          revertMessages.onlyPostAuctionOpenMintOrBidsHandled
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
          revertMessages.onlyPostAuctionOpenMintOrBidsHandled
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
          revertMessages.onlyPostAuctionOpenMintOrBidsHandled
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
          revertMessages.onlyPostAuctionOpenMintOrBidsHandled
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
        // artist balance should increase by base price * artistPercentage
        const artistPercentage = params.core.includes("Engine") ? 80 : 90;
        const adminPercentage = 10;
        expect(artistBalanceAfter.sub(artistBalanceBefore)).to.equal(
          config.basePrice.mul(artistPercentage).div(100)
        );
        // deployer balance should increase by base price * adminPercentage
        expect(deployerBalanceAfter.sub(deployerBalanceBefore)).to.equal(
          config.basePrice.mul(adminPercentage).div(100)
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
      // @dev overlapping library logic with purchaseTo, only testing differences
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

    describe("collectSettlements", async function () {
      it("reverts if not in States C or D (before)", async function () {
        const config = await _beforeEach();
        // unconfigured
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .collectSettlements(
              config.projectZero,
              config.genArt721Core.address,
              [0]
            ),
          revertMessages.onlyPostAuctionOpenMintOrAdminArtistMint
        );
        // configure auction in State A
        await configureDefaultProjectZero(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .collectSettlements(
              config.projectZero,
              config.genArt721Core.address,
              [0]
            ),
          revertMessages.onlyPostAuctionOpenMintOrAdminArtistMint
        );
        // advance to State B
        await advanceToAuctionStartTime(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .collectSettlements(
              config.projectZero,
              config.genArt721Core.address,
              [0]
            ),
          revertMessages.onlyPostAuctionOpenMintOrAdminArtistMint
        );
      });

      it("reverts if not in States C or D (after)", async function () {
        const config = await _beforeEach();
        // advance to State E
        await initializeProjectZeroTokenZeroAuctionAndMint(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .collectSettlements(
              config.projectZero,
              config.genArt721Core.address,
              [0]
            ),
          revertMessages.onlyPostAuctionOpenMintOrAdminArtistMint
        );
      });

      it("reverts if not bid's bidder (null bid case)", async function () {
        const config = await _beforeEach();
        // advance to State D
        await initializeMinBidInProjectZeroAuctionAndAdvanceToEnd(config);
        // settle null bid ID 0
        // expect revert
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .collectSettlements(
              config.projectZero,
              config.genArt721Core.address,
              [0]
            ),
          revertMessages.onlyBidder
        );
      });

      it("reverts if not bid's bidder (valid bid case)", async function () {
        const config = await _beforeEach();
        // advance to State D
        await initializeMinBidInProjectZeroAuctionAndAdvanceToEnd(config);
        // settle null bid ID 1 with different address
        // expect revert
        await expectRevert(
          config.minter
            .connect(config.accounts.user2)
            .collectSettlements(
              config.projectZero,
              config.genArt721Core.address,
              [1]
            ),
          revertMessages.onlyBidder
        );
      });

      it("doesn't allow settling more than once", async function () {
        const config = await _beforeEach();
        // advance to State D
        await initializeMinBidInProjectZeroAuctionAndAdvanceToEnd(config);
        // settle bid ID 1
        await config.minter
          .connect(config.accounts.user)
          .collectSettlements(
            config.projectZero,
            config.genArt721Core.address,
            [1]
          );
        // expect revert when settling again
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .collectSettlements(
              config.projectZero,
              config.genArt721Core.address,
              [1]
            ),
          revertMessages.onlyUnsettledBid
        );
      });

      it("updates state when successful - no balance case", async function () {
        const config = await _beforeEach();
        // advance to State D
        await initializeMinBidInProjectZeroAuctionAndAdvanceToEnd(config);
        // get state before
        const projectBalanceBefore = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const userBalanceBefore = await config.accounts.user.getBalance();
        // settle the bid with zero gas price
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await config.minter
          .connect(config.accounts.user)
          .collectSettlements(
            config.projectZero,
            config.genArt721Core.address,
            [1],
            { gasPrice: 0 }
          );
        // get state after
        const projectBalanceAfter = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const userBalanceAfter = await config.accounts.user.getBalance();
        // verify relevant state updates
        expect(projectBalanceBefore).to.equal(config.basePrice);
        expect(projectBalanceAfter).to.equal(config.basePrice);
        expect(userBalanceBefore).to.equal(userBalanceAfter);
      });

      it("updates state when successful - settlement balance exists case", async function () {
        const config = await _beforeEach();
        // sellout live auction
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // place bid in slot 8
        const bidValue = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          8
        );
        await config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 8, {
            value: bidValue,
          });
        // advance to end of auction
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds,
        ]);
        // get state before
        const projectBalanceBefore = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const userBalanceBefore = await config.accounts.user.getBalance();
        // settle the bid 16 with zero gas price
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await config.minter
          .connect(config.accounts.user)
          .collectSettlements(
            config.projectZero,
            config.genArt721Core.address,
            [16],
            { gasPrice: 0 }
          );
        // get state after
        const projectBalanceAfter = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const userBalanceAfter = await config.accounts.user.getBalance();
        // verify relevant state updates
        const settlementAmount = bidValue.sub(config.basePrice);
        expect(projectBalanceBefore.sub(projectBalanceAfter)).to.equal(
          settlementAmount
        );
        expect(userBalanceAfter.sub(userBalanceBefore)).to.equal(
          settlementAmount
        );
      });

      it("updates state when successful - multiple settlement balance exists case", async function () {
        const config = await _beforeEach();
        // sellout live auction
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // place bids in slots 8 and 9
        const bidValue8 = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          8
        );
        const bidValue9 = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          9
        );
        await config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 8, {
            value: bidValue8,
          });
        await config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 9, {
            value: bidValue9,
          });
        // advance to end of auction
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds,
        ]);
        // get state before
        const projectBalanceBefore = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const userBalanceBefore = await config.accounts.user.getBalance();
        // settle the bids 16 and 17 with zero gas price
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await config.minter
          .connect(config.accounts.user)
          .collectSettlements(
            config.projectZero,
            config.genArt721Core.address,
            [16, 17],
            { gasPrice: 0 }
          );
        // get state after
        const projectBalanceAfter = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const userBalanceAfter = await config.accounts.user.getBalance();
        // verify relevant state updates
        const settlementAmount = bidValue8
          .add(bidValue9)
          .sub(config.basePrice?.mul(2));
        expect(projectBalanceBefore.sub(projectBalanceAfter)).to.equal(
          settlementAmount
        );
        expect(userBalanceAfter.sub(userBalanceBefore)).to.equal(
          settlementAmount
        );
      });
    });

    describe("adminArtistAutoMintTokensToWinners", async function () {
      it("reverts when non-admin or artist calls", async function () {
        const config = await _beforeEach();
        // advance to State C
        await selloutProjectZeroAuctionAndAdvanceToStateC(config);
        // expect revert when non-admin calls
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .adminArtistAutoMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              2
            ),
          revertMessages.onlyCoreAdminACLOrArtist
        );
      });

      it("does not revert when artist calls", async function () {
        const config = await _beforeEach();
        // advance to State C
        await selloutProjectZeroAuctionAndAdvanceToStateC(config);
        // no revert when artist calls
        await config.minter
          .connect(config.accounts.artist)
          .adminArtistAutoMintTokensToWinners(
            config.projectZero,
            config.genArt721Core.address,
            2
          );
      });

      it("does not revert when admin calls (pre-C)", async function () {
        const config = await _beforeEach();
        // advance to State C
        await selloutProjectZeroAuctionAndAdvanceToStateC(config);
        // no revert when admin calls
        await config.minter
          .connect(config.accounts.deployer)
          .adminArtistAutoMintTokensToWinners(
            config.projectZero,
            config.genArt721Core.address,
            2
          );
      });

      it("reverts when not in State C (pre-C)", async function () {
        const config = await _beforeEach();
        // unconfigured reverts
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistAutoMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              0
            ),
          revertMessages.onlyPostAuctionSellOutAdminArtistMint
        );
        // configure auction in State A
        await configureDefaultProjectZero(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistAutoMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              0
            ),
          revertMessages.onlyPostAuctionSellOutAdminArtistMint
        );
        // advance to State B
        await advanceToAuctionStartTime(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistAutoMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              0
            ),
          revertMessages.onlyPostAuctionSellOutAdminArtistMint
        );
      });

      it("reverts when not in State C (post-C)", async function () {
        const config = await _beforeEach();
        // State D reverts
        await configureProjectZeroAuctionSelloutAndAdvanceToStateD(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistAutoMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              1
            ),
          revertMessages.onlyPostAuctionSellOutAdminArtistMint
        );
      });

      it("reverts when num tokens to mint gt tokens owed", async function () {
        const config = await _beforeEach();
        // advance to State C
        await selloutProjectZeroAuctionAndAdvanceToStateC(config);
        // expect revert when num tokens to mint gt tokens owed
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistAutoMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              16
            ),
          revertMessages.tooManyTokensToMint
        );
        // mint 13 of 15 tokens to winners
        await config.minter
          .connect(config.accounts.artist)
          .adminArtistAutoMintTokensToWinners(
            config.projectZero,
            config.genArt721Core.address,
            13
          );
        // expect revert when num tokens to mint gt tokens owed
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistAutoMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              3
            ),
          revertMessages.tooManyTokensToMint
        );
        // enter E1 state
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 14);
        // expect revert from core when num tokens to mint gt tokens owed due to E1
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistAutoMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              2
            ),
          revertMessages.noExceedMaxInvocations
        );
      });

      it("updates state when successful", async function () {
        const config = await _beforeEach();
        // sellout live auction
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // user 2 places bid in slot 8
        const bidValue = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          8
        );
        await config.minter
          .connect(config.accounts.user2)
          .createBid(config.projectZero, config.genArt721Core.address, 8, {
            value: bidValue,
          });
        // advance to end of auction
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds,
        ]);
        // get state before
        const projectBalanceBefore = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const artistBalanceBefore = await config.accounts.artist.getBalance();
        const user2BalanceBefore = await config.accounts.user2.getBalance();
        // mint 2 of 15 tokens to winners
        await config.minter
          .connect(config.accounts.deployer)
          .adminArtistAutoMintTokensToWinners(
            config.projectZero,
            config.genArt721Core.address,
            2
          );
        // get state after
        const projectBalanceAfter = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const artistBalanceAfter = await config.accounts.artist.getBalance();
        const user2BalanceAfter = await config.accounts.user2.getBalance();
        // verify relevant state updates
        const settlementAmount = bidValue.sub(config.basePrice);
        expect(projectBalanceBefore.sub(projectBalanceAfter)).to.equal(
          settlementAmount
        );
        expect(artistBalanceAfter).to.equal(artistBalanceBefore);
        expect(user2BalanceAfter.sub(user2BalanceBefore)).to.equal(
          settlementAmount
        );
        // token 0 should be owned by user2, since they had the highest bid
        expect(await config.genArt721Core.ownerOf(0)).to.equal(
          config.accounts.user2.address
        );
        // token 1 should be owned by user, since they had the lower bids
        expect(await config.genArt721Core.ownerOf(1)).to.equal(
          config.accounts.user.address
        );
        // verify auto-mint scroll state was updated and is WAI
        // subsequent call should mint token 1 to user
        await config.minter
          .connect(config.accounts.deployer)
          .adminArtistAutoMintTokensToWinners(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        // token 2 should be owned by user, since they had the lower bids
        expect(await config.genArt721Core.ownerOf(2)).to.equal(
          config.accounts.user.address
        );
        // verify minted bids were marked as settled
        await expectRevert(
          config.minter
            .connect(config.accounts.user2)
            .collectSettlements(
              config.projectZero,
              config.genArt721Core.address,
              [16]
            ),
          revertMessages.onlyUnsettledBid
        );
        // verify bid was marked as minted
        const auctionDetails = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(auctionDetails.numBidsMintedTokens).to.equal(3);
        // advance to state D via advancing 72 hours
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds + 60 * 60 * 72,
        ]);
        // expect skip if try to direct mint bid id 16 again (verifying it is minted)
        const auctionDetailsBefore = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        await config.minter
          .connect(config.accounts.user2)
          .winnerDirectMintTokens(
            config.projectZero,
            config.genArt721Core.address,
            [16]
          );
        const auctionDetailsAfter = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(auctionDetailsBefore.numBidsMintedTokens).to.equal(
          auctionDetailsAfter.numBidsMintedTokens
        );
      });

      it("does not settle bid when bid was previously settled", async function () {
        const config = await _beforeEach();
        // sellout live auction
        await selloutProjectZeroAuctionAndAdvanceToStateC(config);
        // user settles bid 1
        await config.minter
          .connect(config.accounts.user)
          .collectSettlements(
            config.projectZero,
            config.genArt721Core.address,
            [1]
          );
        // expect no settlement when auto-minting bid 1
        await expect(
          config.minter
            .connect(config.accounts.deployer)
            .adminArtistAutoMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              1
            )
        ).to.not.emit(config.minter, "BidSettled");
      });
    });

    describe("adminArtistDirectMintTokensToWinners", async function () {
      it("reverts when non-admin or artist calls", async function () {
        const config = await _beforeEach();
        // advance to State D
        await configureProjectZeroAuctionSelloutAndAdvanceToStateD(config);
        // expect revert when non-admin calls
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .adminArtistDirectMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              [0]
            ),
          revertMessages.onlyCoreAdminACLOrArtist
        );
      });

      it("does not revert when artist calls", async function () {
        const config = await _beforeEach();
        // advance to State D
        await configureProjectZeroAuctionSelloutAndAdvanceToStateD(config);
        // no revert when artist calls
        await config.minter
          .connect(config.accounts.artist)
          .adminArtistDirectMintTokensToWinners(
            config.projectZero,
            config.genArt721Core.address,
            [1]
          );
      });

      it("does not revert when admin calls", async function () {
        const config = await _beforeEach();
        // advance to State D
        await configureProjectZeroAuctionSelloutAndAdvanceToStateD(config);
        // no revert when admin calls
        await config.minter
          .connect(config.accounts.deployer)
          .adminArtistDirectMintTokensToWinners(
            config.projectZero,
            config.genArt721Core.address,
            [1]
          );
      });

      it("reverts when not in State D (pre-D)", async function () {
        const config = await _beforeEach();
        // unconfigured reverts
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistDirectMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              [0]
            ),
          revertMessages.onlyPostAuctionOpenMint
        );
        // configure auction in State A
        await configureDefaultProjectZero(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistDirectMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              [0]
            ),
          revertMessages.onlyPostAuctionOpenMint
        );
        // advance to State B
        await advanceToAuctionStartTime(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistDirectMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              [0]
            ),
          revertMessages.onlyPostAuctionOpenMint
        );
      });

      it("reverts when not in State D (check C)", async function () {
        const config = await _beforeEach();
        // advance to State C
        await selloutProjectZeroAuctionAndAdvanceToStateC(config);
        // expect revert
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistDirectMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              [0]
            ),
          revertMessages.onlyPostAuctionOpenMint
        );
      });

      it("reverts when num tokens to mint gt tokens owed", async function () {
        const config = await _beforeEach();
        // advance to State D
        await configureProjectZeroAuctionSelloutAndAdvanceToStateD(config);
        // expect revert when num tokens to mint gt tokens owed
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistDirectMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
            ),
          revertMessages.tooManyTokensToMint
        );
        // mint 13 of 15 tokens to winners
        await config.minter
          .connect(config.accounts.artist)
          .adminArtistDirectMintTokensToWinners(
            config.projectZero,
            config.genArt721Core.address,
            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
          );
        // expect revert when num tokens to mint gt tokens owed
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistDirectMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              [14, 15, 16]
            ),
          revertMessages.tooManyTokensToMint
        );
        // enter E1 state
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 14);
        // expect revert from core when num tokens to mint gt tokens owed due to E1
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistDirectMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              [14, 15]
            ),
          revertMessages.noExceedMaxInvocations
        );
      });

      it("reverts in minter code when minting non-existent bid", async function () {
        const config = await _beforeEach();
        // advance to State D
        await configureProjectZeroAuctionSelloutAndAdvanceToStateD(config);
        // expect revert when minting to non-existent bid
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistDirectMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              [0] // bid ID 0 never exists, minter starts at 1
            ),
          revertMessages.invalidBidId
        );
      });

      it("reverts in minter code when minting to outbid bid", async function () {
        const config = await _beforeEach();
        // sellout live auction
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // user 2 places bid in slot 8
        const bidValue = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          8
        );
        await config.minter
          .connect(config.accounts.user2)
          .createBid(config.projectZero, config.genArt721Core.address, 8, {
            value: bidValue,
          });
        // advance to end of auction, +72 hours to get to State D
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds + 60 * 60 * 72,
        ]);
        // expect revert when minting to outbid bid
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistDirectMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              [15] // 15 was outbid by 16
            ),
          revertMessages.invalidBidId
        );
      });

      it("updates state when successful", async function () {
        const config = await _beforeEach();
        // sellout live auction
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // user 2 places bid in slot 8
        const bidValue = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          8
        );
        await config.minter
          .connect(config.accounts.user2)
          .createBid(config.projectZero, config.genArt721Core.address, 8, {
            value: bidValue,
          });
        // advance to end of auction + end of State C 72 hrs, all the way to State D
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds + 60 * 60 * 72,
        ]);
        // get state before
        const projectBalanceBefore = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const artistBalanceBefore = await config.accounts.artist.getBalance();
        const user2BalanceBefore = await config.accounts.user2.getBalance();
        // mint bids 16 and 15 tokens to winners
        await config.minter
          .connect(config.accounts.deployer)
          .adminArtistDirectMintTokensToWinners(
            config.projectZero,
            config.genArt721Core.address,
            [16, 2]
          );
        // get state after
        const projectBalanceAfter = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const artistBalanceAfter = await config.accounts.artist.getBalance();
        const user2BalanceAfter = await config.accounts.user2.getBalance();
        // verify relevant state updates
        const settlementAmount = bidValue.sub(config.basePrice);
        expect(projectBalanceBefore.sub(projectBalanceAfter)).to.equal(
          settlementAmount
        );
        expect(artistBalanceAfter).to.equal(artistBalanceBefore);
        expect(user2BalanceAfter.sub(user2BalanceBefore)).to.equal(
          settlementAmount
        );
        // token 0 should be owned by user2, since they were earliest in input array
        expect(await config.genArt721Core.ownerOf(0)).to.equal(
          config.accounts.user2.address
        );
        // token 1 should be owned by user, since they had the lower bids
        expect(await config.genArt721Core.ownerOf(1)).to.equal(
          config.accounts.user.address
        );
        // verify direct-mint scroll state was updated and is WAI
        // subsequent call should mint token 1 to user
        await config.minter
          .connect(config.accounts.deployer)
          .adminArtistDirectMintTokensToWinners(
            config.projectZero,
            config.genArt721Core.address,
            [3]
          );
        // token 2 should be owned by user, since they had the lower bids
        expect(await config.genArt721Core.ownerOf(2)).to.equal(
          config.accounts.user.address
        );
        // verify minted bids were marked as settled
        await expectRevert(
          config.minter
            .connect(config.accounts.user2)
            .collectSettlements(
              config.projectZero,
              config.genArt721Core.address,
              [16]
            ),
          revertMessages.onlyUnsettledBid
        );
        // verify bid was marked as minted
        const auctionDetails = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(auctionDetails.numBidsMintedTokens).to.equal(3);
        // verify cannot re-mint an already-minted bid, is skipped
        await config.minter
          .connect(config.accounts.deployer)
          .adminArtistDirectMintTokensToWinners(
            config.projectZero,
            config.genArt721Core.address,
            [16]
          );
        const auctionDetailsAfter = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(auctionDetails.numBidsMintedTokens).to.equal(
          auctionDetailsAfter.numBidsMintedTokens
        );
      });

      it("skips bid that was already refunded", async function () {
        const config = await _beforeEach();
        // sellout live auction
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // advance to end of auction + end of State C 72 hrs, all the way to State D
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds + 60 * 60 * 72,
        ]);
        // artist enters E1 by reducing max invocations on core contract
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 14);
        // Bid ID 15 is refunded
        await config.minter
          .connect(config.accounts.deployer)
          .adminArtistDirectRefundWinners(
            config.projectZero,
            config.genArt721Core.address,
            [15]
          );
        // expect skip when minting refunded bid ID 15
        await config.minter
          .connect(config.accounts.artist)
          .adminArtistDirectMintTokensToWinners(
            config.projectZero,
            config.genArt721Core.address,
            [15]
          );
        // ensure token ID 0 was not yet minted (i.e. minting was skipped)
        await expectRevert(
          config.genArt721Core.ownerOf(0),
          "ERC721: invalid token ID"
        );
      });

      it("does not settle previously settled bid", async function () {
        const config = await _beforeEach();
        // sellout live auction
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // user2 places bid in slot 8
        const bidValue = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          8
        );
        await config.minter
          .connect(config.accounts.user2)
          .createBid(config.projectZero, config.genArt721Core.address, 8, {
            value: bidValue,
          });
        // advance to end of auction + end of State C 72 hrs, all the way to State D
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds + 60 * 60 * 72,
        ]);
        // user2 settles bid 16
        await config.minter
          .connect(config.accounts.user2)
          .collectSettlements(
            config.projectZero,
            config.genArt721Core.address,
            [16]
          );
        // record balances before minting
        const projectBalanceBefore = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const user2BalanceBefore = await config.accounts.user2.getBalance();
        // mint bid 16 to user2
        await config.minter
          .connect(config.accounts.artist)
          .adminArtistDirectMintTokensToWinners(
            config.projectZero,
            config.genArt721Core.address,
            [16]
          );
        // record balances after minting
        const projectBalanceAfter = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const user2BalanceAfter = await config.accounts.user2.getBalance();
        // verify relevant state updates to confirm no settlement ocurred during minting
        expect(projectBalanceBefore).to.equal(projectBalanceAfter);
        expect(user2BalanceAfter).to.equal(user2BalanceBefore);
      });
    });

    describe("winnerDirectMintTokens", async function () {
      // @dev overlapping library logic with adminArtistDirectMintTokensToWinners,
      // only testing differences
      it("reverts when caller is not bidder", async function () {
        const config = await _beforeEach();
        // advance to State D
        await configureProjectZeroAuctionSelloutAndAdvanceToStateD(config);
        // expect revert when non-bidder calls
        await expectRevert(
          config.minter
            .connect(config.accounts.user2)
            .winnerDirectMintTokens(
              config.projectZero,
              config.genArt721Core.address,
              [1]
            ),
          revertMessages.onlySenderIsBidder
        );
      });

      it("updates state when successful", async function () {
        const config = await _beforeEach();
        // advance to State D
        await configureProjectZeroAuctionSelloutAndAdvanceToStateD(config);
        // auction state before
        const auctionDetailsBefore = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        // direct mint by winner
        await config.minter
          .connect(config.accounts.user)
          .winnerDirectMintTokens(
            config.projectZero,
            config.genArt721Core.address,
            [1]
          );
        // token 0 should be owned by user
        expect(await config.genArt721Core.ownerOf(0)).to.equal(
          config.accounts.user.address
        );
        // auction state after
        const auctionDetailsAfter = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        // verify relevant state updates
        expect(auctionDetailsBefore.numBidsMintedTokens).to.equal(0);
        expect(auctionDetailsAfter.numBidsMintedTokens).to.equal(1);
      });
    });

    describe("adminAutoRefundWinners", async function () {
      it("reverts when non-admin calls", async function () {
        const config = await _beforeEach();
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminAutoRefundWinners(
              config.projectZero,
              config.genArt721Core.address,
              1
            ),
          revertMessages.onlyCoreAdminACL
        );
      });

      it("reverts when not in State C", async function () {
        const config = await _beforeEach();
        // unconfigured
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .adminAutoRefundWinners(
              config.projectZero,
              config.genArt721Core.address,
              1
            ),
          revertMessages.onlyPostAuctionSellOutAdminArtistMint
        );
        // configure auction in State A
        await configureDefaultProjectZero(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .adminAutoRefundWinners(
              config.projectZero,
              config.genArt721Core.address,
              1
            ),
          revertMessages.onlyPostAuctionSellOutAdminArtistMint
        );
        // advance to State B
        await advanceToAuctionStartTime(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .adminAutoRefundWinners(
              config.projectZero,
              config.genArt721Core.address,
              1
            ),
          revertMessages.onlyPostAuctionSellOutAdminArtistMint
        );
        // advance to State D
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds + 60 * 60 * 72,
        ]);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .adminAutoRefundWinners(
              config.projectZero,
              config.genArt721Core.address,
              1
            ),
          revertMessages.onlyPostAuctionSellOutAdminArtistMint
        );
      });

      it("reverts when not in E1 state", async function () {
        const config = await _beforeEach();
        // advance to State C
        await selloutProjectZeroAuctionAndAdvanceToStateC(config);
        // expect revert when not in E1 state
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .adminAutoRefundWinners(
              config.projectZero,
              config.genArt721Core.address,
              1
            ),
          revertMessages.onlyStateErrorE1
        );
      });

      it("reverts when num bids to refund gt num bids available to refund", async function () {
        const config = await _beforeEach();
        // advance to State C
        await selloutProjectZeroAuctionAndAdvanceToStateC(config);
        // enter E1 state by reducing max invocations by 1
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 14);
        // expect revert when num bids to refund gt num bids available to refund
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .adminAutoRefundWinners(
              config.projectZero,
              config.genArt721Core.address,
              2
            ),
          revertMessages.tooManyBidsToRefund
        );
      });

      it("updates state when successful, bid not previously settled", async function () {
        const config = await _beforeEach();
        // advance to State C
        await selloutProjectZeroAuctionAndAdvanceToStateC(config);
        // enter E1 state by reducing max invocations by 1
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 14);
        // record state before refund
        const projectBalanceBefore = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const userBalanceBefore = await config.accounts.user.getBalance();
        const auctionDetailsBefore = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        // auto-refund 1 bid
        await config.minter
          .connect(config.accounts.deployer)
          .adminAutoRefundWinners(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        // record state after refund
        const projectBalanceAfter = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const userBalanceAfter = await config.accounts.user.getBalance();
        const auctionDetailsAfter = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        // verify relevant state updates
        const refundAmount = config.basePrice;
        expect(projectBalanceBefore.sub(projectBalanceAfter)).to.equal(
          refundAmount
        );
        expect(userBalanceAfter.sub(userBalanceBefore)).to.equal(refundAmount);
        expect(auctionDetailsBefore.numBidsErrorRefunded).to.equal(0);
        expect(auctionDetailsAfter.numBidsErrorRefunded).to.equal(1);
      });

      it("updates state when successful, bid was previously settled", async function () {
        const config = await _beforeEach();
        // configure and advance to live auction
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // place one bid in slot 0
        await config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 0, {
            value: config.basePrice,
          });
        // user2 places 14 bids in slot 8, selling out project
        const bidValue = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          8
        );
        for (let i = 0; i < 14; i++) {
          await config.minter
            .connect(config.accounts.user2)
            .createBid(config.projectZero, config.genArt721Core.address, 8, {
              value: bidValue,
            });
        }
        // advance to end of auction
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds,
        ]);
        // enter E1 state by reducing max invocations by 3
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 12);
        // auto-refund 1 bid that doesn't have settlement
        await config.minter
          .connect(config.accounts.deployer)
          .adminAutoRefundWinners(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        // record state before refund
        const projectBalanceBefore = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const user2BalanceBefore = await config.accounts.user2.getBalance();
        const auctionDetailsBefore = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        // auto-refund 2 bids that have settlement
        await config.minter
          .connect(config.accounts.deployer)
          .adminAutoRefundWinners(
            config.projectZero,
            config.genArt721Core.address,
            2
          );
        // record state after refund
        const projectBalanceAfter = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const user2BalanceAfter = await config.accounts.user2.getBalance();
        const auctionDetailsAfter = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        // verify relevant state updates
        // refund amount is entire bid value for bid at slot 8, multiplied by 2 for 2 bids
        const refundAmount = bidValue.mul(2);
        expect(projectBalanceBefore.sub(projectBalanceAfter)).to.equal(
          refundAmount
        );
        expect(user2BalanceAfter.sub(user2BalanceBefore)).to.equal(
          refundAmount
        );
        expect(auctionDetailsBefore.numBidsErrorRefunded).to.equal(1);
        expect(auctionDetailsAfter.numBidsErrorRefunded).to.equal(3);
      });

      it("does not settle bid when bid was previously settled", async function () {
        const config = await _beforeEach();
        // sellout live auction
        await selloutProjectZeroAuctionAndAdvanceToStateC(config);
        // enter E1 state by reducing max invocations by 1
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 14);
        // user settles bid 1
        await config.minter
          .connect(config.accounts.user)
          .collectSettlements(
            config.projectZero,
            config.genArt721Core.address,
            [15]
          );
        // expect no settlement when auto-refunded bid 15
        await expect(
          config.minter
            .connect(config.accounts.deployer)
            .adminAutoRefundWinners(
              config.projectZero,
              config.genArt721Core.address,
              1
            )
        ).to.not.emit(config.minter, "BidSettled");
      });
    });

    describe("adminArtistDirectRefundWinners", async function () {
      it("reverts when non-admin or artist calls", async function () {
        const config = await _beforeEach();
        // advance to State D w/ E1
        await configureProjectZeroAuctionSelloutAndAdvanceToStateDWithE1(
          config
        );
        // expect revert when non-admin calls
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .adminArtistDirectRefundWinners(
              config.projectZero,
              config.genArt721Core.address,
              [1]
            ),
          revertMessages.onlyCoreAdminACLOrArtist
        );
      });

      it("does not revert when artist calls", async function () {
        const config = await _beforeEach();
        // advance to State D w/ E1
        await configureProjectZeroAuctionSelloutAndAdvanceToStateDWithE1(
          config
        );
        // no revert when artist calls
        await config.minter
          .connect(config.accounts.artist)
          .adminArtistDirectRefundWinners(
            config.projectZero,
            config.genArt721Core.address,
            [1]
          );
      });

      it("does not revert when admin calls", async function () {
        const config = await _beforeEach();
        // advance to State D w/ E1
        await configureProjectZeroAuctionSelloutAndAdvanceToStateDWithE1(
          config
        );
        // no revert when admin calls
        await config.minter
          .connect(config.accounts.deployer)
          .adminArtistDirectRefundWinners(
            config.projectZero,
            config.genArt721Core.address,
            [1]
          );
      });

      it("reverts when not in State D (pre-D)", async function () {
        const config = await _beforeEach();
        // unconfigured reverts
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistDirectRefundWinners(
              config.projectZero,
              config.genArt721Core.address,
              [1]
            ),
          revertMessages.onlyPostAuctionOpenMint
        );
        // configure auction in State A
        await configureDefaultProjectZero(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistDirectRefundWinners(
              config.projectZero,
              config.genArt721Core.address,
              [1]
            ),
          revertMessages.onlyPostAuctionOpenMint
        );
        // advance to State B
        await advanceToAuctionStartTime(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistDirectRefundWinners(
              config.projectZero,
              config.genArt721Core.address,
              [1]
            ),
          revertMessages.onlyPostAuctionOpenMint
        );
      });

      it("reverts when not in State D (check C)", async function () {
        const config = await _beforeEach();
        // advance to State C
        await selloutProjectZeroAuctionAndAdvanceToStateC(config);
        // expect revert
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistDirectRefundWinners(
              config.projectZero,
              config.genArt721Core.address,
              [1]
            ),
          revertMessages.onlyPostAuctionOpenMint
        );
      });

      it("reverts when not in E1 state", async function () {
        const config = await _beforeEach();
        // advance to State D w/o E1
        await configureProjectZeroAuctionSelloutAndAdvanceToStateD(config);
        // expect revert when not in E1 state
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistDirectRefundWinners(
              config.projectZero,
              config.genArt721Core.address,
              [1]
            ),
          revertMessages.onlyStateErrorE1
        );
      });

      it("reverts when num bids to refund gt num bids available to refund", async function () {
        const config = await _beforeEach();
        // advance to State D w/ E1
        await configureProjectZeroAuctionSelloutAndAdvanceToStateDWithE1(
          config
        );
        // expect revert when num bids to refund gt num bids available to refund
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistDirectRefundWinners(
              config.projectZero,
              config.genArt721Core.address,
              [1, 2]
            ),
          revertMessages.tooManyBidsToRefund
        );
      });

      it("updates state when successful, bid not previously settled", async function () {
        const config = await _beforeEach();
        // advance sellout live auction
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // user2 places bid in slot 8
        const bidValue = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          8
        );
        await config.minter
          .connect(config.accounts.user2)
          .createBid(config.projectZero, config.genArt721Core.address, 8, {
            value: bidValue,
          });
        // advance to end of auction + 72 hours to get to State D
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds + 60 * 60 * 72,
        ]);
        // enter E1 state by reducing max invocations by 1
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 14);
        // record state before
        const auctionDetailsBefore = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        const projectBalanceBefore = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const user2BalanceBefore = await config.accounts.user2.getBalance();
        // direct refund by artist
        await config.minter
          .connect(config.accounts.artist)
          .adminArtistDirectRefundWinners(
            config.projectZero,
            config.genArt721Core.address,
            [16]
          );
        // record state after
        const auctionDetailsAfter = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        const projectBalanceAfter = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const user2BalanceAfter = await config.accounts.user2.getBalance();
        // verify relevant state updates
        expect(auctionDetailsBefore.numBidsErrorRefunded).to.equal(0);
        expect(auctionDetailsAfter.numBidsErrorRefunded).to.equal(1);
        const refundAmount = bidValue; // entire bid value should be refunded
        expect(projectBalanceBefore.sub(projectBalanceAfter)).to.equal(
          refundAmount
        );
        expect(user2BalanceAfter.sub(user2BalanceBefore)).to.equal(
          refundAmount
        );
      });

      it("updates state when successful, bid was previously settled", async function () {
        const config = await _beforeEach();
        // sellout live auction
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // user2 places bid in slot 8
        const bidValue = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          8
        );
        await config.minter
          .connect(config.accounts.user2)
          .createBid(config.projectZero, config.genArt721Core.address, 8, {
            value: bidValue,
          });
        // advance to end of auction + 72 hours to get to State D
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds + 60 * 60 * 72,
        ]);
        // enter E1 state by reducing max invocations by 1
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 14);
        // user2 settles bid 16
        await config.minter
          .connect(config.accounts.user2)
          .collectSettlements(
            config.projectZero,
            config.genArt721Core.address,
            [16]
          );
        // record state before
        const auctionDetailsBefore = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        const projectBalanceBefore = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const user2BalanceBefore = await config.accounts.user2.getBalance();
        // direct refund by artist
        await config.minter
          .connect(config.accounts.artist)
          .adminArtistDirectRefundWinners(
            config.projectZero,
            config.genArt721Core.address,
            [16]
          );
        // record state after
        const auctionDetailsAfter = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        const projectBalanceAfter = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const user2BalanceAfter = await config.accounts.user2.getBalance();
        // verify relevant state updates
        expect(auctionDetailsBefore.numBidsErrorRefunded).to.equal(0);
        expect(auctionDetailsAfter.numBidsErrorRefunded).to.equal(1);
        const refundAmount = config.basePrice; // only non-settled value should be refunded
        expect(projectBalanceBefore.sub(projectBalanceAfter)).to.equal(
          refundAmount
        );
        expect(user2BalanceAfter.sub(user2BalanceBefore)).to.equal(
          refundAmount
        );
      });

      it("refunds multiple bids in one call", async function () {
        const config = await _beforeEach();
        // advance to State D w/ E1
        await configureProjectZeroAuctionSelloutAndAdvanceToStateDWithE1(
          config
        );
        // make 3 bids need refunds by further reducing max invocations
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 12);
        // record state before
        const auctionDetailsBefore = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        const projectBalanceBefore = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const userBalanceBefore = await config.accounts.user.getBalance();
        // direct refund by artist
        await config.minter
          .connect(config.accounts.artist)
          .adminArtistDirectRefundWinners(
            config.projectZero,
            config.genArt721Core.address,
            [15, 2, 1]
          );
        // record state after
        const auctionDetailsAfter = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        const projectBalanceAfter = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        const userBalanceAfter = await config.accounts.user.getBalance();
        // verify relevant state updates
        expect(auctionDetailsBefore.numBidsErrorRefunded).to.equal(0);
        expect(auctionDetailsAfter.numBidsErrorRefunded).to.equal(3);
        const refundAmount = config.basePrice.mul(3);
        expect(projectBalanceBefore.sub(projectBalanceAfter)).to.equal(
          refundAmount
        );
        expect(userBalanceAfter.sub(userBalanceBefore)).to.equal(refundAmount);
      });

      it("skip refund of a previously refunded bid", async function () {
        const config = await _beforeEach();
        // advance to State D w/ E1
        await configureProjectZeroAuctionSelloutAndAdvanceToStateDWithE1(
          config
        );
        // make 3 bids need refunds by further reducing max invocations
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 12);
        // direct refund by artist for bid ID 15
        await config.minter
          .connect(config.accounts.artist)
          .adminArtistDirectRefundWinners(
            config.projectZero,
            config.genArt721Core.address,
            [15]
          );
        // record state before
        const auctionDetailsBefore = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        // expect skip when refunding already-refunded bid
        await config.minter
          .connect(config.accounts.artist)
          .adminArtistDirectRefundWinners(
            config.projectZero,
            config.genArt721Core.address,
            [15]
          );
        // record state after
        const auctionDetailsAfter = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        // verify relevant state updates
        expect(auctionDetailsBefore.numBidsErrorRefunded).to.equal(1);
        expect(auctionDetailsAfter.numBidsErrorRefunded).to.equal(1);
      });
    });

    describe("winnerDirectRefund", async function () {
      // @dev overlapping library logic with adminArtistDirectRefundWinners,
      // only testing differences
      it("reverts when caller is not bidder", async function () {
        const config = await _beforeEach();
        // advance to State D w/ E1
        await configureProjectZeroAuctionSelloutAndAdvanceToStateDWithE1(
          config
        );
        // expect revert when non-bidder calls
        await expectRevert(
          config.minter
            .connect(config.accounts.user2)
            .winnerDirectRefund(
              config.projectZero,
              config.genArt721Core.address,
              [1]
            ),
          revertMessages.onlySenderIsBidder
        );
      });

      it("updates state when successful", async function () {
        const config = await _beforeEach();
        // advance to State D w/ E1
        await configureProjectZeroAuctionSelloutAndAdvanceToStateDWithE1(
          config
        );
        // auction state before
        const auctionDetailsBefore = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        // direct refund by winner
        await config.minter
          .connect(config.accounts.user)
          .winnerDirectRefund(
            config.projectZero,
            config.genArt721Core.address,
            [1]
          );
        // auction state after
        const auctionDetailsAfter = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        // verify relevant state updates
        expect(auctionDetailsBefore.numBidsErrorRefunded).to.equal(0);
        expect(auctionDetailsAfter.numBidsErrorRefunded).to.equal(1);
      });
    });

    describe("RAMLib data structure coverage", async function () {
      it("ejects bid from middle of doubly linked list", async function () {
        const config = await _beforeEach();
        // sellout live auction
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // user tops-up bid ID 8 to slot 2
        const bidValue = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          2
        );
        await config.minter
          .connect(config.accounts.user)
          .topUpBid(config.projectZero, config.genArt721Core.address, 8, 2, {
            value: bidValue.sub(config.basePrice),
          });
      });

      it("handles ejecting entire set of bids from a given slot", async function () {
        const config = await _beforeEach();
        // sellout live auction
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // minimum bid value should be base price
        expect(
          await config.minter.getLowestBidValue(
            config.projectZero,
            config.genArt721Core.address
          )
        ).to.equal(config.basePrice);
        // user tops-up all bids from slot 0 to slot 2
        const bidValueSlot2 = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          2
        );
        for (let i = 1; i < 16; i++) {
          await config.minter
            .connect(config.accounts.user)
            .topUpBid(config.projectZero, config.genArt721Core.address, i, 2, {
              value: bidValueSlot2.sub(config.basePrice),
            });
        }
        // minimum bid value should now be bidValueSlot2
        expect(
          await config.minter.getLowestBidValue(
            config.projectZero,
            config.genArt721Core.address
          )
        ).to.equal(bidValueSlot2);
      });

      it("handles populating bids in Bitmap B", async function () {
        const config = await _beforeEach();
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // place bid in slot 256
        const bidValue = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          256
        );
        await config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 256, {
            value: bidValue,
          });
        // verify bid was populated appropriately
        const getLowestBidValue = await config.minter.getLowestBidValue(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(getLowestBidValue).to.equal(bidValue);
      });

      it("handles ejecting bid from Bitmap B", async function () {
        const config = await _beforeEach();
        // sellout live auction
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // user places bid in slot 256
        const bidValue256 = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          256
        );
        await config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 256, {
            value: bidValue256,
          });
        // user tops-up bid ID 1 to slot 258
        const bidValue258 = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          258
        );
        await config.minter
          .connect(config.accounts.user)
          .topUpBid(config.projectZero, config.genArt721Core.address, 1, 258, {
            value: bidValue258.sub(bidValue256),
          });
        // min bid value should be bidValue258
        expect(
          await config.minter.getLowestBidValue(
            config.projectZero,
            config.genArt721Core.address
          )
        ).to.equal(bidValue258);
      });

      it("updates minBidSlotIndex when initial bid is placed above slot 0", async function () {
        const config = await _beforeEach();
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // place bid in slot 256
        const bidValue256 = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          256
        );
        await config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 256, {
            value: bidValue256,
          });
        // verify minBidSlotIndex was updated in underlying data structure
        const lowestBidValue = await config.minter.getLowestBidValue(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(lowestBidValue).to.equal(bidValue256);
      });

      it("updates minBidSlotIndex when single-token auction", async function () {
        const config = await _beforeEach();
        // configure project to be single-token
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 1);
        await initializeMinBidInProjectZeroAuction(config);
        // top-up bid ID 1 to slot 300
        const bidValue300 = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          300
        );
        await config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 300, {
            value: bidValue300,
          });
        // verify minBidSlotIndex was updated in underlying data structure
        const lowestBidValue = await config.minter.getLowestBidValue(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(lowestBidValue).to.equal(bidValue300);
        // also check top-up
        const bidValue301 = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          301
        );
        await config.minter
          .connect(config.accounts.user)
          .topUpBid(config.projectZero, config.genArt721Core.address, 2, 301, {
            value: bidValue301.sub(bidValue300),
          });
        const lowestBidValueAfterTopUp = await config.minter.getLowestBidValue(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(lowestBidValueAfterTopUp).to.equal(bidValue301);
      });

      it("handles _getMaxSlotWithBid scroll in Bitmap B", async function () {
        const config = await _beforeEach();
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // place bid in slot 300
        const bidValue300 = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          300
        );
        await config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 300, {
            value: bidValue300,
          });
        // place remaining bids in slot 256
        const bidValue256 = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          256
        );
        for (let i = 0; i < 14; i++) {
          await config.minter
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, 256, {
              value: bidValue256,
            });
        }
        // advance time to get to State C
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds + 1,
        ]);
        // record project balance before
        const projectBalanceBefore = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        // auto-mint first and second tokens, inducing the scroll
        await config.minter
          .connect(config.accounts.artist)
          .adminArtistAutoMintTokensToWinners(
            config.projectZero,
            config.genArt721Core.address,
            2
          );
        // record project balance after
        const projectBalanceAfter = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        // project balance should have been properly updated
        expect(projectBalanceBefore.sub(projectBalanceAfter)).to.equal(
          bidValue300.sub(bidValue256)
        );
        // expect two bids to have been minted tokens
        const auctionDetails = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(auctionDetails.numBidsMintedTokens).to.equal(2);
        expect(auctionDetails.minBidSlotIndex).to.equal(256);
      });

      it("handles _getMaxSlotWithBid scroll from Bitmap B to Bitmap A", async function () {
        const config = await _beforeEach();
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // place bid in slot 300
        const bidValue300 = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          300
        );
        await config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 300, {
            value: bidValue300,
          });
        // place remaining bids in slot 100
        const bidValue100 = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          100
        );
        for (let i = 0; i < 14; i++) {
          await config.minter
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, 100, {
              value: bidValue100,
            });
        }
        // advance time to get to State C
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds + 1,
        ]);
        // record project balance before
        const projectBalanceBefore = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        // auto-mint first and second tokens, inducing the scroll
        await config.minter
          .connect(config.accounts.artist)
          .adminArtistAutoMintTokensToWinners(
            config.projectZero,
            config.genArt721Core.address,
            2
          );
        // record project balance after
        const projectBalanceAfter = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        // project balance should have been properly updated
        expect(projectBalanceBefore.sub(projectBalanceAfter)).to.equal(
          bidValue300.sub(bidValue100)
        );
        // expect two bids to have been minted tokens
        const auctionDetails = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(auctionDetails.numBidsMintedTokens).to.equal(2);
        expect(auctionDetails.minBidSlotIndex).to.equal(100);
      });
    });

    describe("Outbid logic coverage", async function () {
      it("requires 5% increase for bid values below 0.5 ETH", async function () {
        const config = await _beforeEach();
        // "sellout" live auction
        // @dev do not use helper function, which sets min bid to 1 ETH
        // configure project zero
        const basePrice = ethers.utils.parseEther("0.1");
        await config.minter.connect(config.accounts.artist).setAuctionDetails(
          config.projectZero,
          config.genArt721Core.address,
          config.startTime,
          config.defaultAuctionLengthSeconds + config.startTime,
          basePrice,
          true, // allowExtraTime
          true // admin/artist only mint period if sellout
        );
        await advanceToAuctionStartTime(config);
        for (let i = 0; i < 15; i++) {
          await placeMinBidInProjectZeroAuction(config);
        }

        // place insufficient outbid value
        const bidValue1 = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          1
        );
        // one slot above base price should not be 5% higher, so should revert
        expect(basePrice?.mul(10_500).div(10_000)).to.be.gt(bidValue1);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, 1, {
              value: bidValue1,
            }),
          revertMessages.insufficientBidValue
        );
        // two slots should be >2.5% higher, but <5% higher, so should also revert
        const bidValue2 = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          2
        );
        expect(basePrice?.mul(10_500).div(10_000)).to.be.gt(bidValue2);
        expect(basePrice?.mul(10_250).div(10_000)).to.be.lt(bidValue2);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, 2, {
              value: bidValue2,
            }),
          revertMessages.insufficientBidValue
        );
        // confirm four slots above base price is >5% higher, so should not revert
        const bidValue4 = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          4
        );
        expect(basePrice?.mul(10_500).div(10_000)).to.be.lt(bidValue4);
        // no revert, should be successful
        await config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 4, {
            value: bidValue4,
          });
      });
    });

    it("requires 2.5% increase for bid values above 0.5 ETH", async function () {
      const config = await _beforeEach();
      // "sellout" live auction
      // @dev do not use helper function, which sets min bid to 1 ETH
      // configure project zero
      const basePrice = ethers.utils.parseEther("0.50001");
      await config.minter.connect(config.accounts.artist).setAuctionDetails(
        config.projectZero,
        config.genArt721Core.address,
        config.startTime,
        config.defaultAuctionLengthSeconds + config.startTime,
        basePrice,
        true, // allowExtraTime
        true // admin/artist only mint period if sellout
      );
      await advanceToAuctionStartTime(config);
      for (let i = 0; i < 15; i++) {
        await placeMinBidInProjectZeroAuction(config);
      }

      // place insufficient outbid value
      const bidValue1 = await config.minter.slotIndexToBidValue(
        config.projectZero,
        config.genArt721Core.address,
        1
      );
      // one slot above base price should not be 2.5% higher, so should revert
      expect(basePrice?.mul(10_250).div(10_000)).to.be.gt(bidValue1);
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 1, {
            value: bidValue1,
          }),
        revertMessages.insufficientBidValue
      );
      // two slots should be >2.5% higher, so should not revert
      const bidValue2 = await config.minter.slotIndexToBidValue(
        config.projectZero,
        config.genArt721Core.address,
        2
      );
      expect(basePrice?.mul(10_250).div(10_000)).to.be.lt(bidValue2);
      await config.minter
        .connect(config.accounts.user)
        .createBid(config.projectZero, config.genArt721Core.address, 2, {
          value: bidValue2,
        });
    });

    describe("prevents price overflow", async function () {
      it("doesn't allow slot price calculation to overflow", async function () {
        const config = await _beforeEach();
        // configure auction with maximum possible price
        // @base price must fit in uint88
        const maxPriceInvalid = ethers.BigNumber.from(2).pow(88);
        const maxPriceValid = maxPriceInvalid.sub(1);
        await expectRevert(
          config.minter.connect(config.accounts.artist).setAuctionDetails(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds + config.startTime,
            maxPriceInvalid, // base price
            true, // allowExtraTime
            true // admin/artist only mint period if sellout
          ),
          "SafeCast: value doesn't fit in 88 bits"
        );
        await config.minter.connect(config.accounts.artist).setAuctionDetails(
          config.projectZero,
          config.genArt721Core.address,
          config.startTime,
          config.defaultAuctionLengthSeconds + config.startTime,
          maxPriceValid, // base price
          true, // allowExtraTime
          true // admin/artist only mint period if sellout
        );
        // ensure price at slot 511 did not overflow
        const slot511PriceOnChainCalc = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          511
        );
        // independent calculation of slot 511 price
        const slot511PriceIndependent = maxPriceValid
          .mul(256)
          .sub(maxPriceValid.mul(128).div(64));
        expect(slot511PriceOnChainCalc).to.equal(slot511PriceIndependent);

        // reverts when requesting slot 512 price
        await expectRevert(
          config.minter.slotIndexToBidValue(
            config.projectZero,
            config.genArt721Core.address,
            512
          ),
          revertMessages.onlySlotLtNumSlots
        );
      });
    });

    describe("deletes bids", async function () {
      it("deletes bid when outbid, preventing future minting and refunding", async function () {
        const config = await _beforeEach();
        // configure project zero and sellout
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // user places bid in slot 8 and kicks out bid id 15
        const bidValue8 = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          8
        );
        await config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 8, {
            value: bidValue8,
          });
        // advance to end of auction + 72 hours to get to State D
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds + 60 * 60 * 72,
        ]);
        // direct mint bid id 15 should revert because it was removed
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistDirectMintTokensToWinners(
              config.projectZero,
              config.genArt721Core.address,
              [15]
            ),
          revertMessages.invalidBidId
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .winnerDirectMintTokens(
              config.projectZero,
              config.genArt721Core.address,
              [15]
            ),
          revertMessages.invalidBidId
        );
        // direct refund bid id 15 should revert because it was removed
        // enter E1 state by reducing max invocations by 1
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 14);
        // record project balance before
        const projectBalanceBefore = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminArtistDirectRefundWinners(
              config.projectZero,
              config.genArt721Core.address,
              [15]
            ),
          revertMessages.invalidBidId
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .winnerDirectRefund(
              config.projectZero,
              config.genArt721Core.address,
              [15]
            ),
          revertMessages.invalidBidId
        );
        // record project balance after
        const projectBalanceAfter = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        // project balance should not have changed
        expect(projectBalanceBefore).to.equal(projectBalanceAfter);
      });
    });
  });
});
