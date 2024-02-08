// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IMinterFilterV1} from "../../../interfaces/v0.8.x/IMinterFilterV1.sol";

import {BitMaps256} from "../BitMap.sol";
import {PackedBools} from "../PackedBools.sol";
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
    using PackedBools for uint256;
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
     * @notice Number of slots used by this RAM minter
     * @param numSlots Number of slots used by this RAM minter
     */
    event NumSlotsUpdated(uint256 numSlots);

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
     * @param requireAdminArtistOnlyMintPeriod bool representing if
     * admin-artist-only mint is required for all projects on this contract
     * @param requireNoAdminArtistOnlyMintPeriod bool representing if
     * admin-artist-only mint is not allowed for all projects on this contract
     */
    event ContractConfigUpdated(
        address indexed coreContract,
        bool imposeConstraints,
        bool requireAdminArtistOnlyMintPeriod,
        bool requireNoAdminArtistOnlyMintPeriod
    );

    /**
     * @notice Auction parameters updated
     * @param projectId Project Id to update
     * @param coreContract Core contract address to update
     * @param timestampStart Auction start timestamp
     * @param timestampEnd Auction end timestamp
     * @param basePrice Auction base price
     * @param allowExtraTime Auction allows extra time
     * @param adminArtistOnlyMintPeriodIfSellout Auction admin-artist-only mint period if
     * sellout
     * @param numTokensInAuction Number of tokens in auction
     */
    event AuctionConfigUpdated(
        uint256 indexed projectId,
        address indexed coreContract,
        uint256 timestampStart,
        uint256 timestampEnd,
        uint256 basePrice,
        bool allowExtraTime,
        bool adminArtistOnlyMintPeriodIfSellout,
        uint256 numTokensInAuction
    );

    /**
     * @notice Number of tokens in auction updated
     * @dev okay to not index this event if prior to AuctionConfigUpdated, as
     * the state value will be emitted in another future event
     * @dev generic event not used due to additional indexing logic desired
     * @param projectId Project Id to update
     * @param coreContract Core contract address to update
     * @param numTokensInAuction Number of tokens in auction
     */
    event NumTokensInAuctionUpdated(
        uint256 indexed projectId,
        address indexed coreContract,
        uint256 numTokensInAuction
    );

    /**
     * @notice Auction timestamp end updated. Occurs when auction is extended
     * due to new bids near the end of an auction, when the auction is
     * configured to allow extra time.
     * Also may occur when an admin extends the auction within the emergency
     * extension time limit.
     * @dev generic event not used due to additional indexing logic desired
     * when event is encountered (want to understand what caused time
     * extension)
     * @param projectId Project Id to update
     * @param coreContract Core contract address to update
     * @param timestampEnd Auction end timestamp
     */
    event AuctionTimestampEndUpdated(
        uint256 indexed projectId,
        address indexed coreContract,
        uint256 timestampEnd
    );

    /**
     * @notice Bid created in auction
     * @param projectId Project Id to update
     * @param coreContract Core contract address to update
     * @param slotIndex Slot index of bid that was created
     * @param bidId Bid Id that was created
     */
    event BidCreated(
        uint256 indexed projectId,
        address indexed coreContract,
        uint256 slotIndex,
        uint256 bidId,
        address bidder
    );

    /**
     * @notice Bid removed from auction because it was outbid.
     * @param projectId Project Id to update
     * @param coreContract Core contract address to update
     * @param bidId Bid Id that was removed
     */
    event BidRemoved(
        uint256 indexed projectId,
        address indexed coreContract,
        uint256 bidId
    );

    /**
     * @notice Bid topped up in auction
     * @param projectId Project Id to update
     * @param coreContract Core contract address to update
     * @param bidId Bid Id that was topped up
     * @param newSlotIndex New slot index of bid that was topped up
     */
    event BidToppedUp(
        uint256 indexed projectId,
        address indexed coreContract,
        uint256 bidId,
        uint256 newSlotIndex
    );

    /**
     * @notice Bid was settled, and any payment above the lowest winning bid,
     * or base price if not a sellout, was refunded to the bidder.
     * @param projectId Project Id to update
     * @param coreContract Core contract address to update
     * @param bidId ID of bid that was settled
     */
    event BidSettled(
        uint256 indexed projectId,
        address indexed coreContract,
        uint256 bidId
    );

    /**
     * @notice A token was minted to the bidder for bid `bidId`. The tokenId is
     * the token that was minted.
     * @param projectId Project Id to update
     * @param coreContract Core contract address to update
     * @param bidId ID of bid that was settled
     * @param tokenId Token Id that was minted
     *
     */
    event BidMinted(
        uint256 indexed projectId,
        address indexed coreContract,
        uint256 bidId,
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
     * @param bidId ID of bid that was settled
     */
    event BidRefunded(
        uint256 indexed projectId,
        address indexed coreContract,
        uint256 bidId
    );

    /**
     * @notice Token was directly purchased after an auction ended, and the
     * token was minted to the buyer.
     * @param projectId Project Id to update
     * @param coreContract Core contract address to update
     * @param tokenId Token Id that was minted
     * @param to Address that the token was minted to
     */
    event TokenPurchased(
        uint256 indexed projectId,
        address indexed coreContract,
        uint256 tokenId,
        address to
    );

    // position of RAM Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant RAM_LIB_STORAGE_POSITION = keccak256("ramlib.storage");

    // generic event key constants
    bytes32 internal constant CONFIG_AUCTION_REVENUES_COLLECTED =
        "auctionRevenuesCollected";
    bytes32 internal constant CONFIG_TIMESTAMP_END = "timestampEnd";

    uint256 constant NUM_SLOTS = 512;

    // pricing assumes maxPrice = minPrice * 2^8, pseudo-exponential curve
    uint256 constant SLOTS_PER_PRICE_DOUBLE = 512 / 8; // 64 slots per double

    // auction extension time constants
    uint256 constant AUCTION_BUFFER_SECONDS = 5 minutes;
    uint256 constant MAX_AUCTION_EXTRA_SECONDS = 1 hours;
    // @dev store value in hours to improve storage packing
    uint256 constant MAX_AUCTION_ADMIN_EMERGENCY_EXTENSION_HOURS = 72; // 72 hours

    uint256 constant ADMIN_ARTIST_ONLY_MINT_TIME_SECONDS = 72 hours;

    // packed bools constants for Bid struct
    uint8 constant INDEX_IS_SETTLED = 0;
    uint8 constant INDEX_IS_MINTED = 1;
    uint8 constant INDEX_IS_REFUNDED = 2;

    enum ProjectMinterStates {
        A, // Pre-Auction
        B, // Live-Auction
        C, // Post-Auction, not all bids handled, admin-artist-only mint period
        D, // Post-Auction, not all bids handled, post-admin-artist-only mint period
        E // Post-Auction, all bids handled
    }

    // project-specific parameters
    struct RAMProjectConfig {
        // mapping of all bids by Bid ID
        mapping(uint256 bidId => Bid) bids;
        // doubly linked list of bids for each slot
        mapping(uint256 slot => uint256 headBidId) headBidIdBySlot;
        mapping(uint256 slot => uint256 tailBidId) tailBidIdBySlot;
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
        // --- bid auto-minting tracking ---
        uint32 latestMintedBidId;
        // --- error state bid auto-refund tracking ---
        uint32 latestRefundedBidId;
        // --- next bid ID ---
        // nonce for generating new bid IDs on this project
        // @dev allows for gt 4 billion bids, and max possible bids for a
        // 1M token project is 1M * 512 slots = 512M bids < 4B max uint32
        uint32 nextBidId;
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
        // @dev timestampOriginalEnd & timestampEnd are the same if not in extra time
        uint40 timestampOriginalEnd;
        uint40 timestampEnd;
        // @dev max uint8 ~= 256 hours, which is gt max auction extension time of 72 hours
        uint8 adminEmergencyExtensionHoursApplied;
        bool allowExtraTime;
        bool adminArtistOnlyMintPeriodIfSellout;
        // pricing
        // @dev max uint88 ~= 3e26 Wei = ~300 million ETH, which is well above
        // the expected prices of any NFT mint in the foreseeable future.
        uint88 basePrice;
        // -- redundant backstops --
        // Track per-project fund balance, in wei. This is used as a redundant
        // backstop to prevent one project from draining the minter's balance
        // of ETH from other projects, which is a worthwhile failsafe on this
        // shared minter.
        // @dev max uint88 ~= 3e26 Wei = ~300 million ETH, which is well above
        // the expected revenues for a single auction.
        // This enables struct packing.
        uint88 projectBalance;
        // --- revenue collection state ---
        bool revenuesCollected;
    }

    struct Bid {
        uint32 prevBidId;
        uint32 nextBidId;
        uint16 slotIndex;
        address bidder;
        // three bool values packed into a single uint8
        // index 0 - isSettled (INDEX_IS_SETTLED)
        // index 1 - isMinted (INDEX_IS_MINTED)
        // index 2 - isRefunded (INDEX_IS_REFUNDED)
        uint8 packedBools;
    }

    // contract-specific parameters
    // @dev may not be indexed, but does impose on-chain constraints
    struct RAMContractConfig {
        bool imposeConstraints; // default false
        bool requireAdminArtistOnlyMintPeriod;
        bool requireNoAdminArtistOnlyMintPeriod;
    }

    // Diamond storage pattern is used in this library
    struct RAMLibStorage {
        mapping(address coreContract => mapping(uint256 projectId => RAMProjectConfig)) RAMProjectConfigs;
        mapping(address coreContract => RAMContractConfig) RAMContractConfigs;
    }

    /**
     * @notice Update a contract's requirements on if a post-auction
     * admin-artist-only mint period is required or banned, for and-on
     * configured projects.
     */
    function setContractConfig(
        address coreContract,
        bool imposeConstraints,
        bool requireAdminArtistOnlyMintPeriod,
        bool requireNoAdminArtistOnlyMintPeriod
    ) internal {
        // CHECKS
        // require not both constraints set to true, since mutually exclusive
        require(
            !(requireAdminArtistOnlyMintPeriod &&
                requireNoAdminArtistOnlyMintPeriod),
            "Only one constraint can be set"
        );
        // load contract config
        RAMContractConfig storage RAMContractConfig_ = getRAMContractConfig({
            coreContract: coreContract
        });
        // set contract config
        RAMContractConfig_.imposeConstraints = imposeConstraints;
        RAMContractConfig_
            .requireAdminArtistOnlyMintPeriod = requireAdminArtistOnlyMintPeriod;
        RAMContractConfig_
            .requireNoAdminArtistOnlyMintPeriod = requireNoAdminArtistOnlyMintPeriod;
        // emit event
        emit ContractConfigUpdated({
            coreContract: coreContract,
            imposeConstraints: imposeConstraints,
            requireAdminArtistOnlyMintPeriod: requireAdminArtistOnlyMintPeriod,
            requireNoAdminArtistOnlyMintPeriod: requireNoAdminArtistOnlyMintPeriod
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
        bool adminArtistOnlyMintPeriodIfSellout
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
        // only future start time
        require(
            auctionTimestampStart > block.timestamp,
            "Only future auctions"
        );
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
            if (RAMContractConfig_.requireAdminArtistOnlyMintPeriod) {
                require(
                    adminArtistOnlyMintPeriodIfSellout,
                    "Only admin-artist mint period"
                );
            }
            if (RAMContractConfig_.requireNoAdminArtistOnlyMintPeriod) {
                require(
                    !adminArtistOnlyMintPeriodIfSellout,
                    "Only no admin-artist mint period"
                );
            }
        }

        // set auction details
        RAMProjectConfig_.timestampStart = auctionTimestampStart;
        RAMProjectConfig_.timestampEnd = auctionTimestampEnd;
        RAMProjectConfig_.timestampOriginalEnd = auctionTimestampEnd;
        RAMProjectConfig_.basePrice = basePrice;
        RAMProjectConfig_.allowExtraTime = allowExtraTime;
        RAMProjectConfig_
            .adminArtistOnlyMintPeriodIfSellout = adminArtistOnlyMintPeriodIfSellout;
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
            adminArtistOnlyMintPeriodIfSellout: adminArtistOnlyMintPeriodIfSellout,
            numTokensInAuction: numTokensInAuction
        });
    }

    /**
     * @notice Reduces the auction length for project `projectId` on core
     * contract `coreContract` to `auctionTimestampEnd`.
     * Only allowed to be called during a live auction, and protects against
     * the case of an accidental excessively long auction, which locks funds.
     * Reverts if called by anyone other than the project's artist.
     * Reverts if project is not in a Live Auction.
     * Reverts if auction is not being reduced in length.
     * Reverts if in extra time.
     * Reverts if `auctionTimestampEnd` results in auction that is not at least
     * `MIN_AUCTION_DURATION_SECONDS` in duration.
     * Reverts if admin previously applied a time extension.
     * @param projectId Project ID to reduce the auction length for.
     * @param coreContract Core contract address for the given project.
     * @param auctionTimestampEnd New timestamp at which to end the auction.
     * @param minimumAuctionDurationSeconds Minimum auction duration, in seconds
     */
    function reduceAuctionLength(
        uint256 projectId,
        address coreContract,
        uint40 auctionTimestampEnd,
        uint256 minimumAuctionDurationSeconds
    ) internal {
        // load project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        // CHECKS
        // require auction state B
        require(
            getProjectMinterState(projectId, coreContract) ==
                ProjectMinterStates.B,
            "Only state B"
        );
        // require no previous admin extension time
        require(
            RAMProjectConfig_.adminEmergencyExtensionHoursApplied == 0,
            "No previous admin extension"
        );
        // require not in extra time
        require(
            RAMProjectConfig_.timestampOriginalEnd ==
                RAMProjectConfig_.timestampEnd,
            "Not allowed in extra time"
        );
        // require reduction in auction length
        require(
            auctionTimestampEnd < RAMProjectConfig_.timestampEnd,
            "Only reduce auction length"
        );
        // require meet minimum auction length requirement
        require(
            auctionTimestampEnd >
                RAMProjectConfig_.timestampStart +
                    minimumAuctionDurationSeconds,
            "Auction too short"
        );
        // require new end time in future
        require(auctionTimestampEnd > block.timestamp, "Only future end time");

        // set auction details
        RAMProjectConfig_.timestampEnd = auctionTimestampEnd;
        // also update original end for accurate extra time calculation
        RAMProjectConfig_.timestampOriginalEnd = auctionTimestampEnd;

        // emit state change event
        emit AuctionTimestampEndUpdated({
            projectId: projectId,
            coreContract: coreContract,
            timestampEnd: auctionTimestampEnd
        });
    }

    /**
     * @notice Update the number of tokens in the auction, based on the state
     * of the core contract and th eminter-local max invocations.
     * @param projectId Project ID to update
     * @param coreContract Core contract address to update
     */
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
     * `coreContract` for bid `bidId`.
     * Reverts if project is not in a post-auction state.
     * Reverts if bidder is not the bid's bidder.
     * Reverts if bid has already been settled.
     * Reverts if invalid bid.
     * @param projectId Project ID of bid to collect settlement for
     * @param coreContract Core contract address for the given project.
     * @param bidId ID of bid to be settled
     * @param bidder Bidder address of bid to collect settlement for
     * @param minterRefundGasLimit Gas limit to use when refunding the bidder.
     */
    function collectSettlement(
        uint256 projectId,
        address coreContract,
        uint32 bidId,
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

        // get project price
        uint256 projectPrice = _getProjectPrice({
            RAMProjectConfig_: RAMProjectConfig_
        });
        // settle the bid
        _settleBidWithChecks({
            RAMProjectConfig_: RAMProjectConfig_,
            projectId: projectId,
            coreContract: coreContract,
            projectPrice: projectPrice,
            bidId: bidId,
            bidder: bidder,
            minterRefundGasLimit: minterRefundGasLimit
        });
    }

    /**
     * @notice Collects settlement for project `projectId` on core contract
     * `coreContract` for all bids in `bidIds`.
     * Reverts if project is not in a post-auction state.
     * Reverts if bidder is not the bidder for all bids.
     * Reverts if one or more bids has already been settled.
     * Reverts if invalid bid is found.
     * @param projectId Project ID of bid to collect settlement for
     * @param coreContract Core contract address for the given project.
     * @param bidIds IDs of bids to collect settlements for
     * @param bidder Bidder address of bid to collect settlements for
     * @param minterRefundGasLimit Gas limit to use when refunding the bidder.
     */
    function collectSettlements(
        uint256 projectId,
        address coreContract,
        uint32[] calldata bidIds,
        address bidder,
        uint256 minterRefundGasLimit
    ) internal {
        // load project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        // CHECKS
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

        // get project price
        uint256 projectPrice = _getProjectPrice({
            RAMProjectConfig_: RAMProjectConfig_
        });

        // settle each input bid
        // @dev already verified that input lengths match
        uint256 inputBidsLength = bidIds.length;
        // @dev use unchecked loop incrementing for gas efficiency
        for (uint256 i; i < inputBidsLength; ) {
            // settle the bid
            _settleBidWithChecks({
                RAMProjectConfig_: RAMProjectConfig_,
                projectId: projectId,
                coreContract: coreContract,
                projectPrice: projectPrice,
                bidId: bidIds[i],
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
     * `adminArtistAutoMintTokensToWinners` does while in State C.
     * Skips over bids that have already been minted or refunded (front-running
     * protection)
     * Reverts if project is not in a post-auction state,
     * post-admin-artist-only mint period (i.e. State D), with tokens available
     * Reverts if bid does not exist at bidId.
     * Reverts if msg.sender is not the bidder for all bids if
     * requireSenderIsBidder is true.
     * @param projectId Project ID to mint tokens on.
     * @param coreContract Core contract address for the given project.
     * @param bidIds IDs of bids to mint tokens for
     * @param requireSenderIsBidder bool representing if the sender must be the
     * bidder for all bids
     * @param minterFilter Minter filter to use when minting tokens
     * @param minterRefundGasLimit Gas limit to use when refunding the bidder.
     */
    function directMintTokensToWinners(
        uint256 projectId,
        address coreContract,
        uint32[] calldata bidIds,
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
        uint256 bidIdsLength = bidIds.length;
        // @dev block scope to limit stack depth
        {
            // require project minter state D (Post-Auction,
            // post-admin-artist-only, not all bids handled)
            ProjectMinterStates projectMinterState = getProjectMinterState({
                projectId: projectId,
                coreContract: coreContract
            });
            require(
                projectMinterState == ProjectMinterStates.D,
                "Only state D"
            );
            // require numTokensToMint does not exceed number of tokens
            // owed.
            // @dev must check this here to avoid minting more tokens than max
            // invocations, which could potentially not revert if minter
            // max invocations was limiting (+other unexpected conditions)
            require(
                bidIdsLength <=
                    _getNumTokensOwed({RAMProjectConfig_: RAMProjectConfig_}),
                "tokens to mint gt tokens owed"
            );
        }

        // settlement values
        // get project price
        uint256 projectPrice = _getProjectPrice({
            RAMProjectConfig_: RAMProjectConfig_
        });

        // main loop to mint tokens
        for (uint256 i; i < bidIdsLength; ++i) {
            // @dev current slot index and bid index in slot not memoized due
            // to stack depth limitations
            // get bid
            uint256 currentBidId = bidIds[i];
            Bid storage bid = RAMProjectConfig_.bids[currentBidId];
            // CHECKS
            // if bid is already minted or refunded, skip to next bid
            // @dev do not revert, since this could be due to front-running
            if (
                _getBidPackedBool(bid, INDEX_IS_MINTED) ||
                _getBidPackedBool(bid, INDEX_IS_REFUNDED)
            ) {
                continue;
            }
            // require sender is bidder if requireSenderIsBidder is true
            if (requireSenderIsBidder) {
                require(msg.sender == bid.bidder, "Only sender is bidder");
            }
            // EFFECTS
            // STEP 1: mint bid
            // update state
            _setBidPackedBool({bid: bid, index: INDEX_IS_MINTED, value: true});
            // @dev num bids minted tokens not memoized due to stack depth
            // limitations
            RAMProjectConfig_.numBidsMintedTokens++;
            // INTERACTIONS
            _mintTokenForBid({
                projectId: projectId,
                coreContract: coreContract,
                bidId: uint32(currentBidId),
                bidder: bid.bidder,
                minterFilter: minterFilter
            });

            // STEP 2: settle if not already settled
            // @dev collector could have previously settled bid, so need to
            // settle only if not already settled
            if (!(_getBidPackedBool(bid, INDEX_IS_SETTLED))) {
                _settleBid({
                    RAMProjectConfig_: RAMProjectConfig_,
                    projectId: projectId,
                    coreContract: coreContract,
                    projectPrice: projectPrice,
                    slotIndex: bid.slotIndex,
                    bidId: uint32(currentBidId),
                    minterRefundGasLimit: minterRefundGasLimit
                });
            }
        }
    }

    /**
     * @notice Function that enables a contract admin or artist (checked by
     * external function) to mint tokens to winners of project `projectId` on
     * core contract `coreContract`.
     * Automatically mints tokens to most-winning bids, in order from highest
     * and earliest bid to lowest and latest bid.
     * Settles bids as tokens are minted, if not already settled.
     * Reverts if project is not in a post-auction state, admin-artist-only mint
     * period (i.e. State C), with tokens available.
     * to be minted.
     * Reverts if number of tokens to mint is greater than the number of
     * tokens available to be minted.
     * @param projectId Project ID to mint tokens on.
     * @param coreContract Core contract address for the given project.
     * @param numTokensToMint Number of tokens to mint in this transaction.
     */
    function adminArtistAutoMintTokensToWinners(
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
            // require project minter state C (Post-Auction, admin-artist-only,
            // not all bids handled)
            ProjectMinterStates projectMinterState = getProjectMinterState({
                projectId: projectId,
                coreContract: coreContract
            });
            require(
                projectMinterState == ProjectMinterStates.C,
                "Only state C"
            );
            // require numTokensToMint does not exceed number of tokens
            // owed
            // @dev must check this here to avoid minting more tokens than max
            // invocations, which could potentially not revert if minter
            // max invocations was limiting (+other unexpected conditions)
            require(
                numTokensToMint <=
                    _getNumTokensOwed({RAMProjectConfig_: RAMProjectConfig_}),
                "tokens to mint gt tokens owed"
            );
        }

        // EFFECTS
        // load values to memory for gas efficiency
        uint256 currentLatestMintedBidId = RAMProjectConfig_.latestMintedBidId;
        // @dev will be zero if no bids minted yet
        uint256 currentLatestMintedBidSlotIndex = RAMProjectConfig_
            .bids[currentLatestMintedBidId]
            .slotIndex;

        // get project price
        uint256 projectPrice = _getProjectPrice({
            RAMProjectConfig_: RAMProjectConfig_
        });
        uint256 numNewTokensMinted; // = 0

        // main loop to mint tokens
        while (numNewTokensMinted < numTokensToMint) {
            // EFFECTS
            // STEP 1: scroll to next bid to be minted a token
            // set latest minted bid indices to the bid to be minted a token
            if (currentLatestMintedBidId == 0) {
                // first mint, so need to initialize cursor values
                // set bid to highest bid in the project, head of max bid slot
                currentLatestMintedBidSlotIndex = RAMProjectConfig_
                    .maxBidSlotIndex;
                currentLatestMintedBidId = RAMProjectConfig_.headBidIdBySlot[
                    currentLatestMintedBidSlotIndex
                ];
            } else {
                // scroll to next bid in current slot
                // @dev scrolling to null is okay and handled below
                currentLatestMintedBidId = RAMProjectConfig_
                    .bids[currentLatestMintedBidId]
                    .nextBidId;
            }
            // if scrolled off end of list, then find next slot with bids
            if (currentLatestMintedBidId == 0) {
                // past tail of current slot's linked list, so need to find next
                // bid slot with bids
                currentLatestMintedBidSlotIndex = _getMaxSlotWithBid({
                    RAMProjectConfig_: RAMProjectConfig_,
                    startSlotIndex: uint16(currentLatestMintedBidSlotIndex - 1)
                });
                // current bid is now the head of the linked list
                currentLatestMintedBidId = RAMProjectConfig_.headBidIdBySlot[
                    currentLatestMintedBidSlotIndex
                ];
            }

            // get bid
            Bid storage bid = RAMProjectConfig_.bids[currentLatestMintedBidId];

            // @dev minter is in State C, so bid must not have been minted or
            // refunded due to scrolling logic of admin mint and refund
            // functions available for use while in State C. The bid may have
            // been previously settled, however.

            // STEP 2: mint bid
            // @dev scrolling logic in State C ensures bid is not yet minted
            // mark bid as minted
            _setBidPackedBool({bid: bid, index: INDEX_IS_MINTED, value: true});
            // INTERACTIONS
            _mintTokenForBid({
                projectId: projectId,
                coreContract: coreContract,
                bidId: uint32(currentLatestMintedBidId),
                bidder: bid.bidder,
                minterFilter: minterFilter
            });

            // STEP 3: settle if not already settled
            // @dev collector could have previously settled bid, so need to
            // settle only if not already settled
            if (!(_getBidPackedBool(bid, INDEX_IS_SETTLED))) {
                // pika
                _settleBid({
                    RAMProjectConfig_: RAMProjectConfig_,
                    projectId: projectId,
                    coreContract: coreContract,
                    projectPrice: projectPrice,
                    slotIndex: uint16(currentLatestMintedBidSlotIndex),
                    bidId: uint32(currentLatestMintedBidId),
                    minterRefundGasLimit: minterRefundGasLimit
                });
            }

            // increment num new tokens minted
            unchecked {
                ++numNewTokensMinted;
            }
        }

        // finally, update auction metadata storage state from memoized values
        // @dev safe to cast numNewTokensMinted to uint24
        RAMProjectConfig_.numBidsMintedTokens += uint24(numNewTokensMinted);
        // @dev safe to cast to uint32 because directly derived from bid ID
        RAMProjectConfig_.latestMintedBidId = uint32(currentLatestMintedBidId);
    }

    /**
     * @notice Directly refund bids for project `projectId` on core contract
     * `coreContract` to resolve error state E1.
     * Does not guarantee an optimal ordering or handling of E1 state like
     * `adminAutoRefundBidsToResolveE1` does while in State C.
     * Skips over bids that have already been minted or refunded (front-running
     * protection)
     * Reverts if project is not in post-auction state,
     * post-admin-artist-only mint period (i.e. State D).
     * Reverts if project is not in error state E1.
     * Reverts if length of bids to refund exceeds the number of bids that need
     * to be refunded to resolve the error state E1.
     * Reverts if bid does not exist at bidId.
     * Reverts if msg.sender is not the bidder for all bids if
     * requireSenderIsBidder is true.
     * @param projectId Project ID to refunds bids for.
     * @param coreContract Core contract address for the given project.
     * @param bidIds IDs of bids to refund bid values for
     * @param requireSenderIsBidder Require sender is bidder for all bids
     * @param minterRefundGasLimit Gas limit to use when refunding the bidder.
     */
    function directRefundBidsToResolveE1(
        uint256 projectId,
        address coreContract,
        uint32[] calldata bidIds,
        bool requireSenderIsBidder,
        uint256 minterRefundGasLimit
    ) internal {
        // CHECKS
        // @dev memoize length for gas efficiency
        uint256 bidIdsLength = bidIds.length;
        // @dev block scope to limit stack depth
        {
            // require project minter state D (Post-Auction, post-admin-artist-only,
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
                bidIdsLength <= numBidsToResolveE1,
                "bids to refund gt available qty"
            );
        }

        // load project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });

        // settlement values
        // get project price
        uint256 projectPrice = _getProjectPrice({
            RAMProjectConfig_: RAMProjectConfig_
        });

        // main loop to mint tokens
        for (uint256 i; i < bidIdsLength; ++i) {
            // @dev current slot index and bid index in slot not memoized due
            // to stack depth limitations
            // get bid
            uint256 currentBidId = bidIds[i];
            Bid storage bid = RAMProjectConfig_.bids[currentBidId];
            // CHECKS
            // if bid is already minted or refunded, skip to next bid
            // @dev do not revert, since this could be due to front-running
            if (
                _getBidPackedBool(bid, INDEX_IS_MINTED) ||
                _getBidPackedBool(bid, INDEX_IS_REFUNDED)
            ) {
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
            // if not isSettled, then settle the bid
            if (!(_getBidPackedBool(bid, INDEX_IS_SETTLED))) {
                // mark bid as settled
                _setBidPackedBool({
                    bid: bid,
                    index: INDEX_IS_SETTLED,
                    value: true
                });
                didSettleBid = true;
                // send entire bid value if not previously settled
                valueToSend = slotIndexToBidValue({
                    basePrice: RAMProjectConfig_.basePrice,
                    // @dev safe to cast to uint16
                    slotIndex: bid.slotIndex
                });
            }
            // mark bid as refunded
            _setBidPackedBool({
                bid: bid,
                index: INDEX_IS_REFUNDED,
                value: true
            });
            // update number of bids refunded
            // @dev not memoized due to stack depth limitations
            RAMProjectConfig_.numBidsErrorRefunded++;
            // INTERACTIONS
            // force-send refund to bidder
            // @dev reverts on underflow
            RAMProjectConfig_.projectBalance -= uint88(valueToSend);
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
                    bidId: currentBidId
                });
            }
            emit BidRefunded({
                projectId: projectId,
                coreContract: coreContract,
                bidId: currentBidId
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
            // require project minter state C (Post-Auction, admin-artist-only,
            //  not all bids handled)
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
        uint256 currentLatestRefundedBidId = RAMProjectConfig_
            .latestRefundedBidId;
        uint256 currentLatestRefundedBidSlotIndex = RAMProjectConfig_
            .bids[currentLatestRefundedBidId]
            .slotIndex;
        // settlement values
        // get project price
        uint256 projectPrice = _getProjectPrice({
            RAMProjectConfig_: RAMProjectConfig_
        });
        uint256 numRefundsIssued; // = 0

        // main loop to refund bids
        while (numRefundsIssued < numBidsToRefund) {
            // EFFECTS
            // STEP 1: Get next bid to be refunded
            // set latest refunded bid indices to the bid to be refunded
            if (currentLatestRefundedBidId == 0) {
                // first refund, so need to initialize cursor values
                // set bid to lowest bid in the project, tail of min bid slot
                currentLatestRefundedBidSlotIndex = RAMProjectConfig_
                    .minBidSlotIndex;
                currentLatestRefundedBidId = RAMProjectConfig_.tailBidIdBySlot[
                    currentLatestRefundedBidSlotIndex
                ];
            } else {
                // scroll to previous bid in current slot
                // @dev scrolling to null is okay and handled below
                currentLatestRefundedBidId = RAMProjectConfig_
                    .bids[currentLatestRefundedBidId]
                    .prevBidId;
            }

            // if scrolled off end of list, then find next slot with bids
            if (currentLatestRefundedBidId == 0) {
                // past head of current slot's linked list, so need to find next
                // bid slot with bids
                currentLatestRefundedBidSlotIndex = _getMinSlotWithBid({
                    RAMProjectConfig_: RAMProjectConfig_,
                    startSlotIndex: uint16(
                        currentLatestRefundedBidSlotIndex + 1
                    )
                });
                // current bid is now the tail of the linked list
                currentLatestRefundedBidId = RAMProjectConfig_.tailBidIdBySlot[
                    currentLatestRefundedBidSlotIndex
                ];
            }

            // get bid
            Bid storage bid = RAMProjectConfig_.bids[
                currentLatestRefundedBidId
            ];

            // @dev minter is in State C, so bid must not have been minted or
            // refunded due to scrolling logic of admin mint and refund
            // functions available for use while in State C. The bid may have
            // been previously settled, however.

            // STEP 2: Settle & Refund the Bid
            // minimum value to send is the project price
            uint256 valueToSend = projectPrice;
            bool didSettleBid = false;
            // if not isSettled, then settle the bid
            if (!(_getBidPackedBool(bid, INDEX_IS_SETTLED))) {
                // mark bid as settled
                _setBidPackedBool({
                    bid: bid,
                    index: INDEX_IS_SETTLED,
                    value: true
                });
                didSettleBid = true;
                // send entire bid value since was not previously settled
                valueToSend = slotIndexToBidValue({
                    basePrice: RAMProjectConfig_.basePrice,
                    // @dev safe to cast to uint16
                    slotIndex: uint16(currentLatestRefundedBidSlotIndex)
                });
            }
            // mark bid as refunded
            _setBidPackedBool({
                bid: bid,
                index: INDEX_IS_REFUNDED,
                value: true
            });
            // INTERACTIONS
            // force-send refund to bidder
            // @dev reverts on underflow
            RAMProjectConfig_.projectBalance -= uint88(valueToSend);
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
                    bidId: uint32(currentLatestRefundedBidId)
                });
            }
            emit BidRefunded({
                projectId: projectId,
                coreContract: coreContract,
                bidId: uint32(currentLatestRefundedBidId)
            });

            // increment loop counter and current num bids refunded
            unchecked {
                ++numRefundsIssued;
            }
        }

        // finally, update auction metadata storage state from memoized values
        // @dev safe to cast currentNumBidsErrorRefunded to uint24
        RAMProjectConfig_.numBidsErrorRefunded += uint24(numRefundsIssued);
        // @dev safe to cast to uint32 because directly derived from bid ID
        RAMProjectConfig_.latestRefundedBidId = uint32(
            currentLatestRefundedBidId
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

        // get project price
        uint256 projectPrice = _getProjectPrice({
            RAMProjectConfig_: RAMProjectConfig_
        });
        // get netRevenues
        // @dev refunded bids do not count towards amount due because they
        // did not generate revenue
        uint256 netRevenues = projectPrice *
            RAMProjectConfig_.numBidsMintedTokens;

        // update project balance
        // @dev reverts on underflow
        RAMProjectConfig_.projectBalance -= uint88(netRevenues);

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
            // require project minter state D, or E (Post-Auction)
            ProjectMinterStates projectMinterState = getProjectMinterState({
                projectId: projectId,
                coreContract: coreContract
            });
            require(
                projectMinterState == ProjectMinterStates.D ||
                    projectMinterState == ProjectMinterStates.E,
                "Only states D or E"
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
        // split revenue from sale
        // @dev no refund because previously verified msg.value == pricePerTokenInWei
        // @dev no effect on project balance, splitting same amount received
        SplitFundsLib.splitRevenuesETHNoRefund({
            projectId: projectId,
            valueInWei: pricePerTokenInWei,
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
        uint16 slotIndex,
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
        // add bid value to project balance
        RAMProjectConfig_.projectBalance += uint88(bidValue);
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
        // @dev this case would revert in _removeMinBid, but prefer clean error
        // message here
        uint256 numTokensInAuction = RAMProjectConfig_.numTokensInAuction;
        require(numTokensInAuction > 0, "No bids in auction");
        // determine if have reached max bids
        bool reachedMaxBids = RAMProjectConfig_.numBids == numTokensInAuction;
        if (reachedMaxBids) {
            // remove + refund the minimum Bid
            uint16 removedSlotIndex = _removeMinBid({
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
            require(
                _isSufficientOutbid({
                    oldBidValue: removedBidValue,
                    newBidValue: bidValue
                }),
                "Insufficient bid value"
            );

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
                emit AuctionTimestampEndUpdated({
                    projectId: projectId,
                    coreContract: coreContract,
                    timestampEnd: RAMProjectConfig_.timestampEnd
                });
            }
        }
        // insert the new Bid
        _insertBid({
            RAMProjectConfig_: RAMProjectConfig_,
            projectId: projectId,
            coreContract: coreContract,
            slotIndex: slotIndex,
            bidder: bidder,
            bidId: 0 // zero triggers new bid ID to be assigned
        });
    }

    /**
     * @notice Top up bid for project `projectId` on core contract
     * `coreContract` for bid `bidId` to new slot index `newSlotIndex`.
     * Reverts if Bid ID has been kicked out of the auction or does not exist.
     * Reverts if bidder is not the bidder of the bid.
     * Reverts if project is not in a Live Auction.
     * Reverts if addedValue is not equal to difference in bid values between
     * new and old slots.
     * Reverts if new slot index is not greater than or equal to the current
     * slot index.
     * @param projectId Project ID to top up bid for.
     * @param coreContract Core contract address for the given project.
     * @param bidId ID of bid to top up.
     * @param newSlotIndex New slot index to move bid to.
     * @param bidder Bidder address
     * @param addedValue Value to add to the bid, in Wei
     */
    function topUpBid(
        uint256 projectId,
        address coreContract,
        uint32 bidId,
        uint16 newSlotIndex,
        address bidder,
        uint256 addedValue
    ) internal {
        // load project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        Bid storage bid = RAMProjectConfig_.bids[bidId];
        // memoize for gas efficiency
        uint16 oldSlotIndex = bid.slotIndex;
        // CHECKS
        {
            // require project minter state B (Live Auction)
            require(
                getProjectMinterState(projectId, coreContract) ==
                    ProjectMinterStates.B,
                "Only state B"
            );
            // @dev give clean error message if bid is null or deleted
            require(bid.bidder != address(0), "Bid dne - were you outbid?");
            // require bidder owns referenced bid
            require(bid.bidder == bidder, "Only bidder of existing bid");
            // require correct added bid value
            uint256 oldBidValue = slotIndexToBidValue({
                basePrice: RAMProjectConfig_.basePrice,
                slotIndex: oldSlotIndex
            });
            uint256 newBidValue = slotIndexToBidValue({
                basePrice: RAMProjectConfig_.basePrice,
                slotIndex: newSlotIndex
            });
            // implicitly checks that newSlotIndex > oldSlotIndex, since
            // addedValue must be positive
            require(
                oldBidValue + addedValue == newBidValue,
                "incorrect added value"
            );
        }

        // EFFECTS
        // add the added value to project balance
        RAMProjectConfig_.projectBalance += uint88(addedValue);
        // eject bid from the linked list at oldSlotIndex
        _ejectBidFromSlot({
            RAMProjectConfig_: RAMProjectConfig_,
            slotIndex: oldSlotIndex,
            bidId: bidId
        });
        // insert the existing bid into newSlotIndex's linked list
        _insertBid({
            RAMProjectConfig_: RAMProjectConfig_,
            projectId: projectId,
            coreContract: coreContract,
            slotIndex: newSlotIndex,
            bidder: bidder,
            bidId: bidId
        });

        // emit top-up event
        emit BidToppedUp({
            projectId: projectId,
            coreContract: coreContract,
            bidId: bidId,
            newSlotIndex: newSlotIndex
        });
    }

    /**
     * @notice Returns the value and slot index of the minimum bid in the
     * project's auction, in Wei.
     * Reverts if no bids exist in the auction.
     * @param projectId Project ID to get the minimum bid value for
     * @param coreContract Core contract address for the given project
     * @return minBid Storage to pointer of Bid struct of the minimum bid in
     * the auction
     * @return minSlotIndex Slot index of the minimum bid in the auction
     */
    function getMinBid(
        uint256 projectId,
        address coreContract
    ) internal view returns (Bid storage minBid, uint16 minSlotIndex) {
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        if (RAMProjectConfig_.numBids == 0) {
            revert("No bids in auction");
        }
        // get min slot with a bid
        minSlotIndex = RAMProjectConfig_.minBidSlotIndex;
        // get the tail bid ID for the min slot
        uint256 tailBidId = RAMProjectConfig_.tailBidIdBySlot[minSlotIndex];
        minBid = RAMProjectConfig_.bids[tailBidId];
    }

    /**
     * @notice Returns the auction details for project `projectId` on core
     * contract `coreContract`.
     * @param projectId is an existing project ID.
     * @param coreContract is an existing core contract address.
     * @return auctionTimestampStart is the timestamp at which the auction
     * starts.
     * @return auctionTimestampEnd is the timestamp at which the auction ends.
     * @return basePrice is the resting price of the auction, in Wei.
     * @return numTokensInAuction is the number of tokens in the auction.
     * @return numBids is the number of bids in the auction.
     * @return numBidsMintedTokens is the number of bids that have been minted
     * into tokens.
     * @return numBidsErrorRefunded is the number of bids that have been
     * refunded due to an error state.
     * @return minBidSlotIndex is the index of the slot with the minimum bid
     * value.
     * @return allowExtraTime is a bool indicating if the auction is allowed to
     * have extra time.
     * @return adminArtistOnlyMintPeriodIfSellout is a bool indicating if an
     * admin-artist-only mint period is required if the auction sells out.
     * @return revenuesCollected is a bool indicating if the auction revenues
     * have been collected.
     * @return projectMinterState is the current state of the project minter.
     * @dev projectMinterState is a RAMLib.ProjectMinterStates enum value.
     */
    function getAuctionDetails(
        uint256 projectId,
        address coreContract
    )
        internal
        view
        returns (
            uint256 auctionTimestampStart,
            uint256 auctionTimestampEnd,
            uint256 basePrice,
            uint256 numTokensInAuction,
            uint256 numBids,
            uint256 numBidsMintedTokens,
            uint256 numBidsErrorRefunded,
            uint256 minBidSlotIndex,
            bool allowExtraTime,
            bool adminArtistOnlyMintPeriodIfSellout,
            bool revenuesCollected,
            RAMLib.ProjectMinterStates projectMinterState
        )
    {
        // asign project minter state
        projectMinterState = getProjectMinterState({
            projectId: projectId,
            coreContract: coreContract
        });
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
        numBidsMintedTokens = RAMProjectConfig_.numBidsMintedTokens;
        numBidsErrorRefunded = RAMProjectConfig_.numBidsErrorRefunded;
        minBidSlotIndex = RAMProjectConfig_.minBidSlotIndex;
        allowExtraTime = RAMProjectConfig_.allowExtraTime;
        adminArtistOnlyMintPeriodIfSellout = RAMProjectConfig_
            .adminArtistOnlyMintPeriodIfSellout;
        revenuesCollected = RAMProjectConfig_.revenuesCollected;
    }

    /**
     * @notice Returns the price information for a given project.
     * If an auction is not configured, `isConfigured` will be false, and a
     * dummy price of zero is assigned to `tokenPriceInWei`.
     * If an auction is configured but still in a pre-auction state,
     * `isConfigured` will be true, and `tokenPriceInWei` will be the minimum
     * initial bid price for the next token auction.
     * If there is an active auction, `isConfigured` will be true, and
     * `tokenPriceInWei` will be the current minimum bid's value + min bid
     * increment due to the minter's increment percentage, rounded up to next
     * slot's bid value.
     * If there is an auction that has ended (no longer accepting bids), but
     * the project is configured, `isConfigured` will be true, and
     * `tokenPriceInWei` will be either the sellout price or the reserve price
     * of the auction if it did not sell out during its auction.
     * @param projectId Project ID to get price information for
     * @param coreContract Core contract address for the given project
     * @return isConfigured True if the project is configured, false otherwise
     * @return tokenPriceInWei Price of a token in Wei, if configured
     */
    function getPriceInfo(
        uint256 projectId,
        address coreContract
    ) internal view returns (bool isConfigured, uint256 tokenPriceInWei) {
        // get minter state
        RAMLib.ProjectMinterStates projectMinterState = getProjectMinterState({
            projectId: projectId,
            coreContract: coreContract
        });
        // load project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        // handle pre-auction State A
        if (projectMinterState == RAMLib.ProjectMinterStates.A) {
            isConfigured = RAMProjectConfig_.timestampStart > 0;
            // if not configured, leave tokenPriceInWei as 0
            if (isConfigured) {
                tokenPriceInWei = RAMProjectConfig_.basePrice;
            }
        } else {
            // values that apply to all live-auction and post-auction states
            isConfigured = true;
            bool isSellout = RAMProjectConfig_.numBids ==
                RAMProjectConfig_.numTokensInAuction;

            // handle live-auction State B
            if (projectMinterState == RAMLib.ProjectMinterStates.B) {
                if (isSellout) {
                    // find next valid bid
                    // @dev okay if we extend past the maximum slot index
                    // for this view function
                    uint256 nextValidBidSlotIndex = _findNextValidBidSlotIndex({
                        projectId: projectId,
                        coreContract: coreContract,
                        startSlotIndex: RAMProjectConfig_.minBidSlotIndex
                    });
                    tokenPriceInWei = slotIndexToBidValue({
                        basePrice: RAMProjectConfig_.basePrice,
                        slotIndex: uint16(nextValidBidSlotIndex)
                    });
                } else {
                    // not sellout, so min bid is base price
                    tokenPriceInWei = RAMProjectConfig_.basePrice;
                }
            } else {
                // handle post-auction States C, D, E
                if (isSellout) {
                    // if sellout, return min bid price
                    tokenPriceInWei = slotIndexToBidValue({
                        basePrice: RAMProjectConfig_.basePrice,
                        slotIndex: RAMProjectConfig_.minBidSlotIndex
                    });
                } else {
                    // not sellout, so return base price
                    tokenPriceInWei = RAMProjectConfig_.basePrice;
                }
            }
        }
    }

    /**
     * Gets minimum next bid value in Wei and slot index for project `projectId`
     * on core contract `coreContract`.
     * If in a pre-auction state, reverts if unconfigured, otherwise returns
     * the minimum initial bid price for the upcoming auction.
     * If in an active auction, returns the minimum next bid's value and slot
     * index.
     * If in a post-auction state, reverts if auction was a sellout, otherwise
     * returns the auction's reserve price and slot index 0 (because tokens may
     * still be purchasable at the reserve price).
     * @param projectId Project ID to get the minimum next bid value for
     * @param coreContract Core contract address for the given project
     * @return minNextBidValueInWei minimum next bid value in Wei
     * @return minNextBidSlotIndex slot index of the minimum next bid
     */
    function getMinimumNextBid(
        uint256 projectId,
        address coreContract
    )
        internal
        view
        returns (uint256 minNextBidValueInWei, uint256 minNextBidSlotIndex)
    {
        // get minter state
        RAMLib.ProjectMinterStates projectMinterState = getProjectMinterState({
            projectId: projectId,
            coreContract: coreContract
        });
        // load project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        // handle pre-auction State A
        if (projectMinterState == RAMLib.ProjectMinterStates.A) {
            bool isConfigured = RAMProjectConfig_.timestampStart > 0;
            if (!isConfigured) {
                // if not configured, revert
                revert("auction not configured");
            }
            // if configured, min next bid is base price at slot 0
            minNextBidValueInWei = RAMProjectConfig_.basePrice;
            minNextBidSlotIndex = 0;
        } else {
            // values that apply to all live-auction and post-auction states
            bool isSellout = RAMProjectConfig_.numBids ==
                RAMProjectConfig_.numTokensInAuction;

            // handle live-auction State B
            if (projectMinterState == RAMLib.ProjectMinterStates.B) {
                if (isSellout) {
                    // find next valid bid
                    // @dev okay if we extend past the maximum slot index
                    // for this view function
                    minNextBidSlotIndex = _findNextValidBidSlotIndex({
                        projectId: projectId,
                        coreContract: coreContract,
                        startSlotIndex: RAMProjectConfig_.minBidSlotIndex
                    });
                    minNextBidValueInWei = slotIndexToBidValue({
                        basePrice: RAMProjectConfig_.basePrice,
                        slotIndex: uint16(minNextBidSlotIndex)
                    });
                } else {
                    // not sellout, so min bid is base price
                    minNextBidValueInWei = RAMProjectConfig_.basePrice;
                    minNextBidSlotIndex = 0;
                }
            } else {
                // handle post-auction States C, D, E
                if (isSellout) {
                    // if sellout, revert
                    revert("auction ended, sellout");
                } else {
                    // not sellout, so return base price
                    minNextBidValueInWei = RAMProjectConfig_.basePrice;
                    minNextBidSlotIndex = 0;
                }
            }
        }
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
        // @dev if project is configured to have an admin-artist-only mint period
            .adminArtistOnlyMintPeriodIfSellout &&
            // @dev sellout if numBids == numTokensInAuction
            RAMProjectConfig_.numBids == RAMProjectConfig_.numTokensInAuction &&
            // @dev still in admin-artist-only mint period if current time < end time + admin-artist-only mint period
            block.timestamp <
            timestampEnd + ADMIN_ARTIST_ONLY_MINT_TIME_SECONDS;
        if (adminOnlyMintPeriod) {
            // State C: Post-Auction, not all bids handled, admin-artist-only mint period
            return ProjectMinterStates.C;
        }
        // State D: Post-Auction, not all bids handled, post-admin-artist-only mint period
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
        uint256 tokensOwed = _getNumTokensOwed({
            RAMProjectConfig_: RAMProjectConfig_
        });
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
        uint256 tokensOwed = _getNumTokensOwed({
            RAMProjectConfig_: RAMProjectConfig_
        });
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
            // pre-auction, true if numTokensInAuction == 0
            RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
            maxHasBeenInvoked = RAMProjectConfig_.numTokensInAuction == 0;
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
     * Returns balance of project `projectId` on core contract `coreContract`
     * on this minter contract.
     * @param projectId Project ID to get the balance for
     * @param coreContract Core contract address for the given project
     */
    function getProjectBalance(
        uint256 projectId,
        address coreContract
    ) internal view returns (uint256) {
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        return RAMProjectConfig_.projectBalance;
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
     * @notice private helper function to mint a token.
     * @dev assumes all checks have been performed
     * @param projectId project ID to mint token for
     * @param coreContract core contract address for the given project
     * @param bidId bid ID of bid to mint token for
     * @param bidder bidder address of bid to mint token for
     * @param minterFilter minter filter contract address
     */
    function _mintTokenForBid(
        uint256 projectId,
        address coreContract,
        uint32 bidId,
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
            bidId: bidId,
            tokenId: tokenId
        });
    }

    /**
     * @notice Helper function to handle settling a bid.
     * Reverts if bidder is not the bid's bidder.
     * Reverts if bid has already been settled.
     * @param RAMProjectConfig_ RAMProjectConfig to update
     * @param projectId Project ID of bid to settle
     * @param coreContract Core contract address for the given project.
     * @param projectPrice Price of token on the project
     * @param bidId ID of bid to settle
     * @param bidder Bidder address of bid to settle
     * @param minterRefundGasLimit Gas limit to use when refunding the bidder.
     */
    function _settleBidWithChecks(
        RAMProjectConfig storage RAMProjectConfig_,
        uint256 projectId,
        address coreContract,
        uint256 projectPrice,
        uint32 bidId,
        address bidder,
        uint256 minterRefundGasLimit
    ) private {
        // CHECKS
        Bid storage bid = RAMProjectConfig_.bids[bidId];
        // require bidder is the bid's bidder
        require(bid.bidder == bidder, "Only bidder");
        // require bid is not yet settled
        require(
            !(_getBidPackedBool(bid, INDEX_IS_SETTLED)),
            "Only un-settled bid"
        );

        _settleBid({
            RAMProjectConfig_: RAMProjectConfig_,
            projectId: projectId,
            coreContract: coreContract,
            slotIndex: bid.slotIndex,
            bidId: bidId,
            projectPrice: projectPrice,
            minterRefundGasLimit: minterRefundGasLimit
        });
    }

    /**
     * @notice private helper function to handle settling a bid.
     * @dev assumes bid has not been previously settled, and that all other
     * checks have been performed.
     * @param RAMProjectConfig_ RAMProjectConfig to update
     * @param projectId Project ID of bid to settle
     * @param coreContract Core contract address for the given project.
     * @param slotIndex Slot index of bid to settle
     * @param bidId ID of bid to settle
     * @param projectPrice Price of token on the project
     */
    function _settleBid(
        RAMProjectConfig storage RAMProjectConfig_,
        uint256 projectId,
        address coreContract,
        uint256 slotIndex,
        uint32 bidId,
        uint256 projectPrice,
        uint256 minterRefundGasLimit
    ) private {
        // @dev bid not passed as parameter to avoid stack too deep error in
        // functions that utilize this helper function
        Bid storage bid = RAMProjectConfig_.bids[bidId];
        // EFFECTS
        // update state
        _setBidPackedBool({bid: bid, index: INDEX_IS_SETTLED, value: true});
        // amount due = bid amount - project price
        uint256 amountDue = slotIndexToBidValue({
            basePrice: RAMProjectConfig_.basePrice,
            // @dev safe to cast to uint16
            slotIndex: uint16(slotIndex)
        }) - projectPrice;
        if (amountDue > 0) {
            // force-send settlement to bidder
            // @dev reverts on underflow
            RAMProjectConfig_.projectBalance -= uint88(amountDue);
            SplitFundsLib.forceSafeTransferETH({
                to: bid.bidder,
                amount: amountDue,
                minterRefundGasLimit: minterRefundGasLimit
            });
        }
        // emit event for state change
        emit BidSettled({
            projectId: projectId,
            coreContract: coreContract,
            bidId: bidId
        });
    }

    /**
     * @notice Helper function to get the price of a token on a project.
     * @dev Assumes project is configured, has a base price, and generally
     * makes sense to get a price for.
     * @param RAMProjectConfig_ RAMProjectConfig to query
     */
    function _getProjectPrice(
        RAMProjectConfig storage RAMProjectConfig_
    ) private view returns (uint256 projectPrice) {
        bool wasSellout = RAMProjectConfig_.numBids ==
            RAMProjectConfig_.numTokensInAuction;
        // price is lowest bid if sellout, otherwise base price
        projectPrice = wasSellout
            ? slotIndexToBidValue({
                basePrice: RAMProjectConfig_.basePrice,
                slotIndex: RAMProjectConfig_.minBidSlotIndex
            })
            : RAMProjectConfig_.basePrice;
    }

    /**
     * @notice Helper function to get the number of tokens owed for a given
     * project.
     * Returns the number of bids in a project minus the sum of tokens already
     * minted and bids that have been refunded due to an error state.
     */
    function _getNumTokensOwed(
        RAMProjectConfig storage RAMProjectConfig_
    ) private view returns (uint256 tokensOwed) {
        tokensOwed =
            RAMProjectConfig_.numBids -
            (RAMProjectConfig_.numBidsMintedTokens +
                RAMProjectConfig_.numBidsErrorRefunded);
    }

    /**
     * @notice Inserts a bid into the project's RAMProjectConfig.
     * Assumes the bid is valid and may be inserted into the bucket-sort data
     * structure.
     * Creates a new bid if bidId is zero, otherwise moves an existing bid,
     * which is assumed to exist and be valid.
     * Emits BidCreated event if a new bid is created.
     * @param RAMProjectConfig_ RAM project config to insert bid into
     * @param projectId Project ID to insert bid for
     * @param coreContract Core contract address to insert bid for
     * @param slotIndex Slot index to insert bid at
     * @param bidder Bidder address
     * @param bidId Bid ID to insert, or zero if a new bid should be created
     */
    function _insertBid(
        RAMProjectConfig storage RAMProjectConfig_,
        uint256 projectId,
        address coreContract,
        uint16 slotIndex,
        address bidder,
        uint32 bidId
    ) private {
        // add the new Bid to tail of the slot's doubly linked list
        bool createNewBid = bidId == 0;
        if (createNewBid) {
            // prefix ++ to skip initial bid ID of zero (indicates null value)
            bidId = ++RAMProjectConfig_.nextBidId;
        }
        uint256 prevTailBidId = RAMProjectConfig_.tailBidIdBySlot[slotIndex];
        RAMProjectConfig_.bids[bidId] = Bid({
            prevBidId: uint32(prevTailBidId),
            nextBidId: 0, // null value at end of tail
            slotIndex: slotIndex,
            bidder: bidder,
            packedBools: 0 // all packed bools false
        });
        // update tail pointer to new bid
        RAMProjectConfig_.tailBidIdBySlot[slotIndex] = bidId;
        // update head pointer or next pointer of previous bid
        if (prevTailBidId == 0) {
            // first bid in slot, update head pointer
            RAMProjectConfig_.headBidIdBySlot[slotIndex] = bidId;
        } else {
            // update previous bid's next pointer
            RAMProjectConfig_.bids[prevTailBidId].nextBidId = bidId;
        }

        // update number of active bids
        RAMProjectConfig_.numBids++;
        // update metadata if first bid for this slot
        // @dev assumes minting has not yet started
        if (prevTailBidId == 0) {
            // set the slot in the bitmap
            _setBitmapSlot({
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

        if (createNewBid) {
            // emit state change event
            emit BidCreated({
                projectId: projectId,
                coreContract: coreContract,
                slotIndex: slotIndex,
                bidId: bidId,
                bidder: bidder
            });
        }
    }

    /**
     * @notice Remove minimum bid from the project's RAMProjectConfig.
     * Reverts if no bids exist in slot RAMProjectConfig_.minBidSlotIndex.
     * @param RAMProjectConfig_ RAM project config to remove bid from
     * @param minterRefundGasLimit Gas limit to use when refunding the previous
     * highest bidder, prior to using fallback force-send to refund
     */
    function _removeMinBid(
        RAMProjectConfig storage RAMProjectConfig_,
        uint256 projectId,
        address coreContract,
        uint256 minterRefundGasLimit
    ) private returns (uint16 removedSlotIndex) {
        // get the minimum bid slot and bid id
        removedSlotIndex = RAMProjectConfig_.minBidSlotIndex;
        uint256 removedBidId = RAMProjectConfig_.tailBidIdBySlot[
            removedSlotIndex
        ];
        // @dev no coverage on else branch because it is unreachable as used
        require(removedBidId > 0, "No bids");
        // record the previous min bidder
        Bid storage removedBid = RAMProjectConfig_.bids[removedBidId];
        address removedBidder = removedBid.bidder;
        // update the tail pointer of the slot's doubly linked list
        uint32 newTailBidId = removedBid.prevBidId;
        RAMProjectConfig_.tailBidIdBySlot[removedSlotIndex] = newTailBidId;

        RAMProjectConfig_.numBids--;
        // update metadata if no more active bids for this slot
        if (newTailBidId == 0) {
            // update the head pointer of the slot's doubly linked list
            RAMProjectConfig_.headBidIdBySlot[removedSlotIndex] = 0;

            // unset the slot in the bitmap
            // update minBidIndex, efficiently starting at minBidSlotIndex + 1
            _unsetBitmapSlot({
                RAMProjectConfig_: RAMProjectConfig_,
                slotIndex: removedSlotIndex
            });
            // @dev reverts if removedSlotIndex was the maximum slot 511,
            // preventing bids from being removed entirely from the last slot,
            // which is acceptable and non-impacting for this minter
            // @dev sets minBidSlotIndex to 512 if no more active bids
            RAMProjectConfig_.minBidSlotIndex = _getMinSlotWithBid({
                RAMProjectConfig_: RAMProjectConfig_,
                startSlotIndex: removedSlotIndex + 1
            });
        }
        // refund the removed bidder
        uint256 removedBidAmount = slotIndexToBidValue({
            basePrice: RAMProjectConfig_.basePrice,
            slotIndex: removedSlotIndex
        });
        // @dev reverts on underflow
        RAMProjectConfig_.projectBalance -= uint88(removedBidAmount);
        SplitFundsLib.forceSafeTransferETH({
            to: removedBidder,
            amount: removedBidAmount,
            minterRefundGasLimit: minterRefundGasLimit
        });

        // emit state change event
        emit BidRemoved({
            projectId: projectId,
            coreContract: coreContract,
            bidId: removedBidId
        });

        // delete the removed bid to prevent future claiming
        // @dev performed last to avoid pointing to deleted bid struct
        delete RAMProjectConfig_.bids[removedBidId];
    }

    /**
     * @notice Ejects a bid from the project's RAMProjectConfig.
     * Assumes the bid is valid (i.e. bid ID is a valid, active bid).
     * Does not refund the bidder, does not emit events, does not delete Bid.
     * @param RAMProjectConfig_ RAM project config to eject bid from
     * @param slotIndex Slot index to eject bid from
     * @param bidId ID of bid to eject
     */
    function _ejectBidFromSlot(
        RAMProjectConfig storage RAMProjectConfig_,
        uint16 slotIndex,
        uint256 bidId
    ) private {
        // get the bid to remove
        Bid storage removedBid = RAMProjectConfig_.bids[bidId];
        uint32 prevBidId = removedBid.prevBidId;
        uint32 nextBidId = removedBid.nextBidId;
        // update previous bid's next pointer
        if (prevBidId == 0) {
            // removed bid was the head bid
            RAMProjectConfig_.headBidIdBySlot[slotIndex] = nextBidId;
        } else {
            // removed bid was not the head bid
            RAMProjectConfig_.bids[prevBidId].nextBidId = nextBidId;
        }
        // update next bid's previous pointer
        if (nextBidId == 0) {
            // removed bid was the tail bid
            RAMProjectConfig_.tailBidIdBySlot[slotIndex] = prevBidId;
        } else {
            // removed bid was not the tail bid
            RAMProjectConfig_.bids[nextBidId].prevBidId = prevBidId;
        }

        // decrement the number of active bids
        RAMProjectConfig_.numBids--;

        // update metadata if no more active bids for this slot
        if (prevBidId == 0 && nextBidId == 0) {
            // unset the slot in the bitmap
            // update minBidIndex, efficiently starting at minBidSlotIndex + 1
            _unsetBitmapSlot({
                RAMProjectConfig_: RAMProjectConfig_,
                slotIndex: slotIndex
            });
            // @dev reverts if removedSlotIndex was the maximum slot 511,
            // preventing bids from being removed entirely from the last slot,
            // which is acceptable and non-impacting for this minter
            // @dev sets minBidSlotIndex to 512 if no more active bids
            RAMProjectConfig_.minBidSlotIndex = _getMinSlotWithBid({
                RAMProjectConfig_: RAMProjectConfig_,
                startSlotIndex: slotIndex + 1
            });
        }

        // @dev do not refund, do not emit event, do not delete bid
    }

    /**
     * @notice Helper function to handle setting slot in 512-bit bitmap
     * @dev WARN Assumes slotIndex is between 0 and 511, function will cast
     * incorrectly if >=512
     * @param slotIndex Index of slot to set (between 0 and 511)
     * @param RAMProjectConfig_ RAMProjectConfig to update
     */
    function _setBitmapSlot(
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
    function _unsetBitmapSlot(
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
     * @notice Helper function to set a packed boolean in a Bid struct.
     * @param bid Bid to update
     * @param index Index of packed boolean to update
     * @param value Value to set packed boolean to
     */
    function _setBidPackedBool(
        Bid storage bid,
        uint8 index,
        bool value
    ) private {
        if (value) {
            bid.packedBools = uint8(
                uint256(bid.packedBools).setBoolTrue(index)
            );
        } else {
            bid.packedBools = uint8(
                uint256(bid.packedBools).setBoolFalse(index)
            );
        }
    }

    /**
     * @notice Helper function to get a packed boolean from a Bid struct.
     * @param bid Bid to query
     * @param index Index of packed boolean to query
     * @return bool Value of packed boolean
     */
    function _getBidPackedBool(
        Bid storage bid,
        uint8 index
    ) private view returns (bool) {
        return uint256(bid.packedBools).getBool(index);
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
    function _getMinSlotWithBid(
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
    function _getMaxSlotWithBid(
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

    /**
     * @notice Returns the next valid bid slot index for a given project.
     * @dev this may return a slot index higher than the maximum slot index
     * allowed by the minter, in which case a bid cannot actually be placed
     * to outbid a bid at `startSlotIndex`.
     * @param projectId Project ID to find next valid bid slot index for
     * @param coreContract Core contract address for the given project
     * @param startSlotIndex Slot index to start search from
     * @return nextValidBidSlotIndex Next valid bid slot index
     */
    function _findNextValidBidSlotIndex(
        uint256 projectId,
        address coreContract,
        uint16 startSlotIndex
    ) private view returns (uint16 nextValidBidSlotIndex) {
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        uint256 basePrice = RAMProjectConfig_.basePrice;
        uint256 startBidValue = slotIndexToBidValue({
            basePrice: basePrice,
            slotIndex: startSlotIndex
        });
        // start search at next slot, incremented in while loop
        uint256 currentSlotIndex = startSlotIndex;
        uint256 currentSlotBidValue; // populated in while loop
        while (true) {
            // increment slot index and re-calc current slot bid value
            unchecked {
                currentSlotIndex++;
            }
            currentSlotBidValue = slotIndexToBidValue({
                basePrice: basePrice,
                slotIndex: uint16(currentSlotIndex)
            });
            // break if current slot's bid value is sufficiently greater than
            // the starting slot's bid value
            if (
                _isSufficientOutbid({
                    oldBidValue: startBidValue,
                    newBidValue: currentSlotBidValue
                })
            ) {
                break;
            }
            // otherwise continue to next iteration
        }
        // return the found valid slot index
        nextValidBidSlotIndex = uint16(currentSlotIndex);
    }

    /**
     * @notice Returns a bool indicating if a new bid value is sufficiently
     * greater than an old bid value, to replace the old bid value.
     * @param oldBidValue Old bid value to compare
     * @param newBidValue New bid value to compare
     * @return isSufficientOutbid True if new bid is sufficiently greater than
     * old bid, false otherwise
     */
    function _isSufficientOutbid(
        uint256 oldBidValue,
        uint256 newBidValue
    ) private pure returns (bool) {
        if (oldBidValue > 0.5 ether) {
            // require new bid is at least 2.5% greater than removed minimum bid
            return newBidValue > (oldBidValue * 10250) / 10000;
        }
        // require new bid is at least 5% greater than removed minimum bid
        return newBidValue > (oldBidValue * 10500) / 10000;
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
}
