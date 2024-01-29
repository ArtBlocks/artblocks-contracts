// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IMinterFilterV1} from "../../../interfaces/v0.8.x/IMinterFilterV1.sol";

import {BitMaps256} from "../BitMap.sol";
import {ABHelpers} from "../ABHelpers.sol";
import {SplitFundsLib} from "./SplitFundsLib.sol";
import {MaxInvocationsLib} from "./MaxInvocationsLib.sol";

import {IERC721} from "@openzeppelin-5.0/contracts/token/ERC721/IERC721.sol";
import {SafeCast} from "@openzeppelin-5.0/contracts/utils/math/SafeCast.sol";
import {Math} from "@openzeppelin-5.0/contracts/utils/math/Math.sol";

/**
 * @title Art Blocks RAM Minter Library
 * @notice This library is designed for the Art Blocks platform. It includes
 * Structs and functions that help with ranked auction minters.
 * @author Art Blocks Inc.
 */
library RAMLib {
    using SafeCast for uint256;
    using BitMaps256 for uint256;
    /**
     * @notice Minimum auction length, in seconds, was updated to be the
     * provided value.
     * @param minAuctionDurationSeconds Minimum auction length, in seconds
     */
    event MinAuctionDurationSecondsUpdated(uint256 minAuctionDurationSeconds);

    /**
     * @notice Admin-controlled refund gas limit updated
     * @param refundGasLimit Gas limit to use when refunding the previous
     * highest bidder, prior to using fallback force-send to refund
     */
    event MinterRefundGasLimitUpdated(uint24 refundGasLimit);

    /**
     * @notice RAM auction buffer time parameters updated
     * @param auctionBufferSeconds time period at end of auction when new bids
     * can affect auction end time, updated to be this many seconds after the
     * bid is placed.
     * @param maxAuctionExtraSeconds maximum amount of time that can be added
     * to the auction end time due to new bids.
     */
    event AuctionBufferTimeParamsUpdated(
        uint256 auctionBufferSeconds,
        uint256 maxAuctionExtraSeconds
    );

    /**
     *
     * @param coreContract Core contract address to update
     * @param imposeConstraints bool representing if constraints should be
     * imposed on this contract
     * @param requireAdminOnlyMintPeriod bool representing if admin-only mint
     * is required for all projects on this contract
     * @param requireNoAdminOnlyMintPeriod bool representing if admin-only mint
     * is not allowed for all projects on this contract
     */
    event ContractConfigUpdated(
        address coreContract,
        bool imposeConstraints,
        bool requireAdminOnlyMintPeriod,
        bool requireNoAdminOnlyMintPeriod
    );

    /**
     * @notice Auction parameters updated
     * @param projectId Project Id to update
     * @param coreContract Core contract address to update
     * @param timestampStart Auction start timestamp
     * @param timestampEnd Auction end timestamp
     * @param basePrice Auction base price
     * @param allowExtraTime Auction allows extra time
     * @param adminOnlyMintPeriodIfSellout Auction admin-only mint period if
     * sellout
     * @param numTokensInAuction Auction number of tokens in auction
     */
    event AuctionConfigUpdated(
        uint256 projectId,
        address coreContract,
        uint256 timestampStart,
        uint256 timestampEnd,
        uint256 basePrice,
        bool allowExtraTime,
        bool adminOnlyMintPeriodIfSellout,
        uint256 numTokensInAuction
    );

    /**
     * @notice Number of tokens in auction updated
     * @dev okay to not index this event if prior to AuctionConfigUpdated, as
     * the state value will be emitted in another future event
     * @param projectId Project Id to update
     * @param coreContract Core contract address to update
     * @param numTokensInAuction Number of tokens in auction
     */
    event NumTokensInAuctionUpdated(
        uint256 projectId,
        address coreContract,
        uint256 numTokensInAuction
    );

    /**
     * @notice Auction timestamp end updated. Occurs when auction is extended
     * due to new bids near the end of an auction, when the auction is
     * configured to allow extra time.
     * @param projectId Project Id to update
     * @param coreContract Core contract address to update
     * @param timestampEnd Auction end timestamp
     */
    event AuctionTimestampEndUpdated(
        uint256 projectId,
        address coreContract,
        uint256 timestampEnd
    );

    /**
     * @notice Bid removed from auction
     * @param projectId Project Id to update
     * @param coreContract Core contract address to update
     * @param slotIndex Slot index of bid that was removed
     * @param bidIndexInSlot Bid index in slot of bid that was removed
     */
    event BidRemoved(
        uint256 projectId,
        address coreContract,
        uint256 slotIndex,
        uint256 bidIndexInSlot
    );

    /**
     * @notice Bid inserted in auction
     * @param projectId Project Id to update
     * @param coreContract Core contract address to update
     * @param slotIndex Slot index of bid that was added
     * @param bidIndexInSlot Bid index in slot of bid that was added
     */
    event BidInserted(
        uint256 projectId,
        address coreContract,
        uint256 slotIndex,
        uint256 bidIndexInSlot,
        address bidder
    );

    /**
     * @notice Bid was settled, and any payment above the lowest winning bid,
     * or base price if not a sellout, was refunded to the bidder.
     * @param projectId Project Id to update
     * @param coreContract Core contract address to update
     * @param slotIndex Slot index of bid that was settled
     * @param bidIndexInSlot Bid index in slot of bid that was settled
     */
    event BidSettled(
        uint256 projectId,
        address coreContract,
        uint256 slotIndex,
        uint256 bidIndexInSlot
    );

    /**
     * @notice Number of slots used by this RAM minter
     * @param numSlots Number of slots used by this RAM minter
     */
    event NumSlotsUpdated(uint256 numSlots);

    // position of RAM Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant RAM_LIB_STORAGE_POSITION = keccak256("ramlib.storage");

    uint256 constant NUM_SLOTS = 512;

    // pricing assumes maxPrice = minPrice * 2^8, pseudo-exponential curve
    uint256 constant SLOTS_PER_PRICE_DOUBLE = 512 / 8; // 64 slots per double

    // auction extension time constants
    uint256 constant AUCTION_BUFFER_SECONDS = 5 * 60; // 5 minutes
    uint256 constant MAX_AUCTION_EXTRA_SECONDS = 60 * 60; // 1 hour
    uint256 constant MAX_AUCTION_ADMIN_EMERGENCY_EXTENSION_HOURS = 72; // 24 hours

    // 60 sec/min * 60 min/hr * 24 hr
    uint256 constant ADMIN_ONLY_MINT_TIME_SECONDS = 60 * 60 * 72; // 72 hours

    enum ProjectMinterStates {
        A, // Pre-Auction
        B, // Live-Auction
        C, // Post-Auction, not all bids handled, admin-only mint period
        D, // Post-Auction, not all bids handled, post-admin-only mint period
        E // Post-Auction, all bids handled
    }

    // project-specific parameters
    struct RAMProjectConfig {
        // array of bids for each slot
        mapping(uint256 slot => Bid[] bids) bidsBySlot;
        // --- slot metadata for efficiency ---
        // two bitmaps with index set only if one or more active bids exist for
        // the corresponding slot. The first bitmap (A) is for slots 0-255, the
        // second bitmap (B) is for slots 256-511.
        uint256 slotsBitmapA;
        uint256 slotsBitmapB;
        // minimum bitmap index with an active bid
        // @dev max uint16 >> max possible value of 511 + 1
        uint16 minBidSlotIndex;
        // maximum bitmap index with an unminted bid
        // TODO - this could be populated when finishing auction via function input, bitshifting to verify...
        // @dev max uint16 >> max possible value of 511 + 1
        uint16 maxUnmintedBidSlotIndex;
        // TODO - determine if this should be updated on insertion/removal, or initialized when finishing auction
        // @dev max uint24 is 16,777,215 > 1_000_000 max project size
        uint24 maxUnmintedBidArrayIndex;
        // --- auction parameters ---
        // @dev max uint24 is 16,777,215 > 1_000_000 max project size
        uint24 numTokensInAuction;
        uint24 numBids;
        uint24 numBidsMintedTokens;
        uint24 numBidsErrorRefunded;
        // pricing and timing
        // @dev max uint40 ~= 1.1e12 sec ~= 34 thousand years
        uint40 timestampStart;
        uint40 timestampOriginalEnd;
        uint40 timestampEnd;
        // @dev max uint8 ~= 256 hours, which is gt max auction extension time of 72 hours
        uint8 adminEmergencyExtensionHoursApplied;
        bool allowExtraTime;
        bool adminOnlyMintPeriodIfSellout;
        // @dev max uint88 ~= 3e26 Wei = ~300 million ETH, which is well above
        // the expected prices of any NFT mint in the foreseeable future.
        uint88 basePrice;
        // --- auction state ---
        bool allWinningBidsSettled; // default false
    }

    struct Bid {
        address bidder;
        bool isSettled; // TODO: could remove this if amount is changed when settling
        bool isMinted; // TODO: determine if this is needed
    }

    // contract-specific parameters
    // @dev may not be indexed, but does impose on-chain constraints
    struct RAMContractConfig {
        bool imposeConstraints; // default false
        bool requireAdminOnlyMintPeriod;
        bool requireNoAdminOnlyMintPeriod;
    }

    // Diamond storage pattern is used in this library
    struct RAMLibStorage {
        mapping(address coreContract => mapping(uint256 projectId => RAMProjectConfig)) RAMProjectConfigs;
        mapping(address coreContract => RAMContractConfig) RAMContractConfigs;
    }

    function setContractConfig(
        address coreContract,
        bool imposeConstraints,
        bool requireAdminOnlyMintPeriod,
        bool requireNoAdminOnlyMintPeriod
    ) internal {
        // CHECKS
        // require not both constraints set to true, since mutually exclusive
        require(
            !(requireAdminOnlyMintPeriod && requireNoAdminOnlyMintPeriod),
            "Only one constraint can be set"
        );
        // load contract config
        RAMContractConfig storage RAMContractConfig_ = getRAMContractConfig({
            coreContract: coreContract
        });
        // set contract config
        RAMContractConfig_.imposeConstraints = imposeConstraints;
        RAMContractConfig_
            .requireAdminOnlyMintPeriod = requireAdminOnlyMintPeriod;
        RAMContractConfig_
            .requireNoAdminOnlyMintPeriod = requireNoAdminOnlyMintPeriod;
        // emit event
        emit ContractConfigUpdated({
            coreContract: coreContract,
            imposeConstraints: imposeConstraints,
            requireAdminOnlyMintPeriod: requireAdminOnlyMintPeriod,
            requireNoAdminOnlyMintPeriod: requireNoAdminOnlyMintPeriod
        });
    }

    /**
     * @notice Function to add emergency auction hours to auction of
     * project `projectId` on core contract `coreContract`.
     * Protects against unexpected frontend downtime, etc.
     * Reverts if called by anyone other than a contract admin.
     * Reverts if project is not in a Live Auction.
     * Reverts if auction is already in extra time.
     * Reverts if adding more than the maximum number of emergency hours.
     * @param projectId Project ID to add emergency auction hours to.
     * @param coreContract Core contract address for the given project.
     * @param emergencyHoursToAdd Number of emergency hours to add to the
     * project's auction.
     */
    function adminAddEmergencyAuctionHours(
        uint256 projectId,
        address coreContract,
        uint8 emergencyHoursToAdd
    ) internal {
        // load project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        // CHECKS
        // require auction in state B (Live Auction)
        require(
            getProjectMinterState(projectId, coreContract) ==
                ProjectMinterStates.B,
            "Only state B"
        );
        // require auction has not reached extra time
        require(
            RAMProjectConfig_.timestampOriginalEnd ==
                RAMProjectConfig_.timestampEnd,
            "Not allowed in extra time"
        );
        // require auction is not being extended beyond limit
        uint256 currentEmergencyHoursApplied = RAMProjectConfig_
            .adminEmergencyExtensionHoursApplied;
        require(
            currentEmergencyHoursApplied + emergencyHoursToAdd <=
                MAX_AUCTION_ADMIN_EMERGENCY_EXTENSION_HOURS,
            "Only emergency hours lt max"
        );

        // EFFECTS
        // update emergency hours applied
        // @dev overflow automatically checked in solidity 0.8
        RAMProjectConfig_.adminEmergencyExtensionHoursApplied = uint8(
            currentEmergencyHoursApplied + emergencyHoursToAdd
        );
        // update auction end time
        // @dev update both original end timestamp and current end timestamp
        // because this is not extra time, but rather an emergency extension
        uint256 newTimestampEnd = RAMProjectConfig_.timestampEnd +
            emergencyHoursToAdd *
            1 hours;
        RAMProjectConfig_.timestampEnd = uint40(newTimestampEnd);
        RAMProjectConfig_.timestampOriginalEnd = uint40(newTimestampEnd);

        // emit event
        emit AuctionTimestampEndUpdated({
            projectId: projectId,
            coreContract: coreContract,
            timestampEnd: newTimestampEnd
        });
    }

    // Reminder - note assumption of being in ProjectMinterState A
    function setAuctionDetails(
        uint256 projectId,
        address coreContract,
        uint40 auctionTimestampStart,
        uint40 auctionTimestampEnd,
        uint88 basePrice,
        bool allowExtraTime,
        bool adminOnlyMintPeriodIfSellout
    ) internal {
        // load project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        // CHECKS
        // @dev function assumes currently in ProjectMinterState A
        // require base price >= 0.05 ETH
        require(basePrice >= 0.05 ether, "Only base price gte 0.05 ETH");
        // require end time after start time
        // @dev no coverage, minter already checks via min auction length check
        require(
            auctionTimestampEnd > auctionTimestampStart,
            "Only end time gt start time"
        );
        // enforce contract-level constraints set by contract admin
        RAMContractConfig storage RAMContractConfig_ = getRAMContractConfig({
            coreContract: coreContract
        });
        if (RAMContractConfig_.imposeConstraints) {
            if (RAMContractConfig_.requireAdminOnlyMintPeriod) {
                require(
                    adminOnlyMintPeriodIfSellout,
                    "Only admin-only mint period"
                );
            }
            if (RAMContractConfig_.requireNoAdminOnlyMintPeriod) {
                require(
                    !adminOnlyMintPeriodIfSellout,
                    "Only no admin-only mint period"
                );
            }
        }

        // set auction details
        RAMProjectConfig_.timestampStart = auctionTimestampStart;
        RAMProjectConfig_.timestampEnd = auctionTimestampEnd;
        RAMProjectConfig_.basePrice = basePrice;
        RAMProjectConfig_.allowExtraTime = allowExtraTime;
        RAMProjectConfig_
            .adminOnlyMintPeriodIfSellout = adminOnlyMintPeriodIfSellout;
        // refresh numTokensInAuction
        uint256 numTokensInAuction = refreshNumTokensInAuction({
            projectId: projectId,
            coreContract: coreContract
        });

        // emit state change event
        emit AuctionConfigUpdated({
            projectId: projectId,
            coreContract: coreContract,
            timestampStart: auctionTimestampStart,
            timestampEnd: auctionTimestampEnd,
            basePrice: basePrice,
            allowExtraTime: allowExtraTime,
            adminOnlyMintPeriodIfSellout: adminOnlyMintPeriodIfSellout,
            numTokensInAuction: numTokensInAuction
        });
    }

    function refreshNumTokensInAuction(
        uint256 projectId,
        address coreContract
    ) internal returns (uint256 numTokensInAuction) {
        // load project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        // @dev safe to cast - max uint24 is 16_777_215 > 1_000_000 max project size
        numTokensInAuction = MaxInvocationsLib.getInvocationsAvailable({
            projectId: projectId,
            coreContract: coreContract
        });
        RAMProjectConfig_.numTokensInAuction = uint24(numTokensInAuction);

        // emit event for state change
        emit NumTokensInAuctionUpdated({
            projectId: projectId,
            coreContract: coreContract,
            numTokensInAuction: numTokensInAuction
        });
    }

    /**
     * @notice Collects settlement for project `projectId` on core contract
     * `coreContract` for all bid in `slotIndex` at `bidIndexInSlot`.
     * Reverts if project is not in a post-auction state.
     * Reverts if bidder is not the bid's bidder.
     * Reverts if bid has already been settled.
     * Reverts if invalid bid.
     * @param projectId Project ID of bid to collect settlement for
     * @param coreContract Core contract address for the given project.
     * @param slotIndex Slot index of bid to collect settlement for
     * @param bidIndexInSlot Bid index in slot of bid to collect settlement for
     * @param bidder Bidder address of bid to collect settlement for
     * @param minterRefundGasLimit Gas limit to use when refunding the bidder.
     */
    function collectSettlement(
        uint256 projectId,
        address coreContract,
        uint16 slotIndex,
        uint24 bidIndexInSlot,
        address bidder,
        uint256 minterRefundGasLimit
    ) internal {
        // load project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        // CHECKS (project-level checks)
        // require project minter state E (Post-Auction, all bids handled)
        ProjectMinterStates projectMinterState = getProjectMinterState({
            projectId: projectId,
            coreContract: coreContract
        });
        require(
            projectMinterState == ProjectMinterStates.C ||
                projectMinterState == ProjectMinterStates.D,
            "Only state C or D"
        );
        // get project price, depending on if it was a sellout
        bool wasSellout = RAMProjectConfig_.numBids ==
            RAMProjectConfig_.numTokensInAuction;
        uint256 projectPrice = wasSellout
            ? slotIndexToBidValue({
                basePrice: RAMProjectConfig_.basePrice,
                slotIndex: RAMProjectConfig_.minBidSlotIndex
            })
            : RAMProjectConfig_.basePrice;
        // settle the bid
        settleBid({
            RAMProjectConfig_: RAMProjectConfig_,
            projectId: projectId,
            coreContract: coreContract,
            projectPrice: projectPrice,
            slotIndex: slotIndex,
            bidIndexInSlot: bidIndexInSlot,
            bidder: bidder,
            minterRefundGasLimit: minterRefundGasLimit
        });
    }

    /**
     * @notice Collects settlement for project `projectId` on core contract
     * `coreContract` for all bids in `slotIndices` at `bidIndicesInSlot`,
     * which must be aligned by index.
     * Reverts if project is not in a post-auction state.
     * Reverts if bidder is not the bidder for all bids.
     * Reverts if one or more bids has already been settled.
     * Reverts if invalid bid is found.
     * @param projectId Project ID of bid to collect settlement for
     * @param coreContract Core contract address for the given project.
     * @param slotIndices Slot indices of bids to collect settlements for
     * @param bidIndicesInSlot Bid indices in slot of bid to collect
     * settlements for
     * @param bidder Bidder address of bid to collect settlements for
     * @param minterRefundGasLimit Gas limit to use when refunding the bidder.
     */
    function collectSettlements(
        uint256 projectId,
        address coreContract,
        uint16[] calldata slotIndices,
        uint24[] calldata bidIndicesInSlot,
        address bidder,
        uint256 minterRefundGasLimit
    ) internal {
        // load project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        // CHECKS
        // input validation
        require(
            slotIndices.length == bidIndicesInSlot.length,
            "Input lengths must match"
        );
        // (project-level checks)
        // @dev block scope to avoid stack too deep error
        {
            // require project minter state E (Post-Auction, all bids handled)
            ProjectMinterStates projectMinterState = getProjectMinterState({
                projectId: projectId,
                coreContract: coreContract
            });
            require(
                projectMinterState == ProjectMinterStates.C ||
                    projectMinterState == ProjectMinterStates.D,
                "Only state C or D"
            );
        }

        // get project price, depending on if it was a sellout
        bool wasSellout = RAMProjectConfig_.numBids ==
            RAMProjectConfig_.numTokensInAuction;
        uint256 projectPrice = wasSellout
            ? slotIndexToBidValue({
                basePrice: RAMProjectConfig_.basePrice,
                slotIndex: RAMProjectConfig_.minBidSlotIndex
            })
            : RAMProjectConfig_.basePrice;
        // settle each input bid
        // @dev already verified that input lengths match
        uint256 inputBidsLength = slotIndices.length;
        // @dev use unchecked loop incrementing for gas efficiency
        for (uint256 i; i < inputBidsLength; ) {
            // settle the bid
            settleBid({
                RAMProjectConfig_: RAMProjectConfig_,
                projectId: projectId,
                coreContract: coreContract,
                projectPrice: projectPrice,
                slotIndex: slotIndices[i],
                bidIndexInSlot: bidIndicesInSlot[i],
                bidder: bidder,
                minterRefundGasLimit: minterRefundGasLimit
            });
            // increment loop counter
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Place a new bid for a project.
     * Assumes check that minter is set for project on minter filter has
     * already been performed.
     * Reverts if project is not in state B (Live Auction).
     * Reverts if bid value is not equal to the slot value.
     * @param projectId Project Id to place bid for
     * @param coreContract Core contract address to place bid for
     * @param slotIndex Slot index to place bid at
     * @param bidder Bidder address
     * @param bidValue Bid value, in Wei (verified to align with slotIndex)
     * @param minterRefundGasLimit Gas limit to use when refunding the previous
     * highest bidder, prior to using fallback force-send to refund
     */
    function placeBid(
        uint256 projectId,
        address coreContract,
        uint8 slotIndex,
        address bidder,
        uint256 bidValue,
        uint256 minterRefundGasLimit
    ) internal {
        // load project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        // CHECKS
        // require project minter state B (Live Auction)
        require(
            getProjectMinterState(projectId, coreContract) ==
                ProjectMinterStates.B,
            "Only state B"
        );
        // require bid value must equal slot value
        uint256 newBidRequiredValue = slotIndexToBidValue({
            basePrice: RAMProjectConfig_.basePrice,
            slotIndex: slotIndex
        });
        require(
            bidValue == newBidRequiredValue,
            "msg.value must equal slot value"
        );

        // EFFECTS
        // if first bid, refresh max invocations in case artist has reduced
        // the core contract's max invocations after the auction was configured
        // @dev this helps prevent E1 error state
        if (RAMProjectConfig_.numBids == 0) {
            // refresh max invocations
            MaxInvocationsLib.refreshMaxInvocations({
                projectId: projectId,
                coreContract: coreContract
            });
            // also refresh numTokensInAuction for RAM project config
            refreshNumTokensInAuction({
                projectId: projectId,
                coreContract: coreContract
            });
        }
        // require at least one token allowed in auction
        // @dev this case would revert in removeMinBid, but prefer clean error
        // message here
        uint256 numTokensInAuction = RAMProjectConfig_.numTokensInAuction;
        require(numTokensInAuction > 0, "No bids in auction");
        // determine if have reached max bids
        bool reachedMaxBids = RAMProjectConfig_.numBids == numTokensInAuction;
        if (reachedMaxBids) {
            // remove + refund the minimum Bid
            uint16 removedSlotIndex = removeMinBid({
                RAMProjectConfig_: RAMProjectConfig_,
                projectId: projectId,
                coreContract: coreContract,
                minterRefundGasLimit: minterRefundGasLimit
            });
            // require new bid is sufficiently greater than removed minimum bid
            uint256 removedBidValue = slotIndexToBidValue({
                basePrice: RAMProjectConfig_.basePrice,
                slotIndex: removedSlotIndex
            });
            if (bidValue > 0.5 ether) {
                // require new bid is at least 2.5% greater than removed minimum bid
                require(
                    bidValue > (removedBidValue * 10250) / 10000,
                    "Insufficient bid value"
                );
            } else {
                // require new bid is at least 5% greater than removed minimum bid
                require(
                    bidValue > (removedBidValue * 10500) / 10000,
                    "Insufficient bid value"
                );
            }

            // apply auction extension time if needed
            bool timeExtensionNeeded = RAMProjectConfig_.allowExtraTime &&
                block.timestamp >
                RAMProjectConfig_.timestampEnd - AUCTION_BUFFER_SECONDS;
            if (timeExtensionNeeded) {
                // extend auction end time to no longer than
                // MAX_AUCTION_EXTRA_SECONDS after original end time
                RAMProjectConfig_.timestampEnd = uint40(
                    Math.min(
                        RAMProjectConfig_.timestampOriginalEnd +
                            MAX_AUCTION_EXTRA_SECONDS,
                        block.timestamp + AUCTION_BUFFER_SECONDS
                    )
                );
            }
            emit AuctionTimestampEndUpdated({
                projectId: projectId,
                coreContract: coreContract,
                timestampEnd: RAMProjectConfig_.timestampEnd
            });
        }
        // insert the new Bid
        insertBid({
            RAMProjectConfig_: RAMProjectConfig_,
            projectId: projectId,
            coreContract: coreContract,
            slotIndex: slotIndex,
            bidder: bidder
        });
    }

    // TODO: add assumptions/protections about max bids, active auction, etc.
    function insertBid(
        RAMProjectConfig storage RAMProjectConfig_,
        uint256 projectId,
        address coreContract,
        uint16 slotIndex,
        address bidder
    ) private {
        // add the new Bid
        Bid[] storage bids = RAMProjectConfig_.bidsBySlot[slotIndex];
        bids.push(Bid({bidder: bidder, isSettled: false, isMinted: false}));
        // update number of active bids
        RAMProjectConfig_.numBids++;
        // update metadata if first bid for this slot
        // @dev assumes minting has not yet started
        // @dev load into memory for gas efficiency
        uint256 newBidsLength = bids.length;
        if (newBidsLength == 1) {
            // set the slot in the bitmap
            setBitmapSlot({
                RAMProjectConfig_: RAMProjectConfig_,
                slotIndex: slotIndex
            });
            // update bitmap metadata - reduce min bid index if necessary
            if (slotIndex < RAMProjectConfig_.minBidSlotIndex) {
                RAMProjectConfig_.minBidSlotIndex = slotIndex;
            }
            // update bitmap metadata - increase max unminted bid index if necessary
            if (slotIndex > RAMProjectConfig_.maxUnmintedBidSlotIndex) {
                RAMProjectConfig_.maxUnmintedBidSlotIndex = slotIndex;
            }
        }

        // emit state change event
        emit BidInserted({
            projectId: projectId,
            coreContract: coreContract,
            slotIndex: slotIndex,
            bidIndexInSlot: newBidsLength - 1, // index of new bid in slot
            bidder: bidder
        });
    }

    /**
     * @notice Remove minimum bid from the project's RAMProjectConfig.
     * Reverts if no bids exist in slot RAMProjectConfig_.minBidSlotIndex.
     * @param RAMProjectConfig_ RAM project config to remove bid from
     * @param minterRefundGasLimit Gas limit to use when refunding the previous
     * highest bidder, prior to using fallback force-send to refund
     */
    function removeMinBid(
        RAMProjectConfig storage RAMProjectConfig_,
        uint256 projectId,
        address coreContract,
        uint256 minterRefundGasLimit
    ) private returns (uint16 removedSlotIndex) {
        // get the minimum bid
        removedSlotIndex = RAMProjectConfig_.minBidSlotIndex;
        // get the bids array for that slot
        Bid[] storage bids = RAMProjectConfig_.bidsBySlot[removedSlotIndex];
        // record the previous min bidder
        uint256 removedBidIndexInSlot = bids.length - 1;
        address removedBidder = bids[removedBidIndexInSlot].bidder;
        // pop the last active bid in the array
        // @dev implicitly deletes the last bid in the array
        // @dev appropriate because earlier bids (lower index) have priority;
        // TODO: gas-optimize this by only editing array length since once remove a bid, will never re-add on that slot
        bids.pop();
        RAMProjectConfig_.numBids--;
        // update metadata if no more active bids for this slot
        if (bids.length == 0) {
            // unset the slot in the bitmap
            // update minBidIndex, efficiently starting at minBidSlotIndex + 1
            unsetBitmapSlot({
                RAMProjectConfig_: RAMProjectConfig_,
                slotIndex: removedSlotIndex
            });
            // @dev reverts if removedSlotIndex was the maximum slot 511,
            // preventing bids from being removed entirely from the last slot,
            // which is acceptable and non-impacting for this minter
            // @dev sets minBidSlotIndex to 512 if no more active bids
            RAMProjectConfig_.minBidSlotIndex = getMinSlotWithBid({
                RAMProjectConfig_: RAMProjectConfig_,
                startSlotIndex: removedSlotIndex + 1
            });
        }
        // refund the removed bidder
        uint256 removedBidAmount = slotIndexToBidValue({
            basePrice: RAMProjectConfig_.basePrice,
            slotIndex: removedSlotIndex
        });
        SplitFundsLib.forceSafeTransferETH({
            to: removedBidder,
            amount: removedBidAmount,
            minterRefundGasLimit: minterRefundGasLimit
        });

        // emit state change event
        emit BidRemoved({
            projectId: projectId,
            coreContract: coreContract,
            slotIndex: removedSlotIndex,
            bidIndexInSlot: removedBidIndexInSlot
        });
    }

    /**
     * @notice Returns the value of a bid in a given slot, in Wei.
     * @dev returns 0 if base price is zero
     * @param basePrice Base price (or reserve price) of the auction, in Wei
     * @param slotIndex Slot index to query
     * @return slotBidValue Value of a bid in the slot, in Wei
     */
    function slotIndexToBidValue(
        uint256 basePrice,
        uint16 slotIndex
    ) internal pure returns (uint256 slotBidValue) {
        // use pseud-exponential pricing curve
        // multiply by two (via bit-shifting) for the number of entire
        // slots-per-price-double associated with the slot index
        slotBidValue = basePrice << (slotIndex / SLOTS_PER_PRICE_DOUBLE);
        // perform a linear interpolation between partial half-life points, to
        // approximate the current place on a perfect exponential curve.
        // @dev overflow automatically checked in solidity 0.8, not expected
        slotBidValue +=
            (slotBidValue * (slotIndex % SLOTS_PER_PRICE_DOUBLE)) /
            SLOTS_PER_PRICE_DOUBLE;
    }

    // TODO - handle case where there are no bids
    function getMinBid(
        uint256 projectId,
        address coreContract
    ) internal view returns (Bid storage minBid, uint16 minSlotIndex) {
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        // get first slot with an active bid
        minSlotIndex = RAMProjectConfig_.minBidSlotIndex;
        // get the bids array for that slot
        Bid[] storage bids = RAMProjectConfig_.bidsBySlot[minSlotIndex];
        // get the last active bid in the array
        // @dev get last because earlier bids (lower index) have priority
        minBid = bids[bids.length - 1];
    }

    function getAuctionDetails(
        uint256 projectId,
        address coreContract
    )
        internal
        view
        returns (
            uint40 auctionTimestampStart,
            uint40 auctionTimestampEnd,
            uint88 basePrice,
            uint24 numTokensInAuction,
            uint24 numBids
        )
    {
        // get project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        // get auction details
        auctionTimestampStart = RAMProjectConfig_.timestampStart;
        auctionTimestampEnd = RAMProjectConfig_.timestampEnd;
        basePrice = RAMProjectConfig_.basePrice;
        numTokensInAuction = RAMProjectConfig_.numTokensInAuction;
        numBids = RAMProjectConfig_.numBids;
    }

    function getProjectMinterState(
        uint256 projectId,
        address coreContract
    ) internal view returns (ProjectMinterStates) {
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        // State A: Pre-Auction
        // @dev load to memory for gas efficiency
        uint256 timestampStart = RAMProjectConfig_.timestampStart;
        // helper value(s) for readability
        bool auctionIsConfigured = timestampStart > 0;
        bool isPreAuction = block.timestamp < timestampStart;
        // confirm that auction is either not configured or is pre-auction
        if ((!auctionIsConfigured) || isPreAuction) {
            return ProjectMinterStates.A;
        }
        // State B: Live-Auction
        // @dev auction is configured due to previous State A return
        // helper value(s) for readability
        // @dev load to memory for gas efficiency
        uint256 timestampEnd = RAMProjectConfig_.timestampEnd;
        bool isPostAuction = block.timestamp > timestampEnd;
        bool isLiveAuction = !(isPreAuction || isPostAuction);
        if (isLiveAuction) {
            return ProjectMinterStates.B;
        }
        // States C, D, E: Post-Auction
        // @dev auction is configured and post auction due to previous States A, B returns
        // all winners sent tokens means all bids have either been minted tokens or refunded if error state occurred
        bool allBidsHandled = RAMProjectConfig_.numBidsMintedTokens +
            RAMProjectConfig_.numBidsErrorRefunded ==
            RAMProjectConfig_.numBids;
        if (allBidsHandled) {
            // State E: Post-Auction, all bids handled
            return ProjectMinterStates.E;
        }
        // @dev all bids are not handled due to previous State E return
        bool adminOnlyMintPeriod = RAMProjectConfig_
        // @dev if project is configured to have an admin-only mint period
            .adminOnlyMintPeriodIfSellout &&
            // @dev sellout if numBids == numTokensInAuction
            RAMProjectConfig_.numBids == RAMProjectConfig_.numTokensInAuction &&
            // @dev still in admin-only mint period if current time < end time + admin-only mint period
            block.timestamp < timestampEnd + ADMIN_ONLY_MINT_TIME_SECONDS;
        if (adminOnlyMintPeriod) {
            // State C: Post-Auction, not all bids handled, admin-only mint period
            return ProjectMinterStates.C;
        }
        // State D: Post-Auction, not all bids handled, post-admin-only mint period
        // @dev states are mutually exclusive, so must be in final remaining state
        return ProjectMinterStates.D;
    }

    /**
     * @notice Returns if project minter is in FLAG state F1.
     * F1: tokens owed < invocations available
     * Occurs when: auction ends before selling out
     * @param projectId Project Id to query
     * @param coreContract Core contract address to query
     */
    function isFlagF1(
        uint256 projectId,
        address coreContract
    ) internal view returns (bool) {
        // get project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        // F1: Tokens owed < invocations available
        // @dev underflow impossible given what the parameters represent
        uint256 tokensOwed = RAMProjectConfig_.numBids -
            (RAMProjectConfig_.numBidsMintedTokens +
                RAMProjectConfig_.numBidsErrorRefunded);
        uint256 invocationsAvailable = MaxInvocationsLib
            .getInvocationsAvailable({
                projectId: projectId,
                coreContract: coreContract
            });
        return tokensOwed < invocationsAvailable;
    }

    /**
     * @notice Returns if project minter is in ERROR state E1.
     * E1: Tokens owed > invocations available
     * Occurs when: tokens are minted on different minter after auction begins,
     * or when core contract max invocations are reduced after auction begins.
     * Resolution: Admin must refund the lowest bids after auction ends.
     * @param projectId Project Id to query
     * @param coreContract Core contract address to query
     */
    function isErrorE1(
        uint256 projectId,
        address coreContract
    ) internal view returns (bool) {
        // get project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        // E1: Tokens owed > invocations available
        // @dev underflow impossible given what the parameters represent
        uint256 tokensOwed = RAMProjectConfig_.numBids -
            (RAMProjectConfig_.numBidsMintedTokens +
                RAMProjectConfig_.numBidsErrorRefunded);
        uint256 invocationsAvailable = MaxInvocationsLib
            .getInvocationsAvailable({
                projectId: projectId,
                coreContract: coreContract
            });
        return tokensOwed > invocationsAvailable;
    }

    /**
     * Loads the RAMProjectConfig for a given project and core
     * contract.
     * @param projectId Project Id to get config for
     * @param coreContract Core contract address to get config for
     */
    function getRAMProjectConfig(
        uint256 projectId,
        address coreContract
    ) internal view returns (RAMProjectConfig storage) {
        return s().RAMProjectConfigs[coreContract][projectId];
    }

    /**
     * Loads the RAMContractConfig for a given core contract.
     * @param coreContract Core contract address to get config for
     */
    function getRAMContractConfig(
        address coreContract
    ) internal view returns (RAMContractConfig storage) {
        return s().RAMContractConfigs[coreContract];
    }

    /**
     * @notice Return the storage struct for reading and writing. This library
     * uses a diamond storage pattern when managing storage.
     * @return storageStruct The SEALibStorage struct.
     */
    function s() private pure returns (RAMLibStorage storage storageStruct) {
        bytes32 position = RAM_LIB_STORAGE_POSITION;
        assembly ("memory-safe") {
            storageStruct.slot := position
        }
    }

    /**
     * @notice Helper function to handle settling a bid.
     * Reverts if bidder is not the bid's bidder.
     * Reverts if bid has already been settled.
     * @param RAMProjectConfig_ RAMProjectConfig to update
     * @param projectId Project ID of bid to settle
     * @param coreContract Core contract address for the given project.
     * @param projectPrice Price of token on the project
     * @param slotIndex Slot index of bid to settle
     * @param bidIndexInSlot Bid index in slot of bid to settle
     * @param bidder Bidder address of bid to settle
     * @param minterRefundGasLimit Gas limit to use when refunding the bidder.
     */
    function settleBid(
        RAMProjectConfig storage RAMProjectConfig_,
        uint256 projectId,
        address coreContract,
        uint256 projectPrice,
        uint16 slotIndex,
        uint256 bidIndexInSlot,
        address bidder,
        uint256 minterRefundGasLimit
    ) private {
        // CHECKS
        Bid storage bid = RAMProjectConfig_.bidsBySlot[slotIndex][
            bidIndexInSlot
        ];
        // require bidder is the bid's bidder
        require(bid.bidder == bidder, "Only bidder");
        // require bid is not yet settled
        require(bid.isSettled, "Only un-settled bid");

        // EFFECTS
        // update bid state
        bid.isSettled = true;

        // INTERACTIONS
        // transfer amount due to bidder
        uint256 bidAmount = slotIndexToBidValue({
            basePrice: RAMProjectConfig_.basePrice,
            slotIndex: slotIndex
        });
        uint256 amountDue = bidAmount - projectPrice;
        if (amountDue > 0) {
            SplitFundsLib.forceSafeTransferETH({
                to: bidder,
                amount: amountDue,
                minterRefundGasLimit: minterRefundGasLimit
            });
        }

        // emit state change event
        emit BidSettled({
            projectId: projectId,
            coreContract: coreContract,
            slotIndex: slotIndex,
            bidIndexInSlot: bidIndexInSlot
        });
    }

    /**
     * @notice Helper function to handle setting slot in 512-bit bitmap
     * @dev WARN Assumes slotIndex is between 0 and 511, function will cast
     * incorrectly if >=512
     * @param slotIndex Index of slot to set (between 0 and 511)
     * @param RAMProjectConfig_ RAMProjectConfig to update
     */
    function setBitmapSlot(
        RAMProjectConfig storage RAMProjectConfig_,
        uint256 slotIndex
    ) private {
        // set the slot in the bitmap
        if (slotIndex < 256) {
            // @dev <256 conditional ensures no overflow when casting to uint8
            RAMProjectConfig_.slotsBitmapA = RAMProjectConfig_.slotsBitmapA.set(
                uint8(slotIndex)
            );
        } else {
            // @dev <512 assumption results in no overflow when casting to
            // uint8, but NOT guaranteed by any means in this function
            RAMProjectConfig_.slotsBitmapB = RAMProjectConfig_.slotsBitmapB.set(
                // @dev casting to uint8 intentional overflow instead of
                // subtracting 256 from slotIndex
                uint8(slotIndex)
            );
        }
    }

    /**
     * @notice Helper function to handle unsetting slot in 512-bit bitmap
     * @dev WARN Assumes slotIndex is between 0 and 511, function will cast
     * incorrectly if >=512
     * @param slotIndex Index of slot to set (between 0 and 511)
     * @param RAMProjectConfig_ RAMProjectConfig to update
     */
    function unsetBitmapSlot(
        RAMProjectConfig storage RAMProjectConfig_,
        uint256 slotIndex
    ) private {
        // set the slot in the bitmap
        if (slotIndex < 256) {
            // @dev <256 conditional ensures no overflow when casting to uint8
            RAMProjectConfig_.slotsBitmapA = RAMProjectConfig_
                .slotsBitmapA
                .unset(uint8(slotIndex));
        } else {
            // @dev <512 assumption results in no overflow when casting to
            // uint8, but NOT guaranteed by any means in this function
            // @dev casting to uint8 intentional overflow instead of
            // subtracting 256 from slotIndex
            RAMProjectConfig_.slotsBitmapB = RAMProjectConfig_
                .slotsBitmapB
                .unset(
                    // @dev casting to uint8 intentional overflow instead of
                    // subtracting 256 from slotIndex
                    uint8(slotIndex)
                );
        }
    }

    /**
     * @notice Helper function to get minimum slot index with an active bid
     * Reverts if startSlotIndex > 511, since this library only supports 512
     * slots.
     * @param RAMProjectConfig_ RAM project config to query
     * @param startSlotIndex Slot index to start search at
     * @return minSlotWithBid Minimum slot index with an active bid, or 512 if
     * no bids exist
     */
    function getMinSlotWithBid(
        RAMProjectConfig storage RAMProjectConfig_,
        uint16 startSlotIndex
    ) private view returns (uint16 minSlotWithBid) {
        // revert if startSlotIndex > 511, since this is an invalid input
        if (startSlotIndex > 511) {
            revert("Only start slot index lt 512");
        }
        // start at startSlotIndex
        if (startSlotIndex > 255) {
            // @dev <512 check results in no overflow when casting to uint8
            minSlotWithBid = uint16(
                256 +
                    RAMProjectConfig_.slotsBitmapB.minBitSet(
                        // @dev casting to uint8 intentional overflow instead of
                        // subtracting 256 from slotIndex
                        uint8(startSlotIndex)
                    )
            );
        } else {
            // @dev <256 conditional ensures no overflow when casting to uint8
            minSlotWithBid = uint16(
                RAMProjectConfig_.slotsBitmapA.minBitSet(uint8(startSlotIndex))
            );
            // if no bids in first bitmap, check second bitmap
            // @dev behavior of library's minBitSet is to return 256 if no bits
            // were set
            if (minSlotWithBid == 256) {
                // @dev <512 check results in no overflow when casting to uint8
                minSlotWithBid = uint16(
                    256 +
                        RAMProjectConfig_.slotsBitmapB.minBitSet(
                            // start at beginning of second bitmap
                            uint8(0)
                        )
                );
            }
        }
    }
}
