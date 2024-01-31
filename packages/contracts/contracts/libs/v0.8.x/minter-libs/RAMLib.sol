// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IMinterFilterV1} from "../../../interfaces/v0.8.x/IMinterFilterV1.sol";

import {BitMaps256} from "../BitMap.sol";
import {ABHelpers} from "../ABHelpers.sol";
import {SplitFundsLib} from "./SplitFundsLib.sol";
import {MaxInvocationsLib} from "./MaxInvocationsLib.sol";
import {GenericMinterEventsLib} from "./GenericMinterEventsLib.sol";

import {IERC721} from "@openzeppelin-5.0/contracts/token/ERC721/IERC721.sol";
import {SafeCast} from "@openzeppelin-5.0/contracts/utils/math/SafeCast.sol";
import {Math} from "@openzeppelin-5.0/contracts/utils/math/Math.sol";

/**
 * @title Art Blocks Ranked Auction Minter (RAM) Library
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

    event BidMinted(
        uint256 projectId,
        address coreContract,
        uint256 slotIndex,
        uint256 bidIndexInSlot,
        uint256 tokenId
    );

    /**
     * @notice Bid was refunded, and the entire bid value was sent to the
     * bidder.
     * This only occurrs if the minter encountered an unexpected error state
     * due to operational issues, and the minter was unable to mint a token to
     * the bidder.
     * @param projectId Project Id to update
     * @param coreContract Core contract address to update
     * @param slotIndex Slot index of bid that was settled
     * @param bidIndexInSlot Bid index in slot of bid that was settled
     */
    event BidRefunded(
        uint256 projectId,
        address coreContract,
        uint256 slotIndex,
        uint256 bidIndexInSlot
    );

    /**
     * @notice Token was directly purchased
     */
    event TokenPurchased(
        uint256 projectId,
        address coreContract,
        uint256 tokenId,
        address to
    );

    /**
     * @notice Number of slots used by this RAM minter
     * @param numSlots Number of slots used by this RAM minter
     */
    event NumSlotsUpdated(uint256 numSlots);

    // position of RAM Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant RAM_LIB_STORAGE_POSITION = keccak256("ramlib.storage");

    bytes32 internal constant CONFIG_AUCTION_REVENUES_COLLECTED =
        "auctionRevenuesCollected";

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
        // maximum bitmap index with an active bid
        uint16 maxBidSlotIndex;
        // --- bid minting tracking ---
        uint16 latestMintedBidSlotIndex;
        uint24 latestMintedBidArrayIndex;
        // --- error state bid refund tracking ---
        uint16 latestRefundedBidSlotIndex;
        uint24 latestRefundedBidArrayIndex;
        // --- auction parameters ---
        // number of tokens and related values
        // @dev max uint24 is 16,777,215 > 1_000_000 max project size
        uint24 numTokensInAuction;
        uint24 numBids;
        uint24 numBidsMintedTokens;
        uint24 numBidsErrorRefunded;
        // timing
        // @dev max uint40 ~= 1.1e12 sec ~= 34 thousand years
        uint40 timestampStart;
        uint40 timestampOriginalEnd;
        uint40 timestampEnd;
        // @dev max uint8 ~= 256 hours, which is gt max auction extension time of 72 hours
        uint8 adminEmergencyExtensionHoursApplied;
        bool allowExtraTime;
        bool adminOnlyMintPeriodIfSellout;
        // pricing
        // @dev max uint88 ~= 3e26 Wei = ~300 million ETH, which is well above
        // the expected prices of any NFT mint in the foreseeable future.
        uint88 basePrice;
        // --- revenue collection state ---
        bool revenuesCollected;
    }

    struct Bid {
        address bidder;
        bool isSettled; // TODO: could remove this if amount is changed when settling
        bool isMinted; // TODO: determine if this is needed
        bool isRefunded; // TODO: determine if this is needed
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
            "Only states C or D"
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
                "Only states C or D"
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
     * @notice Directly mint tokens to winners of project `projectId` on core
     * contract `coreContract`.
     * Does not guarantee an optimal ordering or handling of E1 state like
     * `adminAutoMintTokensToWinners` does while in State C.
     * Skips over bids that have already been minted or refunded (front-running
     * protection)
     * Reverts if project is not in a post-auction state, post-admin-only mint
     * period (i.e. State D), with tokens available.
     * Reverts if bid does not exist at slotIndex and bidIndexInSlot.
     * Reverts if msg.sender is not the bidder for all bids if
     * requireSenderIsBidder is true.
     * @param projectId Project ID to mint tokens on.
     * @param coreContract Core contract address for the given project.
     * @param slotIndices Slot indices of bids to mint tokens for
     * @param bidIndicesInSlot Bid indices in slot of bid to mint tokens for
     */
    function directMintTokensToWinners(
        uint256 projectId,
        address coreContract,
        uint16[] calldata slotIndices,
        uint24[] calldata bidIndicesInSlot,
        bool requireSenderIsBidder,
        IMinterFilterV1 minterFilter,
        uint256 minterRefundGasLimit
    ) internal {
        // load project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });

        // CHECKS
        // @dev memoize length for gas efficiency
        uint256 slotIndicesLength = slotIndices.length;
        // @dev block scope to limit stack depth
        {
            // verify input lengths match
            require(
                slotIndicesLength == bidIndicesInSlot.length,
                "Input lengths must match"
            );
            // require project minter state D (Post-Auction, post-admin-only,
            // not all bids handled)
            ProjectMinterStates projectMinterState = getProjectMinterState({
                projectId: projectId,
                coreContract: coreContract
            });
            require(
                projectMinterState == ProjectMinterStates.D,
                "Only state D"
            );
            // require numTokensToMint does not exceed number of tokens
            // available to minter, considering the number of bids
            // @dev must check this here to avoid minting more tokens than max
            // invocations, which could potentially not revert if minter
            // max invocations was limiting (+other unexpected conditions)
            require(
                slotIndicesLength <=
                    RAMProjectConfig_.numBids -
                        (RAMProjectConfig_.numBidsMintedTokens +
                            RAMProjectConfig_.numBidsErrorRefunded),
                "tokens to mint gt available qty"
            );
        }

        // settlement values
        // memoize project price, depending on if it was a sellout
        uint256 projectPrice;
        // @dev block scope to limit stack depth
        {
            bool wasSellout = RAMProjectConfig_.numBids ==
                RAMProjectConfig_.numTokensInAuction;
            projectPrice = wasSellout
                ? slotIndexToBidValue({
                    basePrice: RAMProjectConfig_.basePrice,
                    slotIndex: RAMProjectConfig_.minBidSlotIndex
                })
                : RAMProjectConfig_.basePrice;
        }

        // main loop to mint tokens
        for (uint256 i; i < slotIndicesLength; ++i) {
            // @dev current slot index and bid index in slot not memoized due
            // to stack depth limitations
            // get bid
            Bid storage bid = RAMProjectConfig_.bidsBySlot[slotIndices[i]][
                bidIndicesInSlot[i]
            ];
            // CHECKS
            // if bid is already minted or refunded, skip to next bid
            // @dev do not revert, since this could be due to front-running
            if (bid.isMinted || bid.isRefunded) {
                continue;
            }
            // require sender is bidder if requireSenderIsBidder is true
            if (requireSenderIsBidder) {
                require(msg.sender == bid.bidder, "Only sender is bidder");
            }
            // EFFECTS
            // STEP 1: mint bid
            // update state
            bid.isMinted = true;
            // @dev num bids minted tokens not memoized due to stack depth
            // limitations
            RAMProjectConfig_.numBidsMintedTokens++;
            // INTERACTIONS
            _mintTokenForBid({
                projectId: projectId,
                coreContract: coreContract,
                slotIndex: slotIndices[i],
                bidIndexInSlot: bidIndicesInSlot[i],
                bidder: bid.bidder,
                minterFilter: minterFilter
            });

            // STEP 2: settle if not already settled
            // @dev collector could have previously settled bid, so need to
            // check if bid is settled
            if (!(bid.isSettled)) {
                // update state
                bid.isSettled = true;
                // determine amount due
                uint256 currentAmountDue = slotIndexToBidValue({
                    basePrice: RAMProjectConfig_.basePrice,
                    // @dev safe to cast to uint16
                    slotIndex: uint16(slotIndices[i])
                }) - projectPrice;
                if (currentAmountDue > 0) {
                    // force-send settlement to bidder
                    SplitFundsLib.forceSafeTransferETH({
                        to: bid.bidder,
                        amount: currentAmountDue,
                        minterRefundGasLimit: minterRefundGasLimit
                    });
                    // emit event for state change
                    emit BidSettled({
                        projectId: projectId,
                        coreContract: coreContract,
                        slotIndex: slotIndices[i],
                        bidIndexInSlot: bidIndicesInSlot[i]
                    });
                }
            }
        }
    }

    /**
     * @notice Function that enables a contract admin (checked by external
     * function) to mint tokens to winners of project `projectId` on core
     * contract `coreContract`.
     * Automatically mints tokens to most-winning bids, in order from highest
     * and earliest bid to lowest and latest bid.
     * Settles bids as tokens are minted, if not already settled.
     * Reverts if project is not in a post-auction state, admin-only mint
     * period (i.e. State C), with tokens available.
     * to be minted.
     * Reverts if number of tokens to mint is greater than the number of
     * tokens available to be minted.
     * @param projectId Project ID to mint tokens on.
     * @param coreContract Core contract address for the given project.
     * @param numTokensToMint Number of tokens to mint in this transaction.
     */
    function adminAutoMintTokensToWinners(
        uint256 projectId,
        address coreContract,
        uint24 numTokensToMint,
        IMinterFilterV1 minterFilter,
        uint256 minterRefundGasLimit
    ) internal {
        // load project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });

        // CHECKS
        // @dev block scope to limit stack depth
        {
            // require project minter state C (Post-Auction, admin-only, not
            // all bids handled)
            ProjectMinterStates projectMinterState = getProjectMinterState({
                projectId: projectId,
                coreContract: coreContract
            });
            require(
                projectMinterState == ProjectMinterStates.C,
                "Only state C"
            );
            // require numTokensToMint does not exceed number of tokens
            // available to minter, considering the number of bids
            // @dev must check this here to avoid minting more tokens than max
            // invocations, which could potentially not revert if minter
            // max invocations was limiting (+other unexpected conditions)
            require(
                numTokensToMint <=
                    RAMProjectConfig_.numBids -
                        (RAMProjectConfig_.numBidsMintedTokens +
                            RAMProjectConfig_.numBidsErrorRefunded),
                "tokens to mint gt available qty"
            );
        }

        // EFFECTS
        // load values to memory for gas efficiency
        uint256 currentLatestMintedBidSlotIndex = RAMProjectConfig_
            .latestMintedBidSlotIndex;
        uint256 currentLatestMintedBidArrayIndex = RAMProjectConfig_
            .latestMintedBidArrayIndex;
        // @dev need to track if current values have been initialized, since
        // initial values could be valid values
        // @dev this logic is only valid in State C
        bool haveInitializedCurrentValues = RAMProjectConfig_
            .numBidsMintedTokens > 0;
        // settlement values
        // get project price, depending on if it was a sellout
        uint256 projectPrice;
        // @dev block scope to limit stack depth
        {
            bool wasSellout = RAMProjectConfig_.numBids ==
                RAMProjectConfig_.numTokensInAuction;
            projectPrice = wasSellout
                ? slotIndexToBidValue({
                    basePrice: RAMProjectConfig_.basePrice,
                    slotIndex: RAMProjectConfig_.minBidSlotIndex
                })
                : RAMProjectConfig_.basePrice;
        }
        uint256 numNewTokensMinted; // = 0

        // main loop to mint tokens
        while (numNewTokensMinted < numTokensToMint) {
            // EFFECTS
            // STEP 1: scroll to next bid to be minted a token
            // set latest minted bid indices to the bid to be minted a token
            if (!haveInitializedCurrentValues) {
                haveInitializedCurrentValues = true;
                // first mint, so need to initialize at maxBidSlotIndex
                currentLatestMintedBidSlotIndex = RAMProjectConfig_
                    .maxBidSlotIndex;
                // begin with first bid in array, so init val of 0 is correct
                // for currentLatestMintedBidArrayIndex
            } else if (
                // @dev length not memoized due to stack depth limitations
                currentLatestMintedBidArrayIndex ==
                RAMProjectConfig_
                    .bidsBySlot[currentLatestMintedBidSlotIndex]
                    .length -
                    1
            ) {
                // at end of array, so need to find next bid slot
                // with bids, and start at index 0 in slot's array
                currentLatestMintedBidSlotIndex = getMaxSlotWithBid({
                    RAMProjectConfig_: RAMProjectConfig_,
                    startSlotIndex: uint16(currentLatestMintedBidSlotIndex - 1)
                });
                currentLatestMintedBidArrayIndex = 0;
            } else {
                // increment array index to get next bid
                unchecked {
                    ++currentLatestMintedBidArrayIndex;
                }
            }

            // get bid
            Bid storage bid = RAMProjectConfig_.bidsBySlot[
                currentLatestMintedBidSlotIndex
            ][currentLatestMintedBidArrayIndex];

            // @dev minter is in State C, so bid must not have been minted or
            // refunded due to scrolling logic of admin mint and refund
            // functions available for use while in State C. The bid may have
            // been previously settled, however.

            // STEP 2: mint bid
            // @dev scrolling logic in State C ensures bid is not yet minted
            bid.isMinted = true;
            // INTERACTIONS
            _mintTokenForBid({
                projectId: projectId,
                coreContract: coreContract,
                slotIndex: uint16(currentLatestMintedBidSlotIndex),
                bidIndexInSlot: uint24(currentLatestMintedBidArrayIndex),
                bidder: bid.bidder,
                minterFilter: minterFilter
            });

            // STEP 3: settle if not already settled
            // @dev collector could have previously settled bid, so need to
            // check if bid is settled
            if (!(bid.isSettled)) {
                // update state
                bid.isSettled = true;
                // determine amount due
                // @dev currentAmountDue is not memoized per slot due to stack
                // depth limitations
                uint256 currentAmountDue = slotIndexToBidValue({
                    basePrice: RAMProjectConfig_.basePrice,
                    // @dev safe to cast to uint16
                    slotIndex: uint16(currentLatestMintedBidSlotIndex)
                }) - projectPrice;
                if (currentAmountDue > 0) {
                    // force-send settlement to bidder
                    SplitFundsLib.forceSafeTransferETH({
                        to: bid.bidder,
                        amount: currentAmountDue,
                        minterRefundGasLimit: minterRefundGasLimit
                    });
                    // emit event for state change
                    emit BidSettled({
                        projectId: projectId,
                        coreContract: coreContract,
                        slotIndex: currentLatestMintedBidSlotIndex,
                        bidIndexInSlot: currentLatestMintedBidArrayIndex
                    });
                }
            }

            // increment num new tokens minted
            unchecked {
                ++numNewTokensMinted;
            }
        }

        // finally, update auction metadata storage state from memoized values
        // @dev safe to cast numNewTokensMinted to uint24
        RAMProjectConfig_.numBidsMintedTokens += uint24(numNewTokensMinted);
        // @dev safe to cast following to uint16 and uint24 because they are
        // sourced from uint16 and uint24 values, respectively
        RAMProjectConfig_.latestMintedBidSlotIndex = uint16(
            currentLatestMintedBidSlotIndex
        );
        RAMProjectConfig_.latestMintedBidArrayIndex = uint24(
            currentLatestMintedBidArrayIndex
        );
    }

    /**
     * @notice Directly refund bids for project `projectId` on core contract
     * `coreContract` to resolve error state E1.
     * Does not guarantee an optimal ordering or handling of E1 state like
     * `adminAutoRefundBidsToResolveE1` does while in State C.
     * Skips over bids that have already been minted or refunded (front-running
     * protection)
     * Reverts if project is not in post-auction state, post-admin-only mint
     * period (i.e. State D).
     * Reverts if project is not in error state E1.
     * Reverts if length of bids to refund exceeds the number of bids that need
     * to be refunded to resolve the error state E1.
     * Reverts if bid does not exist at slotIndex and bidIndexInSlot.
     * Reverts if msg.sender is not the bidder for all bids if
     * requireSenderIsBidder is true.
     * @param projectId Project ID to refunds bids for.
     * @param coreContract Core contract address for the given project.
     * @param slotIndices Slot indices of bids to refund
     * @param bidIndicesInSlot Bid indices in slot of bid to refund
     * @param requireSenderIsBidder Require sender is bidder for all bids
     * @param minterRefundGasLimit Gas limit to use when refunding the bidder.
     */
    function directRefundBidsToResolveE1(
        uint256 projectId,
        address coreContract,
        uint16[] calldata slotIndices,
        uint24[] calldata bidIndicesInSlot,
        bool requireSenderIsBidder,
        uint256 minterRefundGasLimit
    ) internal {
        // CHECKS
        // @dev memoize length for gas efficiency
        uint256 slotIndicesLength = slotIndices.length;
        // @dev block scope to limit stack depth
        {
            // verify input lengths match
            require(
                slotIndicesLength == bidIndicesInSlot.length,
                "Input lengths must match"
            );
            // require project minter state D (Post-Auction, post-admin-only,
            // not all bids handled)
            ProjectMinterStates projectMinterState = getProjectMinterState({
                projectId: projectId,
                coreContract: coreContract
            });
            require(
                projectMinterState == ProjectMinterStates.D,
                "Only state D"
            );
            // require is in state E1
            (bool isErrorE1_, uint256 numBidsToResolveE1, ) = isErrorE1({
                projectId: projectId,
                coreContract: coreContract
            });
            require(isErrorE1_, "Only in state E1");
            // require numBidsToRefund does not exceed max number of bids
            // to resolve E1 error state
            require(
                slotIndicesLength <= numBidsToResolveE1,
                "bids to refund gt available qty"
            );
        }

        // load project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });

        // settlement values
        // memoize project price, depending on if it was a sellout
        uint256 projectPrice;
        // @dev block scope to limit stack depth
        {
            bool wasSellout = RAMProjectConfig_.numBids ==
                RAMProjectConfig_.numTokensInAuction;
            projectPrice = wasSellout
                ? slotIndexToBidValue({
                    basePrice: RAMProjectConfig_.basePrice,
                    slotIndex: RAMProjectConfig_.minBidSlotIndex
                })
                : RAMProjectConfig_.basePrice;
        }

        // main loop to mint tokens
        for (uint256 i; i < slotIndicesLength; ++i) {
            // @dev current slot index and bid index in slot not memoized due
            // to stack depth limitations
            // get bid
            Bid storage bid = RAMProjectConfig_.bidsBySlot[slotIndices[i]][
                bidIndicesInSlot[i]
            ];
            // CHECKS
            // if bid is already minted or refunded, skip to next bid
            // @dev do not revert, since this could be due to front-running
            if (bid.isMinted || bid.isRefunded) {
                continue;
            }
            // require sender is bidder if requireSenderIsBidder is true
            if (requireSenderIsBidder) {
                require(msg.sender == bid.bidder, "Only sender is bidder");
            }
            // EFFECTS
            // STEP 1: Settle and Refund the Bid
            // minimum value to send is the project price
            uint256 valueToSend = projectPrice;
            bool didSettleBid = false;
            if (!bid.isSettled) {
                bid.isSettled = true;
                didSettleBid = true;
                // send entire bid value if not previously settled
                valueToSend = slotIndexToBidValue({
                    basePrice: RAMProjectConfig_.basePrice,
                    // @dev safe to cast to uint16
                    slotIndex: uint16(slotIndices[i])
                });
            }
            // mark bid as refunded
            bid.isRefunded = true;
            // update number of bids refunded
            // @dev not memoized due to stack depth limitations
            RAMProjectConfig_.numBidsErrorRefunded++;
            // INTERACTIONS
            // force-send refund to bidder
            SplitFundsLib.forceSafeTransferETH({
                to: bid.bidder,
                amount: valueToSend,
                minterRefundGasLimit: minterRefundGasLimit
            });

            // emit event for state changes
            if (didSettleBid) {
                emit BidSettled({
                    projectId: projectId,
                    coreContract: coreContract,
                    slotIndex: slotIndices[i],
                    bidIndexInSlot: bidIndicesInSlot[i]
                });
            }
            emit BidRefunded({
                projectId: projectId,
                coreContract: coreContract,
                slotIndex: slotIndices[i],
                bidIndexInSlot: bidIndicesInSlot[i]
            });
        }
    }

    /**
     * @notice Function to automatically refund the lowest winning bids for
     * project `projectId` on core contract `coreContract` to resolve error
     * state E1.
     * Reverts if project is not in post-auction state C.
     * Reverts if project is not in error state E1.
     * Reverts if numBidsToRefund exceeds the number of bids that need to be
     * refunded to resolve the error state E1.
     * @dev Recommend admin-only not for security, but rather to enable Admin
     * to be aware that an error state has been encountered while in post-
     * auction state C.
     * @param projectId Project ID to refunds bids for.
     * @param coreContract Core contract address for the given project.
     * @param numBidsToRefund Number of bids to refund in this call.
     * @param minterRefundGasLimit Gas limit to use when refunding the bidder.
     */
    function autoRefundBidsToResolveE1(
        uint256 projectId,
        address coreContract,
        uint24 numBidsToRefund,
        uint256 minterRefundGasLimit
    ) internal {
        // CHECKS
        // @dev block scope to limit stack depth
        {
            // require project minter state C (Post-Auction, admin-only, not
            // all bids handled)
            ProjectMinterStates projectMinterState = getProjectMinterState({
                projectId: projectId,
                coreContract: coreContract
            });
            require(
                projectMinterState == ProjectMinterStates.C,
                "Only state C"
            );
            // require is in state E1
            (bool isErrorE1_, uint256 numBidsToResolveE1, ) = isErrorE1({
                projectId: projectId,
                coreContract: coreContract
            });
            require(isErrorE1_, "Only in state E1");
            // require numBidsToRefund does not exceed max number of bids
            // to resolve E1 error state
            require(
                numBidsToRefund <= numBidsToResolveE1,
                "bids to refund gt available qty"
            );
        }
        // load project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });

        // EFFECTS
        // load values to memory for gas efficiency
        uint256 currentLatestRefundedBidSlotIndex = RAMProjectConfig_
            .latestRefundedBidSlotIndex;
        uint256 currentLatestRefundedBidArrayIndex = RAMProjectConfig_
            .latestRefundedBidArrayIndex;
        // @dev need to track if current values have been initialized, since
        // initial values could be valid values
        // @dev this logic is only valid in State C
        bool haveInitializedCurrentValues = RAMProjectConfig_
            .numBidsErrorRefunded > 0;
        // settlement values
        // get project price, depending on if it was a sellout
        uint256 projectPrice;
        // @dev block scope to limit stack depth
        {
            bool wasSellout = RAMProjectConfig_.numBids ==
                RAMProjectConfig_.numTokensInAuction;
            projectPrice = wasSellout
                ? slotIndexToBidValue({
                    basePrice: RAMProjectConfig_.basePrice,
                    slotIndex: RAMProjectConfig_.minBidSlotIndex
                })
                : RAMProjectConfig_.basePrice;
        }
        uint256 numRefundsIssued; // = 0

        // main loop to refund bids
        while (numRefundsIssued < numBidsToRefund) {
            // EFFECTS
            // STEP 1: Get next bid to be refunded
            // set latest refunded bid indices to the bid to be refunded
            if (!haveInitializedCurrentValues) {
                // first refund, so need to initialize at minBidSlotIndex
                currentLatestRefundedBidSlotIndex = RAMProjectConfig_
                    .minBidSlotIndex;
                // begin with last bid in slot's array
                currentLatestRefundedBidArrayIndex =
                    RAMProjectConfig_
                        .bidsBySlot[currentLatestRefundedBidSlotIndex]
                        .length -
                    1;
            } else if (
                // @dev length not memoized due to stack depth limitations
                currentLatestRefundedBidArrayIndex == 0
            ) {
                // was previously initialized, so need to find next bid slot
                // with bids, and start at last bid in slot's array
                currentLatestRefundedBidSlotIndex = getMinSlotWithBid({
                    RAMProjectConfig_: RAMProjectConfig_,
                    startSlotIndex: uint16(
                        currentLatestRefundedBidSlotIndex + 1
                    )
                });
                // begin with last bid in slot's array
                currentLatestRefundedBidArrayIndex =
                    RAMProjectConfig_
                        .bidsBySlot[currentLatestRefundedBidSlotIndex]
                        .length -
                    1;
            } else {
                // was previously initialized, so need to decrement bid index
                // @dev already checked that > 0, so safe to use unchecked
                unchecked {
                    --currentLatestRefundedBidArrayIndex;
                }
            }

            // get bid
            Bid storage bid = RAMProjectConfig_.bidsBySlot[
                currentLatestRefundedBidSlotIndex
            ][currentLatestRefundedBidArrayIndex];

            // @dev minter is in State C, so bid must not have been minted or
            // refunded due to scrolling logic of admin mint and refund
            // functions available for use while in State C. The bid may have
            // been previously settled, however.

            // STEP 2: Settle & Refund the Bid
            // minimum value to send is the project price
            uint256 valueToSend = projectPrice;
            bool didSettleBid = false;
            if (!bid.isSettled) {
                bid.isSettled = true;
                didSettleBid = true;
                // send entire bid value if not previously settled
                valueToSend = slotIndexToBidValue({
                    basePrice: RAMProjectConfig_.basePrice,
                    // @dev safe to cast to uint16
                    slotIndex: uint16(currentLatestRefundedBidSlotIndex)
                });
            }
            // mark bid as refunded
            bid.isRefunded = true;
            // INTERACTIONS
            // force-send refund to bidder
            SplitFundsLib.forceSafeTransferETH({
                to: bid.bidder,
                amount: valueToSend,
                minterRefundGasLimit: minterRefundGasLimit
            });

            // emit event for state changes
            if (didSettleBid) {
                emit BidSettled({
                    projectId: projectId,
                    coreContract: coreContract,
                    slotIndex: currentLatestRefundedBidSlotIndex,
                    bidIndexInSlot: currentLatestRefundedBidArrayIndex
                });
            }
            emit BidRefunded({
                projectId: projectId,
                coreContract: coreContract,
                slotIndex: currentLatestRefundedBidSlotIndex,
                bidIndexInSlot: currentLatestRefundedBidArrayIndex
            });

            // increment loop counter and current num bids refunded
            unchecked {
                ++numRefundsIssued;
            }
        }

        // finally, update auction metadata storage state from memoized values
        // @dev safe to cast currentNumBidsErrorRefunded to uint24
        RAMProjectConfig_.numBidsErrorRefunded += uint24(numRefundsIssued);
        // @dev safe to cast following to uint16 and uint24 because they are
        // sourced from uint16 and uint24 values, respectively
        RAMProjectConfig_.latestRefundedBidSlotIndex = uint16(
            currentLatestRefundedBidSlotIndex
        );
        RAMProjectConfig_.latestRefundedBidArrayIndex = uint24(
            currentLatestRefundedBidArrayIndex
        );
    }

    /**
     * @notice This withdraws project revenues for project `projectId` on core
     * contract `coreContract` to the artist and admin, only after all bids
     * have been minted+settled or refunded.
     * Note that the conditions described are the equivalent of project minter
     * State E.
     * @param projectId Project ID to withdraw revenues for.
     * @param coreContract Core contract address for the given project.
     */
    function withdrawArtistAndAdminRevenues(
        uint256 projectId,
        address coreContract
    ) internal {
        // load project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });

        // CHECKS
        // require project minter state E (Post-Auction, all bids handled)
        ProjectMinterStates projectMinterState = getProjectMinterState({
            projectId: projectId,
            coreContract: coreContract
        });
        require(projectMinterState == ProjectMinterStates.E, "Only state E");
        // require revenues not already withdrawn
        require(
            !(RAMProjectConfig_.revenuesCollected),
            "Revenues already withdrawn"
        );

        // EFFECTS
        // update state to indicate revenues withdrawn
        RAMProjectConfig_.revenuesCollected = true;

        // get project price, depending on if it was a sellout
        uint256 projectPrice;
        // @dev block scope to limit stack depth
        {
            bool wasSellout = RAMProjectConfig_.numBids ==
                RAMProjectConfig_.numTokensInAuction;
            projectPrice = wasSellout
                ? slotIndexToBidValue({
                    basePrice: RAMProjectConfig_.basePrice,
                    slotIndex: RAMProjectConfig_.minBidSlotIndex
                })
                : RAMProjectConfig_.basePrice;
        }
        // get netRevenues
        // @dev refunded bids do not count towards amount due because they
        // did not generate revenue
        uint256 netRevenues = projectPrice *
            RAMProjectConfig_.numBidsMintedTokens;

        // INTERACTIONS
        SplitFundsLib.splitRevenuesETHNoRefund({
            projectId: projectId,
            valueInWei: netRevenues,
            coreContract: coreContract
        });

        emit GenericMinterEventsLib.ConfigValueSet({
            projectId: projectId,
            coreContract: coreContract,
            key: CONFIG_AUCTION_REVENUES_COLLECTED,
            value: true
        });
    }

    /**
     * @notice Function to mint tokens if an auction is over, but did not sell
     * out and tokens are still available to be minted.
     * @dev must be called within non-reentrant context
     */
    function purchaseTo(
        address to,
        uint256 projectId,
        address coreContract,
        IMinterFilterV1 minterFilter
    ) internal returns (uint256 tokenId) {
        // load project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });

        // CHECKS
        // @dev block scope to limit stack depth
        {
            // require project minter state C, D, or E (Post-Auction)
            ProjectMinterStates projectMinterState = getProjectMinterState({
                projectId: projectId,
                coreContract: coreContract
            });
            require(
                projectMinterState == ProjectMinterStates.C ||
                    projectMinterState == ProjectMinterStates.D ||
                    projectMinterState == ProjectMinterStates.E,
                "Only states C, D, or E"
            );
            // require at least one excess token available to be minted
            // @dev this ensures minter and core contract max-invocations
            // constraints are not violated, as well as confirms that one
            // additional mint will not send the minter into an E1 state
            (, , uint256 numExcessInvocationsAvailable) = isErrorE1({
                projectId: projectId,
                coreContract: coreContract
            });
            require(
                numExcessInvocationsAvailable > 0,
                "Reached max invocations"
            );
        }
        // require sufficient payment
        // since excess invocations are available, know not a sellout, so
        // project price is base price
        uint256 pricePerTokenInWei = RAMProjectConfig_.basePrice;
        require(
            msg.value == pricePerTokenInWei,
            "Only send auction reserve price"
        );

        // EFFECTS
        // mint token
        tokenId = minterFilter.mint_joo({
            to: to,
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender
        });

        // @dev this minter specifically does not update max invocations has
        // been reached, since it must consider unminted bids when determining
        // if max invocations has been reached

        // INTERACTIONS
        SplitFundsLib.splitFundsETHRefundSender({
            projectId: projectId,
            pricePerTokenInWei: pricePerTokenInWei,
            coreContract: coreContract
        });

        // emit event for state change
        emit TokenPurchased({
            projectId: projectId,
            coreContract: coreContract,
            tokenId: tokenId,
            to: to
        });
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
        bids.push(
            Bid({
                bidder: bidder,
                isSettled: false,
                isMinted: false,
                isRefunded: false
            })
        );
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
            // update bitmap metadata - increase max bid index if necessary
            if (slotIndex > RAMProjectConfig_.maxBidSlotIndex) {
                RAMProjectConfig_.maxBidSlotIndex = slotIndex;
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
     * @notice Returns if project minter is in ERROR state E1, and the number
     * of bids that need to be refunded to resolve the error.
     * E1: Tokens owed > invocations available
     * Occurs when: tokens are minted on different minter after auction begins,
     * or when core contract max invocations are reduced after auction begins.
     * Resolution: Admin must refund the lowest bids after auction ends.
     * @param projectId Project Id to query
     * @param coreContract Core contract address to query
     * @return isError True if in error state, false otherwise
     * @return numBidsToRefund Number of bids to refund to resolve error, 0 if
     * not in error state
     */
    function isErrorE1(
        uint256 projectId,
        address coreContract
    )
        internal
        view
        returns (
            bool isError,
            uint256 numBidsToRefund,
            uint256 numExcessInvocationsAvailable
        )
    {
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
        // populate return values
        isError = tokensOwed > invocationsAvailable;
        numBidsToRefund = isError ? tokensOwed - invocationsAvailable : 0;
        // no excess invocations available if in error state, otherwise is the
        // difference between invocations available and tokens owed
        numExcessInvocationsAvailable = isError
            ? 0
            : invocationsAvailable - tokensOwed;
    }

    /**
     * @notice Returns the MaxInvocationsProjectConfig for a given project and
     * core contract, properly accounting for the auction state, unminted bids,
     * core contract invocations, and minter max invocations when determining
     * maxHasBeenInvoked
     * @param projectId Project Id to get config for
     * @param coreContract Core contract address to get config for
     */
    function getMaxInvocationsProjectConfig(
        uint256 projectId,
        address coreContract
    )
        internal
        view
        returns (
            MaxInvocationsLib.MaxInvocationsProjectConfig
                memory maxInvocationsProjectConfig
        )
    {
        // get max invocations project config from MaxInvocationsLib
        maxInvocationsProjectConfig.maxInvocations = uint24(
            MaxInvocationsLib.getMaxInvocations({
                projectId: projectId,
                coreContract: coreContract
            })
        );
        maxInvocationsProjectConfig.maxHasBeenInvoked = getMaxHasBeenInvoked({
            projectId: projectId,
            coreContract: coreContract
        });
    }

    /**
     * @notice Returns if project has reached maximum number of invocations for
     * a given project and core contract, properly accounting for the auction
     * state, unminted bids, core contract invocations, and minter max
     * invocations when determining maxHasBeenInvoked
     * @param projectId Project Id to get config for
     * @param coreContract Core contract address to get config for
     */
    function getMaxHasBeenInvoked(
        uint256 projectId,
        address coreContract
    ) internal view returns (bool maxHasBeenInvoked) {
        // calculate if max has been invoked based on auction state
        ProjectMinterStates projectMinterState = getProjectMinterState({
            projectId: projectId,
            coreContract: coreContract
        });
        if (projectMinterState == ProjectMinterStates.A) {
            // pre-auction, always leave maxHasBeenInvoked as init value false
        } else if (projectMinterState == ProjectMinterStates.B) {
            // live auction, set to true if num bids == num tokens in auction
            RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
            maxHasBeenInvoked =
                RAMProjectConfig_.numTokensInAuction ==
                RAMProjectConfig_.numBids;
        } else {
            // post auction, set to true if remaining excess invocations is zero
            (, , uint256 numExcessInvocationsAvailable) = isErrorE1({
                projectId: projectId,
                coreContract: coreContract
            });
            if (numExcessInvocationsAvailable == 0) {
                maxHasBeenInvoked = true;
            }
        }
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
     * @notice private helper function to mint a token.
     * @dev assumes all checks have been performed
     * @param projectId project ID to mint token for
     * @param coreContract core contract address for the given project
     * @param slotIndex slot index of bid to mint token for
     * @param bidIndexInSlot bid index in slot of bid to mint token for
     * @param bidder bidder address of bid to mint token for
     * @param minterFilter minter filter contract address
     */
    function _mintTokenForBid(
        uint256 projectId,
        address coreContract,
        uint16 slotIndex,
        uint24 bidIndexInSlot,
        address bidder,
        IMinterFilterV1 minterFilter
    ) private {
        // mint token
        uint256 tokenId = minterFilter.mint_joo({
            to: bidder,
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender
        });
        // emit event for state change
        emit BidMinted({
            projectId: projectId,
            coreContract: coreContract,
            slotIndex: slotIndex,
            bidIndexInSlot: bidIndexInSlot,
            tokenId: tokenId
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
     * @notice Helper function to get minimum slot index with an active bid,
     * starting at a given slot index.
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

    /**
     * @notice Helper function to get maximum slot index with an active bid,
     * starting at a given slot index.
     * Returns 0 if not slots with bids were found.
     * Reverts if startSlotIndex > 511, since this library only supports 512
     * slots.
     * @param RAMProjectConfig_ RAM project config to query
     * @param startSlotIndex Slot index to start search at
     * @return maxSlotWithBid Maximum slot index with an active bid, and 0 if
     * no slots with bids were found
     */
    function getMaxSlotWithBid(
        RAMProjectConfig storage RAMProjectConfig_,
        uint16 startSlotIndex
    ) private view returns (uint16 maxSlotWithBid) {
        // revert if startSlotIndex > 511, since this is an invalid input
        if (startSlotIndex > 511) {
            revert("Only start slot index lt 512");
        }
        // start at startSlotIndex
        if (startSlotIndex < 256) {
            // @dev <256 conditional ensures no overflow when casting to uint8
            (uint256 maxSlotWithBid_, ) = RAMProjectConfig_
                .slotsBitmapA
                .maxBitSet(uint8(startSlotIndex));
            return uint16(maxSlotWithBid_);
        } else {
            // need to potentially check both bitmaps
            (uint256 maxSlotWithBid_, bool foundSetBit) = RAMProjectConfig_
                .slotsBitmapB
                .maxBitSet(
                    // @dev casting to uint8 intentional overflow instead of
                    // subtracting 256 from slotIndex
                    uint8(startSlotIndex)
                );
            if (foundSetBit) {
                return uint16(256 + maxSlotWithBid_);
            }
            // no bids in first bitmap B, so check second bitmap A
            (maxSlotWithBid_, ) = RAMProjectConfig_.slotsBitmapA.maxBitSet(
                // start at beginning of second bitmap
                uint8(255)
            );
            return uint16(maxSlotWithBid_);
        }
    }
}
