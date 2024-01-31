// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
pragma solidity 0.8.22;

import {ISharedMinterV0} from "../../interfaces/v0.8.x/ISharedMinterV0.sol";
import {ISharedMinterRAMV0} from "../../interfaces/v0.8.x/ISharedMinterRAMV0.sol";
import {IMinterFilterV1} from "../../interfaces/v0.8.x/IMinterFilterV1.sol";

import {ABHelpers} from "../../libs/v0.8.x/ABHelpers.sol";
import {AuthLib} from "../../libs/v0.8.x/AuthLib.sol";
import {RAMLib} from "../../libs/v0.8.x/minter-libs/RAMLib.sol";
import {SplitFundsLib} from "../../libs/v0.8.x/minter-libs/SplitFundsLib.sol";
import {MaxInvocationsLib} from "../../libs/v0.8.x/minter-libs/MaxInvocationsLib.sol";

import {ReentrancyGuard} from "@openzeppelin-4.7/contracts/security/ReentrancyGuard.sol";
import {SafeCast} from "@openzeppelin-4.7/contracts/utils/math/SafeCast.sol";

/**
 * @title Filtered Minter contract that allows tokens to be minted with ETH.
 * Pricing is achieved using a fully on-chain ranked auction mechanism.
 * This is designed to be used with GenArt721CoreContractV3 flagship or
 * engine contracts.
 * @author Art Blocks Inc.
 * @notice Bid Front-Running:
 * TODO - update this for RAM
 * Collectors can front-run bids to become the highest bidder by bidding any
 * amount sufficiently higher than the current highest bid, considering the
 * minter-level configured value of `minterMinBidIncrementPercentage`. For
 * instance, if current bid is 1 ETH, and collector A sends a transaction with
 * a bid of 2.50 ETH, collector B may send a transaction with a bid of 2.499
 * ETH, that if successfully front-runs Collector A's transaction, is able to
 * cause collector A's transaction to revert. This is a difficult problem to
 * get around in a decentralized system with public bids, and we have chosen to
 * keep the minter simple and transparent, and leave it up to collectors to
 * understand the risks of front-running and bid accordingly.
 * @notice Token Ownership:
 * TODO - update this for RAM
 * This minter contract may own up to two tokens at a time for a given project.
 * The first possible token owned is the token that is currently being
 * auctioned. During the auction, the token is owned by the minter contract.
 * Once the auction ends, the token is transferred to the winning bidder via a
 * call to "settle" the auction.
 * The second possible token owned is the token that will be auctioned next.
 * This token is minted to and owned by the minter contract whenever possible
 * (i.e. when the project's max invocations has not been reached) when an
 * artist configures their project on this minter, or when a new auction is
 * started. The purpose of this token is to allow users to have a preview of
 * the next token that will be auctioned, even before the auction has started.
 * @notice Privileged Roles and Ownership:
 * TODO: Update this for RAM
 * This contract is designed to be managed, with limited powers.
 * Privileged roles and abilities are controlled by the core contract's Admin
 * ACL contract a project's artist, and auction winners. The Admin ACL and
 * project's artist roles hold extensive power and can modify minter details.
 * Care must be taken to ensure that the admin ACL contract and artist
 * addresses are secure behind a multi-sig or other access control mechanism.
 *
 * Additional admin and artist privileged roles may be described on other
 * contracts that this minter integrates with.
 * ----------------------------------------------------------------------------
 * Project-Minter STATE, FLAG, and ERROR Summary
 * Note: STATEs are mutually exclusive and are in-order, State C potentially skipped
 * -------------
 * STATE A: Pre-Auction
 * abilities:
 *  - (artist) configure project max invocations
 *  - (artist) configure project auction
 * -------------
 * STATE B: Live-Auction
 * abilities:
 *  - (minter active) create bid
 *  - (minter active) top-up bid
 *  - (admin) emergency increase auction end time by up to 48 hr (in cases of frontend downtime, etc.)
 *  - (admin | artist) refresh (reduce-only) max invocations (preemptively limit E1 state)
 *  - (artist) reduce min bid price or reduce auction length
 * -------------
 * STATE C: Post-Auction, not all bids handled, admin-only mint period (if applicable)
 * abilities:
 *  - (admin) mint tokens to winners
 *  - (winner) collect settlement
 *  - (FLAG F1) purchase remaining tokens for auction min price (base price), like fixed price minter
 *  - (ERROR E1)(admin) refund winning bids that cannot receive tokens due to max invocations error
 * -------------
 * STATE D: Post-Auction, not all bids handled, post-admin-only mint period
 * abilities:
 *  - (winner | admin) mint tokens to winners
 *  - (winner) collect settlement
 *  - (FLAG F1) purchase remaining tokens for auction min price (base price), like fixed price minter
 *  - (ERROR E1)(admin) refund lowest winning bids that cannot receive tokens due to max invocations error
 * -------------
 * STATE E: Post-Auction, all bids handled
 * note: "all bids handled" guarantees not in ERROR E1
 *  - (artist | admin) collect revenues
 *  - (winner) collect settlement (TODO - only if  minting doesn't also push out settlement)
 *  - (FLAG F1) purchase remaining tokens for auction min price (base price), like fixed price minter
 * -------------
 * FLAGS
 * F1: tokens owed < invocations available
 *     occurs when an auction ends before selling out, so tokens are aviailable to be purchased
 *     note: also occurs during Pre and Live auction, so FLAG F1 can occur with STATE A, B, but should not enable purchases
 * -------------
 * ERRORS
 * E1: tokens owed > invocations available
 *     occurs when tokens minted on different minter or core max invocations were reduced after auction bidding began.
 *     indicates operational error occurred.
 *     resolution: when all winning bids have either been fully refunded or received a token
 *     note: error state does not affect minimum winning bid price, and therefore does not affect settlement amount due to any
 *     winning bids.
 * ----------------------------------------------------------------------------
 * @notice Caution: While Engine projects must be registered on the Art Blocks
 * Core Registry to assign this minter, this minter does not enforce that a
 * project is registered when configured or queried. This is primarily for gas
 * optimization purposes. It is, therefore, possible that fake projects may be
 * configured on this minter, but bids will not be able to be placed due to
 * checks performed by this minter's Minter Filter.
 *
 * @dev Note that while this minter makes use of `block.timestamp` and it is
 * technically possible that this value is manipulated by block producers, such
 * manipulation will not have material impact on the ability for collectors to
 * place a bid before auction end time. This is due to the admin-configured
 * `minterTimeBufferSeconds` parameter, which will used to ensure that
 * collectors have sufficient time to place a bid after the final bid and
 * before the auction end time.
 */
contract MinterRAMV0 is ReentrancyGuard, ISharedMinterV0, ISharedMinterRAMV0 {
    using SafeCast for uint256;

    /// @notice Minter filter address this minter interacts with
    address public immutable minterFilterAddress;

    /// @notice Minter filter this minter may interact with.
    IMinterFilterV1 private immutable _minterFilter;

    /// @notice minterType for this minter
    string public constant minterType = "MinterRAMV0";

    /// @notice minter version for this minter
    string public constant minterVersion = "v1.0.0";

    /// @notice Minimum auction duration
    uint256 public constant MIN_AUCTION_DURATION_SECONDS = 60 * 10; // 10 minutes

    /** @notice Gas limit for refunding ETH to bidders
     * configurable by admin, default to 30,000
     * max uint24 ~= 16 million gas, more than enough for a refund
     * @dev SENDALL fallback is used to refund ETH if this limit is exceeded
     */
    uint24 internal _minterRefundGasLimit = 30_000;

    /**
     * @notice Initializes contract to be a shared, filtered minter for
     * minter filter `minterFilter`
     * @param minterFilter Minter filter for which this will be a minter
     */
    constructor(address minterFilter) ReentrancyGuard() {
        minterFilterAddress = minterFilter;
        _minterFilter = IMinterFilterV1(minterFilter);
        // emit events indicating default minter configuration values
        emit RAMLib.MinAuctionDurationSecondsUpdated({
            minAuctionDurationSeconds: MIN_AUCTION_DURATION_SECONDS
        });
        emit RAMLib.MinterRefundGasLimitUpdated({
            refundGasLimit: _minterRefundGasLimit
        });
        emit RAMLib.AuctionBufferTimeParamsUpdated({
            auctionBufferSeconds: RAMLib.AUCTION_BUFFER_SECONDS,
            maxAuctionExtraSeconds: RAMLib.MAX_AUCTION_EXTRA_SECONDS
        });
        emit RAMLib.NumSlotsUpdated({numSlots: RAMLib.NUM_SLOTS});
    }

    /**
     * @notice Sets the gas limit during ETH refunds when a collector is
     * outbid. This value should be set to a value that is high enough to
     * ensure that refunds are successful for commonly used wallets, but low
     * enough to avoid excessive abuse of refund gas allowance during a new
     * bid.
     * @dev max gas limit is ~16M, which is considered well over a future-safe
     * upper bound.
     * @param minterRefundGasLimit Gas limit to set for refunds. Must be
     * between 7,000 and max uint24 (~16M).
     */
    function updateRefundGasLimit(uint24 minterRefundGasLimit) external {
        // CHECKS
        AuthLib.onlyMinterFilterAdminACL({
            minterFilterAddress: minterFilterAddress,
            sender: msg.sender,
            contract_: address(this),
            selector: this.updateRefundGasLimit.selector
        });
        // @dev max gas limit implicitly checked by using uint24 input arg
        // @dev min gas limit is based on rounding up current cost to send ETH
        // to a Gnosis Safe wallet, which accesses cold address and emits event
        require(minterRefundGasLimit >= 7_000, "Only gte 7_000");
        // EFFECTS
        _minterRefundGasLimit = minterRefundGasLimit;
        emit RAMLib.MinterRefundGasLimitUpdated(minterRefundGasLimit);
    }

    /**
     * @notice Contract-Admin only function to update the requirements on if a
     * post-auction admin-only mint period is required, for and-on configured
     * projects.
     * @param coreContract core contract to set the configuration for.
     * @param requireAdminOnlyMintPeriod bool indicating if the minter should
     * require an admin-only mint period after the auction ends.
     * @param requireNoAdminOnlyMintPeriod bool indicating if the minter should
     * require no admin-only mint period after the auction ends.
     */
    function setContractConfig(
        address coreContract,
        bool requireAdminOnlyMintPeriod,
        bool requireNoAdminOnlyMintPeriod
    ) external {
        // CHECKS
        AuthLib.onlyCoreAdminACL({
            coreContract: coreContract,
            sender: msg.sender,
            contract_: address(this),
            selector: this.setContractConfig.selector
        });
        // EFFECTS
        RAMLib.setContractConfig({
            coreContract: coreContract,
            imposeConstraints: true, // always true because we are configuring
            requireAdminOnlyMintPeriod: requireAdminOnlyMintPeriod,
            requireNoAdminOnlyMintPeriod: requireNoAdminOnlyMintPeriod
        });
    }

    /**
     * @notice Contract-Admin only function to add emergency auction hours to
     * auction of project `projectId` on core contract `coreContract`.
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
    ) external {
        // CHECKS
        AuthLib.onlyCoreAdminACL({
            coreContract: coreContract,
            sender: msg.sender,
            contract_: address(this),
            selector: this.adminAddEmergencyAuctionHours.selector
        });
        // EFFECTS
        RAMLib.adminAddEmergencyAuctionHours({
            projectId: projectId,
            coreContract: coreContract,
            emergencyHoursToAdd: emergencyHoursToAdd
        });
    }

    /**
     * @notice Manually sets the local maximum invocations of project `projectId`
     * with the provided `maxInvocations`, checking that `maxInvocations` is less
     * than or equal to the value of project `project_id`'s maximum invocations that is
     * set on the core contract.
     * @dev Note that a `maxInvocations` of 0 can only be set if the current `invocations`
     * value is also 0 and this would also set `maxHasBeenInvoked` to true, correctly short-circuiting
     * this minter's purchase function, avoiding extra gas costs from the core contract's maxInvocations check.
     * @param projectId Project ID to set the maximum invocations for.
     * @param coreContract Core contract address for the given project.
     * @param maxInvocations Maximum invocations to set for the project.
     */
    function manuallyLimitProjectMaxInvocations(
        uint256 projectId,
        address coreContract,
        uint24 maxInvocations
    ) external {
        // CHECKS
        AuthLib.onlyArtist({
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender
        });
        // only project minter state A (Pre-Auction)
        RAMLib.ProjectMinterStates currentState = RAMLib.getProjectMinterState({
            projectId: projectId,
            coreContract: coreContract
        });
        require(currentState == RAMLib.ProjectMinterStates.A, "Only state A");
        // EFFECTS
        MaxInvocationsLib.manuallyLimitProjectMaxInvocations({
            projectId: projectId,
            coreContract: coreContract,
            maxInvocations: maxInvocations
        });
        // also update number of tokens in auction
        RAMLib.refreshNumTokensInAuction({
            projectId: projectId,
            coreContract: coreContract
        });
    }

    /**
     * @notice Sets auction details for project `projectId`.
     * @param projectId Project ID to set auction details for.
     * @param coreContract Core contract address for the given project.
     * @param auctionTimestampStart Timestamp at which to start the auction.
     * @param basePrice Resting price of the auction, in Wei.
     * @dev Note that a basePrice of `0` will cause the transaction to revert.
     */
    function setAuctionDetails(
        uint256 projectId,
        address coreContract,
        uint40 auctionTimestampStart,
        uint40 auctionTimestampEnd,
        uint256 basePrice,
        bool allowExtraTime,
        bool adminOnlyMintPeriodIfSellout
    ) external nonReentrant {
        AuthLib.onlyArtist({
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender
        });
        // CHECKS
        // require State A (pre-auction)
        require(
            RAMLib.getProjectMinterState({
                projectId: projectId,
                coreContract: coreContract
            }) == RAMLib.ProjectMinterStates.A,
            "Only pre-auction"
        );
        // check min auction duration
        // @dev underflow checked automatically in solidity 0.8
        require(
            auctionTimestampEnd - auctionTimestampStart >=
                MIN_AUCTION_DURATION_SECONDS,
            "Auction too short"
        );
        // EFFECTS
        // refresh max invocations to eliminate any stale state
        MaxInvocationsLib.refreshMaxInvocations({
            projectId: projectId,
            coreContract: coreContract
        });
        RAMLib.setAuctionDetails({
            projectId: projectId,
            coreContract: coreContract,
            auctionTimestampStart: auctionTimestampStart,
            auctionTimestampEnd: auctionTimestampEnd,
            basePrice: basePrice.toUint88(),
            allowExtraTime: allowExtraTime,
            adminOnlyMintPeriodIfSellout: adminOnlyMintPeriodIfSellout
        });
    }

    /**
     * @notice Places a bid for project `projectId` on core contract
     * `coreContract`.
     * Reverts if minter is not the active minter for projectId on minter
     * filter.
     * Reverts if project is not in a Live Auction.
     * Reverts if msg.value is not equal to slot value.
     * In order to successfully place the bid, the token bid must be:
     * - greater than or equal to a project's minimum bid price if maximum
     *   number of bids has not been reached
     * - sufficiently greater than the current minimum bid if maximum number
     *   of bids has been reached
     * If the bid is unsuccessful, the transaction will revert.
     * If the bid is successful, but outbid by another bid before the auction
     * ends, the funds will be noncustodially returned to the bidder's address,
     * `msg.sender`. A fallback method of sending funds back to the bidder via
     * SELFDESTRUCT (SENDALL) prevents denial of service attacks, even if the
     * original bidder reverts or runs out of gas during receive or fallback.
     * ------------------------------------------------------------------------
     * WARNING: bidders must be prepared to handle the case where their bid is
     * outbid and their funds are returned to the original `msg.sender` address
     * via SELFDESTRUCT (SENDALL).
     * ------------------------------------------------------------------------
     * @param projectId projectId being bid on.
     * @param coreContract Core contract address for the given project.
     * @dev nonReentrant modifier is used to prevent reentrancy attacks, e.g.
     * an an auto-bidder that would be able to atomically outbid a user's
     * new bid via a reentrant call to createBid.
     */
    function createBid(
        uint256 projectId,
        address coreContract,
        uint8 slotIndex
    ) external payable nonReentrant {
        // CHECKS
        // minter must be set for project on MinterFilter
        require(
            _minterFilter.getMinterForProject({
                projectId: projectId,
                coreContract: coreContract
            }) == address(this),
            "Minter not active"
        );
        // @dev bid value is checked against slot value in placeBid
        // @dev project state is checked in placeBid

        // EFFECTS
        RAMLib.placeBid({
            projectId: projectId,
            coreContract: coreContract,
            slotIndex: slotIndex,
            bidder: msg.sender,
            bidValue: msg.value,
            minterRefundGasLimit: _minterRefundGasLimit
        });
    }

    /**
     * @notice Purchases token for project `projectId` on core contract
     * `coreContract` for auction that has ended, but not yet been sold out.
     * @param projectId Project ID to purchase token for.
     * @param coreContract Core contract address for the given project.
     */
    function purchase(
        uint256 projectId,
        address coreContract
    ) external payable nonReentrant returns (uint256 tokenId) {
        // @dev checks performed in RAMLib purchaseTo function
        tokenId = RAMLib.purchaseTo({
            to: msg.sender,
            projectId: projectId,
            coreContract: coreContract,
            minterFilter: _minterFilter
        });
    }

    /**
     * @notice Purchases token for project `projectId` on core contract
     * `coreContract` for auction that has ended, but not yet been sold out,
     * and sets the token's owner to `to`.
     * @param projectId Project ID to purchase token for.
     * @param coreContract Core contract address for the given project.
     */
    function purchaseTo(
        address to,
        uint256 projectId,
        address coreContract
    ) external payable nonReentrant returns (uint256 tokenId) {
        // @dev checks performed in RAMLib purchaseTo function
        tokenId = RAMLib.purchaseTo({
            to: to,
            projectId: projectId,
            coreContract: coreContract,
            minterFilter: _minterFilter
        });
    }

    /**
     * @notice Collects settlement for project `projectId` on core contract
     * `coreContract` for all bid in `slotIndex` at `bidIndexInSlot`.
     * Reverts if project is not in a post-auction state.
     * Reverts if msg.sender is not the bid's bidder.
     * Reverts if msg.sender is not the bidder.
     * Reverts if bid has already been settled.
     * Reverts if invalid bid.
     * @param projectId Project ID of bid to collect settlement for
     * @param coreContract Core contract address for the given project.
     * @param slotIndex Slot index of bid to collect settlement for
     * @param bidIndexInSlot Bid index in slot of bid to collect settlement for
     */
    function collectSettlement(
        uint256 projectId,
        address coreContract,
        uint16 slotIndex,
        uint24 bidIndexInSlot
    ) external nonReentrant {
        // CHECKS
        // @dev project state is checked in collectSettlement
        // EFFECTS
        RAMLib.collectSettlement({
            projectId: projectId,
            coreContract: coreContract,
            slotIndex: slotIndex,
            bidIndexInSlot: bidIndexInSlot,
            bidder: msg.sender,
            minterRefundGasLimit: _minterRefundGasLimit
        });
    }

    /**
     * @notice Collects settlement for project `projectId` on core contract
     * `coreContract` for all bids in `slotIndices` at `bidIndicesInSlot`,
     * which must be aligned by index.
     * Reverts if `slotIndices` and `bid` indices are not the same length.
     * Reverts if msg.sender is not the bidder for all bids.
     * Reverts if project is not in a post-auction state.
     * Reverts if one or more bids has already been settled.
     * Reverts if invalid bid is found.
     * @param projectId Project ID of bid to collect settlement for
     * @param coreContract Core contract address for the given project.
     * @param slotIndices Slot indices of bids to collect settlements for
     * @param bidIndicesInSlot Bid indices in slot of bid to collect
     * settlements for
     */
    function collectSettlements(
        uint256 projectId,
        address coreContract,
        uint16[] calldata slotIndices,
        uint24[] calldata bidIndicesInSlot
    ) external nonReentrant {
        // CHECKS
        // @dev project state is checked in collectSettlements
        // @dev length of slotIndices and bidIndicesInSlot must be equal is
        // checked in collectSettlements
        // EFFECTS
        RAMLib.collectSettlements({
            projectId: projectId,
            coreContract: coreContract,
            slotIndices: slotIndices,
            bidIndicesInSlot: bidIndicesInSlot,
            bidder: msg.sender,
            minterRefundGasLimit: _minterRefundGasLimit
        });
    }

    /**
     * @notice Contract-Admin only function to mint tokens to winners of
     * project `projectId` on core contract `coreContract`.
     * Automatically mints tokens to most-winning bids, in order from highest
     * and earliest bid to lowest and latest bid.
     * Settles bids as tokens are minted, if not already settled.
     * Reverts if project is not in a post-auction state, admin-only mint
     * period (i.e. State C), with tokens available.
     * Reverts if msg.sender is not a contract admin.
     * Reverts if number of tokens to mint is greater than the number of
     * tokens available to be minted.
     * @param projectId Project ID to mint tokens on.
     * @param coreContract Core contract address for the given project.
     * @param numTokensToMint Number of tokens to mint in this transaction.
     */
    function adminAutoMintTokensToWinners(
        uint256 projectId,
        address coreContract,
        uint24 numTokensToMint
    ) external nonReentrant {
        // CHECKS
        AuthLib.onlyCoreAdminACL({
            coreContract: coreContract,
            sender: msg.sender,
            contract_: address(this),
            selector: this.adminAutoMintTokensToWinners.selector
        });
        // EFFECTS/INTERACTIONS
        RAMLib.adminAutoMintTokensToWinners({
            projectId: projectId,
            coreContract: coreContract,
            numTokensToMint: numTokensToMint,
            minterFilter: _minterFilter,
            minterRefundGasLimit: _minterRefundGasLimit
        });
    }

    /**
     * @notice Directly mint tokens to winners of project `projectId` on core
     * contract `coreContract`.
     * Does not guarantee an optimal ordering or handling of E1 state like
     * `adminAutoMintTokensToWinners` does while in State C.
     * Admin or Artist may mint to any winning bids.
     * Provides protection for Admin and Artist because they may mint tokens
     * to winners to prevent denial of revenue claiming.
     * Skips over bids that have already been minted or refunded (front-running
     * protection).
     * Reverts if project is not in a post-auction state, post-admin-only mint
     * period (i.e. State D), with tokens available.
     * Reverts if msg.sender is not a contract admin or artist.
     * @param projectId Project ID to mint tokens on.
     * @param coreContract Core contract address for the given project.
     * @param slotIndices Slot indices of bids to mint tokens for
     * @param bidIndicesInSlot Bid indices in slot of bid to mint tokens for
     */
    function adminArtistDirectMintTokensToWinners(
        uint256 projectId,
        address coreContract,
        uint16[] calldata slotIndices,
        uint24[] calldata bidIndicesInSlot
    ) external nonReentrant {
        // CHECKS
        AuthLib.onlyCoreAdminACLOrArtist({
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender,
            contract_: address(this),
            selector: this.adminArtistDirectMintTokensToWinners.selector
        });
        // EFFECTS/INTERACTIONS
        RAMLib.directMintTokensToWinners({
            projectId: projectId,
            coreContract: coreContract,
            slotIndices: slotIndices,
            bidIndicesInSlot: bidIndicesInSlot,
            requireSenderIsBidder: false, // not required when called by admin or artist
            minterFilter: _minterFilter,
            minterRefundGasLimit: _minterRefundGasLimit
        });
    }

    /**
     * @notice Directly mint tokens of winner of project `projectId` on core
     * contract `coreContract`.
     * Does not guarantee an optimal ordering or handling of E1 state like
     * `adminAutoMintTokensToWinners` does while in State C.
     * Only winning collector may call and mint tokens to themselves.
     * Provides protection for collectors because they may mint their tokens
     * directly.
     * Skips over bids that have already been minted or refunded (front-running
     * protection)
     * Reverts if project is not in a post-auction state, post-admin-only mint
     * period (i.e. State D), with tokens available.
     * Reverts if msg.sender is not the winning bidder for all specified bids.
     * @param projectId Project ID to mint tokens on.
     * @param coreContract Core contract address for the given project.
     * @param slotIndices Slot indices of bids to mint tokens for
     * @param bidIndicesInSlot Bid indices in slot of bid to mint tokens for
     */
    function winnerDirectMintTokens(
        uint256 projectId,
        address coreContract,
        uint16[] calldata slotIndices,
        uint24[] calldata bidIndicesInSlot
    ) external nonReentrant {
        // CHECKS
        // @dev all checks performed in library function
        // EFFECTS/INTERACTIONS
        RAMLib.directMintTokensToWinners({
            projectId: projectId,
            coreContract: coreContract,
            slotIndices: slotIndices,
            bidIndicesInSlot: bidIndicesInSlot,
            requireSenderIsBidder: true, // only allow winning bidder to call
            minterFilter: _minterFilter,
            minterRefundGasLimit: _minterRefundGasLimit
        });
    }

    /**
     * @notice Directly refund bids for project `projectId` on core
     * contract `coreContract` to resolve error state E1.
     * Does not guarantee an optimal ordering or handling of E1 state like
     * `adminAutoMintTokensToWinners` does while in State C.
     * Admin or Artist may refund to any bids.
     * Provides protection for Admin and Artist because they may refund to
     * resolve E1 state to prevent denial of revenue claiming.
     * Skips over bids that have already been minted or refunded (front-running
     * protection).
     * Reverts if project is not in a post-auction state, post-admin-only mint
     * period (i.e. State D).
     * Reverts if project is not in error state E1.
     * Reverts if length of bids to refund exceeds the number of bids that need
     * to be refunded to resolve the error state E1.
     * Reverts if bid does not exist at slotIndex and bidIndexInSlot.
     * Reverts if msg.sender is not a contract admin or artist.
     * @param projectId Project ID to mint tokens on.
     * @param coreContract Core contract address for the given project.
     * @param slotIndices Slot indices of bids to mint tokens for
     * @param bidIndicesInSlot Bid indices in slot of bid to mint tokens for
     */
    function adminArtistDirectRefundWinners(
        uint256 projectId,
        address coreContract,
        uint16[] calldata slotIndices,
        uint24[] calldata bidIndicesInSlot
    ) external nonReentrant {
        // CHECKS
        AuthLib.onlyCoreAdminACLOrArtist({
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender,
            contract_: address(this),
            selector: this.adminArtistDirectRefundWinners.selector
        });
        // EFFECTS/INTERACTIONS
        RAMLib.directRefundBidsToResolveE1({
            projectId: projectId,
            coreContract: coreContract,
            slotIndices: slotIndices,
            bidIndicesInSlot: bidIndicesInSlot,
            requireSenderIsBidder: false, // not required when called by admin or artist
            minterRefundGasLimit: _minterRefundGasLimit
        });
    }

    /**
     * @notice Directly refund bids for project `projectId` on core
     * contract `coreContract` to resolve error state E1.
     * Does not guarantee an optimal ordering or handling of E1 state like
     * `adminAutoMintTokensToWinners` does while in State C.
     * Only winning collector may call and refund to themselves.
     * Provides protection for collectors because they may refund their tokens
     * directly if in E1 state and they are no longer able to mint their
     * token(s) (prevent holding of funds).
     * Skips over bids that have already been minted or refunded (front-running
     * protection).
     * Reverts if project is not in a post-auction state, post-admin-only mint
     * period (i.e. State D).
     * Reverts if project is not in error state E1.
     * Reverts if length of bids to refund exceeds the number of bids that need
     * to be refunded to resolve the error state E1.
     * Reverts if msg.sender is not the winning bidder for all specified bids.
     * @param projectId Project ID to mint tokens on.
     * @param coreContract Core contract address for the given project.
     * @param slotIndices Slot indices of bids to mint tokens for
     * @param bidIndicesInSlot Bid indices in slot of bid to mint tokens for
     */
    function winnerDirectRefund(
        uint256 projectId,
        address coreContract,
        uint16[] calldata slotIndices,
        uint24[] calldata bidIndicesInSlot
    ) external nonReentrant {
        // CHECKS
        // @dev all checks performed in library function
        // EFFECTS/INTERACTIONS
        RAMLib.directRefundBidsToResolveE1({
            projectId: projectId,
            coreContract: coreContract,
            slotIndices: slotIndices,
            bidIndicesInSlot: bidIndicesInSlot,
            requireSenderIsBidder: true, // only allow winning bidder to call
            minterRefundGasLimit: _minterRefundGasLimit
        });
    }

    /**
     * @notice Function to automatically refund the lowest winning bids for
     * project `projectId` on core contract `coreContract` to resolve error
     * state E1.
     * Reverts if not called by a contract admin.
     * Reverts if project is not in post-auction state C.
     * Reverts if project is not in error state E1.
     * Reverts if numBidsToRefund exceeds the number of bids that need to be
     * refunded to resolve the error state E1.
     * @dev Admin-only requirement is not for security, but is to enable Admin
     * to be aware that an error state has been encountered while in post-
     * auction state C.
     * @param projectId Project ID to refunds bids for.
     * @param coreContract Core contract address for the given project.
     * @param numBidsToRefund Number of bids to refund in this call.
     */
    function adminAutoRefundBidsToResolveE1(
        uint256 projectId,
        address coreContract,
        uint24 numBidsToRefund
    ) external nonReentrant {
        // CHECKS
        AuthLib.onlyCoreAdminACL({
            coreContract: coreContract,
            sender: msg.sender,
            contract_: address(this),
            selector: this.adminAutoMintTokensToWinners.selector
        });
        // EFFECTS/INTERACTIONS
        RAMLib.autoRefundBidsToResolveE1({
            projectId: projectId,
            coreContract: coreContract,
            numBidsToRefund: numBidsToRefund,
            minterRefundGasLimit: _minterRefundGasLimit
        });
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
    ) external nonReentrant {
        // CHECKS
        AuthLib.onlyCoreAdminACLOrArtist({
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender,
            contract_: address(this),
            selector: this.withdrawArtistAndAdminRevenues.selector
        });
        // EFFECTS/INTERACTIONS
        RAMLib.withdrawArtistAndAdminRevenues({
            projectId: projectId,
            coreContract: coreContract
        });
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
    function getIsErrorE1(
        uint256 projectId,
        address coreContract
    ) external view returns (bool isError, uint256 numBidsToRefund) {
        (isError, numBidsToRefund, ) = RAMLib.isErrorE1({
            projectId: projectId,
            coreContract: coreContract
        });
    }

    /**
     * @notice View function to return the current minter-level configuration
     * details. Some or all of these values may be defined as constants for
     * this minter.
     * @return minAuctionDurationSeconds Minimum auction duration in seconds
     * @return auctionBufferSeconds Auction buffer time in seconds
     * @return maxAuctionExtraSeconds Maximum extra time in seconds
     * @return maxAuctionAdminEmergencyExtensionHours Maximum emergency
     * extension hours for admin
     * @return adminOnlyMintTimeSeconds Admin-only mint time in seconds
     * @return minterRefundGasLimit Gas limit for refunding ETH
     */
    function minterConfigurationDetails()
        external
        view
        returns (
            uint256 minAuctionDurationSeconds,
            uint256 auctionBufferSeconds,
            uint256 maxAuctionExtraSeconds,
            uint256 maxAuctionAdminEmergencyExtensionHours,
            uint256 adminOnlyMintTimeSeconds,
            uint24 minterRefundGasLimit
        )
    {
        minAuctionDurationSeconds = MIN_AUCTION_DURATION_SECONDS;
        auctionBufferSeconds = RAMLib.AUCTION_BUFFER_SECONDS;
        maxAuctionExtraSeconds = RAMLib.MAX_AUCTION_EXTRA_SECONDS;
        maxAuctionAdminEmergencyExtensionHours = RAMLib
            .MAX_AUCTION_ADMIN_EMERGENCY_EXTENSION_HOURS;
        adminOnlyMintTimeSeconds = RAMLib.ADMIN_ONLY_MINT_TIME_SECONDS;
        minterRefundGasLimit = _minterRefundGasLimit;
    }

    /**
     * @notice Gets the maximum invocations project configuration.
     * @dev RAMLib shims in logic to properly return maxHasBeenInvoked based
     * on project state, bid state, and core contract state.
     * @param projectId The ID of the project whose data needs to be fetched.
     * @param coreContract The address of the core contract.
     * @return MaxInvocationsLib.MaxInvocationsProjectConfig instance with the
     * configuration data.
     */
    function maxInvocationsProjectConfig(
        uint256 projectId,
        address coreContract
    )
        external
        view
        returns (MaxInvocationsLib.MaxInvocationsProjectConfig memory)
    {
        // RAM minter does not update maxHasBeenInvoked, so we ask the RAMLib
        // for this state, and it shims in an appropriate maxHasBeenInvoked
        // value based on the state of the auction, unminted bids, core
        // contract invocations, and minter max invocations
        return
            RAMLib.getMaxInvocationsProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
    }

    function getAuctionDetails(
        uint256 projectId,
        address coreContract
    )
        external
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
            bool adminOnlyMintPeriodIfSellout,
            bool revenuesCollected,
            RAMLib.ProjectMinterStates projectMinterState
        )
    {
        return
            RAMLib.getAuctionDetails({
                projectId: projectId,
                coreContract: coreContract
            });
    }

    /**
     * @notice Returns if project has reached maximum number of invocations for
     * a given project and core contract, properly accounting for the auction
     * state, unminted bids, core contract invocations, and minter max
     * invocations when determining maxHasBeenInvoked
     * @param projectId is an existing project ID.
     * @param coreContract is an existing core contract address.
     */
    function projectMaxHasBeenInvoked(
        uint256 projectId,
        address coreContract
    ) external view returns (bool) {
        return
            RAMLib.getMaxHasBeenInvoked({
                projectId: projectId,
                coreContract: coreContract
            });
    }

    /**
     * @notice projectId => project's maximum number of invocations.
     * Optionally synced with core contract value, for gas optimization.
     * Note that this returns a local cache of the core contract's
     * state, and may be out of sync with the core contract. This is
     * intentional, as it only enables gas optimization of mints after a
     * project's maximum invocations has been reached.
     * @dev A number greater than the core contract's project max invocations
     * will only result in a gas cost increase, since the core contract will
     * still enforce a maxInvocation check during minting. A number less than
     * the core contract's project max invocations is only possible when the
     * project's max invocations have not been synced on this minter, since the
     * V3 core contract only allows maximum invocations to be reduced, not
     * increased. When this happens, the minter will enable minting, allowing
     * the core contract to enforce the max invocations check. Based on this
     * rationale, we intentionally do not do input validation in this method as
     * to whether or not the input `projectId` is an existing project ID.
     * @param projectId is an existing project ID.
     * @param coreContract is an existing core contract address.
     */
    function projectMaxInvocations(
        uint256 projectId,
        address coreContract
    ) external view returns (uint256) {
        return
            MaxInvocationsLib.getMaxInvocations({
                projectId: projectId,
                coreContract: coreContract
            });
    }

    /**
     * @notice Checks if the specified `coreContract` is a valid engine contract.
     * @dev This function retrieves the cached value of `isEngine` from
     * the `isEngineCache` mapping. If the cached value is already set, it
     * returns the cached value. Otherwise, it calls the `getV3CoreIsEngineView`
     * function from the `SplitFundsLib` library to check if `coreContract`
     * is a valid engine contract.
     * @dev This function will revert if the provided `coreContract` is not
     * a valid Engine or V3 Flagship contract.
     * @param coreContract The address of the contract to check.
     * @return bool indicating if `coreContract` is a valid engine contract.
     */
    function isEngineView(address coreContract) external view returns (bool) {
        SplitFundsLib.IsEngineCache storage isEngineCache = SplitFundsLib
            .getIsEngineCacheConfig(coreContract);
        if (isEngineCache.isCached) {
            return isEngineCache.isEngine;
        } else {
            // @dev this calls the non-state-modifying variant of isEngine
            return SplitFundsLib.getV3CoreIsEngineView(coreContract);
        }
    }

    /**
     * @notice Gets minimum bid value to become the leading bidder in an
     * auction for project `projectId` on core contract `coreContract`.
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
     * Also returns currency symbol and address to be being used as payment,
     * which for this minter is ETH only.
     * @param projectId Project ID to get price information for.
     * @param coreContract Core contract to get price information for.
     * @return isConfigured true only if project auctions are configured.
     * @return tokenPriceInWei price in wei to become the leading bidder on a
     * token auction.
     * @return currencySymbol currency symbol for purchases of project on this
     * minter. This minter always returns "ETH"
     * @return currencyAddress currency address for purchases of project on
     * this minter. This minter always returns null address, reserved for ether
     */
    function getPriceInfo(
        uint256 projectId,
        address coreContract
    )
        external
        view
        returns (
            bool isConfigured,
            uint256 tokenPriceInWei,
            string memory currencySymbol,
            address currencyAddress
        )
    {
        (isConfigured, tokenPriceInWei) = RAMLib.getPriceInfo({
            projectId: projectId,
            coreContract: coreContract
        });
        // currency is always ETH
        currencySymbol = "ETH";
        currencyAddress = address(0);
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
        external
        view
        returns (uint256 minNextBidValueInWei, uint256 minNextBidSlotIndex)
    {
        (minNextBidValueInWei, minNextBidSlotIndex) = RAMLib.getMinimumNextBid({
            projectId: projectId,
            coreContract: coreContract
        });
    }

    /**
     * @notice Returns the value of the minimum bid in the project's auction,
     * in Wei.
     * Reverts if no bids exist in the auction.
     * @param projectId Project ID to get the minimum bid value for
     * @param coreContract Core contract address for the given project
     * @return minBidValue Value of the minimum bid in the auction, in Wei
     */
    function getMinBidValue(
        uint256 projectId,
        address coreContract
    ) external view returns (uint256) {
        (, uint16 minBidSlotIndex) = RAMLib.getMinBid({
            projectId: projectId,
            coreContract: coreContract
        });
        // translate slot index to bid value
        uint256 projectBasePrice = RAMLib
            .getRAMProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            })
            .basePrice;
        return
            RAMLib.slotIndexToBidValue({
                basePrice: projectBasePrice,
                slotIndex: minBidSlotIndex
            });
    }

    /**
     * @notice Syncs local maximum invocations of project `projectId` based on
     * the value currently defined in the core contract.
     * @param projectId Project ID to set the maximum invocations for.
     * @param coreContract Core contract address for the given project.
     * @dev this enables gas reduction after maxInvocations have been reached -
     * core contracts shall still enforce a maxInvocation check during mint.
     */
    function syncProjectMaxInvocationsToCore(
        uint256 projectId,
        address coreContract
    ) public {
        AuthLib.onlyArtist({
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender
        });

        MaxInvocationsLib.syncProjectMaxInvocationsToCore({
            projectId: projectId,
            coreContract: coreContract
        });
    }
}
