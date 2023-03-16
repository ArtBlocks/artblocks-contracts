// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.17;

import {IWETH} from "../../interfaces/0.8.x/IWETH.sol";

import "../../interfaces/0.8.x/IGenArt721CoreContractV3_Base.sol";
import "../../interfaces/0.8.x/IMinterFilterV0.sol";
import "../../interfaces/0.8.x/IFilteredMinterSEAV0.sol";
import "./MinterBase_v0_1_1.sol";

import "@openzeppelin-4.7/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin-4.7/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin-4.7/contracts/utils/math/SafeCast.sol";
import "@openzeppelin-4.7/contracts/utils/math/Math.sol";

/**
 * @title Filtered Minter contract that allows tokens to be minted with ETH.
 * Pricing is achieved using an automated serial English Auction mechanism.
 * This is designed to be used with GenArt721CoreContractV3 flagship or
 * engine contracts.
 * @author Art Blocks Inc.
 * @notice This contract was inspired by the release mechanism implemented by
 * nouns.wtf, and we thank them for their pioneering work in this area.
 /*********************************
 * ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ *
 * ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ *
 * ░░░░░░█████████░░█████████░░░ *
 * ░░░░░░██░░░████░░██░░░████░░░ *
 * ░░██████░░░████████░░░████░░░ *
 * ░░██░░██░░░████░░██░░░████░░░ *
 * ░░██░░██░░░████░░██░░░████░░░ *
 * ░░░░░░█████████░░█████████░░░ *
 * ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ *
 * ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ *
 *********************************
 * @notice Privileged Roles and Ownership:
 * This contract is designed to be managed, with limited powers.
 * Privileged roles and abilities are controlled by the core contract's Admin
 * ACL contract and a project's artist. Both of these roles hold extensive
 * power and can modify minter details.
 * Care must be taken to ensure that the admin ACL contract and artist
 * addresses are secure behind a multi-sig or other access control mechanism.
 * ----------------------------------------------------------------------------
 * The following functions are restricted to the core contract's Admin ACL
 * contract:
 * - updateAllowableAuctionDurationSeconds
 * - updateMinterMinBidIncrementPercentage
 * - updateMinterTimeBufferSeconds
 * ----------------------------------------------------------------------------
 * The following functions are restricted to a project's artist:
 * - setProjectMaxInvocations
 * - manuallyLimitProjectMaxInvocations
 * - configureFutureAuctions
 * - tryPopulateNextToken
 * ----------------------------------------------------------------------------
 * The following functions are restricted to a project's artist or the core
 * contract's Admin ACL contract:
 * - resetAuctionDetails
 * ----------------------------------------------------------------------------
 * Additional admin and artist privileged roles may be described on other
 * contracts that this minter integrates with.
 *
 * @dev Note that while this minter makes use of `block.timestamp` and it is
 * technically possible that this value is manipulated by block producers, such
 * manipulation will not have material impact on the ability for collectors to
 * place a bid before auction end time. This is due to the admin-configured
 * `minterTimeBufferSeconds` parameter, which will used to ensure that
 * collectors have sufficient time to place a bid after the final bid and
 * before the auction end time.
 */
contract MinterSEAV0 is ReentrancyGuard, MinterBase, IFilteredMinterSEAV0 {
    using SafeCast for uint256;

    /// Core contract address this minter interacts with
    address public immutable genArt721CoreAddress;

    /// The core contract integrates with V3 contracts
    IGenArt721CoreContractV3_Base private immutable genArtCoreContract_Base;

    /// Minter filter address this minter interacts with
    address public immutable minterFilterAddress;

    /// Minter filter this minter may interact with.
    IMinterFilterV0 private immutable minterFilter;

    /// minterType for this minter
    string public constant minterType = "MinterSEAV0";

    /// minter version for this minter
    string public constant minterVersion = "v0.0.0";

    /// The public WETH contract address
    /// @dev WETH is used as fallback payment method when ETH transfers are
    /// failing during bidding process (e.g. receive function is not payable)
    IWETH public immutable weth;

    uint256 constant ONE_MILLION = 1_000_000;

    // project-specific parameters
    struct ProjectConfig {
        bool maxHasBeenInvoked;
        // max uint24 ~= 1.6e7, > max possible project invocations of 1e6
        uint24 maxInvocations;
        // time after which new auctions may be started
        // note: new auctions must always be started with a new bid, at which
        // point the auction will actually start
        // @dev this is a project-level constraint, and individual auctions
        // will each have their own start time defined in `activeAuction`
        // max uint64 ~= 1.8e19 sec ~= 570 billion years
        uint64 timestampStart;
        // duration of each new auction, before any extensions due to late bids
        uint32 auctionDurationSeconds;
        // next token number to be auctioned, owned by minter
        // @dev store token number to enable storage packing, as token ID can
        // be derived from this value in combination with project ID
        // max uint24 ~= 1.6e7, > max possible project invocations of 1e6
        uint24 nextTokenNumber;
        // bool to indicate if next token number has been populated, or is
        // still default value of 0
        // @dev required to handle edge case where next token number is 0
        bool nextTokenNumberIsPopulated;
        // reserve price, i.e. minimum starting bid price, in wei
        // @dev for configured auctions, this will be gt 0, so it may be used
        // to determine if an auction is configured
        uint256 basePrice;
        // active auction for project
        Auction activeAuction;
    }

    mapping(uint256 => ProjectConfig) public projectConfig;

    // minter-wide, admin-configurable parameters
    // ----------------------------------------
    // minimum inital auction length, in seconds; configurable by admin
    // max uint32 ~= 4.3e9 sec ~= 136 years
    // @dev enforced only when artist configures a project
    // @dev default to 10 minutes
    uint32 minAuctionDurationSeconds = 600;
    // maximum inital auction length, in seconds; configurable by admin
    // @dev enforced only when artist configures a project
    // @dev default to 1 month (1/12 of a year)
    uint32 maxAuctionDurationSeconds = 2_629_746;
    // the minimum percent increase for new bids above the current bid
    // configureable by admin
    // max uint8 ~= 255, > 100 percent
    // @dev used when determining the increment percentage for any new bid on
    // the minter, across all projects
    uint8 minterMinBidIncrementPercentage = 5;
    // minimum time remaining in auction after a new bid is placed
    // configureable by admin
    // max uint32 ~= 4.3e9 sec ~= 136 years
    // @dev used when determining the buffer time for any new bid on the
    // minter, across all projects
    uint32 minterTimeBufferSeconds = 120;

    // modifier-like internal functions
    // @dev we use internal functions instead of modifiers to reduce contract
    // bytecode size
    // ----------------------------------------
    // function to restrict access to only AdminACL allowed calls
    // @dev defers to the ACL contract used on the core contract
    function _onlyCoreAdminACL(bytes4 _selector) internal {
        require(
            genArtCoreContract_Base.adminACLAllowed(
                msg.sender,
                address(this),
                _selector
            ),
            "Only Core AdminACL allowed"
        );
    }

    // function to restrict access to only the artist of a project
    function _onlyArtist(uint256 _projectId) internal view {
        require(
            (msg.sender ==
                genArtCoreContract_Base.projectIdToArtistAddress(_projectId)),
            "Only Artist"
        );
    }

    // function to restrict access to only the artist of a project or
    // AdminACL allowed calls
    // @dev defers to the ACL contract used on the core contract
    function _onlyCoreAdminACLOrArtist(
        uint256 _projectId,
        bytes4 _selector
    ) internal {
        require(
            (msg.sender ==
                genArtCoreContract_Base.projectIdToArtistAddress(_projectId)) ||
                (
                    genArtCoreContract_Base.adminACLAllowed(
                        msg.sender,
                        address(this),
                        _selector
                    )
                ),
            "Only Artist or Admin ACL"
        );
    }

    /**
     * @notice Initializes contract to be a Filtered Minter for
     * `_minterFilter`, integrated with Art Blocks core contract
     * at address `_genArt721Address`.
     * @param _genArt721Address Art Blocks core contract address for
     * which this contract will be a minter.
     * @param _minterFilter Minter filter for which
     * this will a filtered minter.
     * @param _wethAddress The WETH contract address to use for fallback
     * payment method when ETH transfers are failing during bidding process
     */
    constructor(
        address _genArt721Address,
        address _minterFilter,
        address _wethAddress
    ) ReentrancyGuard() MinterBase(_genArt721Address) {
        genArt721CoreAddress = _genArt721Address;
        genArtCoreContract_Base = IGenArt721CoreContractV3_Base(
            _genArt721Address
        );
        minterFilterAddress = _minterFilter;
        minterFilter = IMinterFilterV0(_minterFilter);
        require(
            minterFilter.genArt721CoreAddress() == _genArt721Address,
            "Illegal contract pairing"
        );
        weth = IWETH(_wethAddress);
    }

    /**
     * @notice Syncs local maximum invocations of project `_projectId` based on
     * the value currently defined in the core contract.
     * @param _projectId Project ID to set the maximum invocations for.
     * @dev this enables gas reduction after maxInvocations have been reached -
     * core contracts shall still enforce a maxInvocation check during mint.
     */
    function setProjectMaxInvocations(uint256 _projectId) public {
        _onlyArtist(_projectId);
        uint256 maxInvocations;
        uint256 invocations;
        (invocations, maxInvocations, , , , ) = genArtCoreContract_Base
            .projectStateData(_projectId);

        // update storage with results
        projectConfig[_projectId].maxInvocations = uint24(maxInvocations);

        // must ensure maxHasBeenInvoked is correctly set after manually syncing the
        // local maxInvocations value with the core contract's maxInvocations value.
        // This synced value of maxInvocations from the core contract will always be greater
        // than or equal to the previous value of maxInvocations stored locally.
        projectConfig[_projectId].maxHasBeenInvoked =
            invocations == maxInvocations;

        emit ProjectMaxInvocationsLimitUpdated(_projectId, maxInvocations);

        // for convenience, try to mint and assign a token to the project's
        // next slot
        _tryMintTokenToNextSlot(_projectId);
    }

    /**
     * @notice Manually sets the local maximum invocations of project `_projectId`
     * with the provided `_maxInvocations`, checking that `_maxInvocations` is less
     * than or equal to the value of project `_project_id`'s maximum invocations that is
     * set on the core contract.
     * @dev Note that a `_maxInvocations` of 0 can only be set if the current `invocations`
     * value is also 0 and this would also set `maxHasBeenInvoked` to true, correctly short-circuiting
     * this minter's purchase function, avoiding extra gas costs from the core contract's maxInvocations check.
     * @param _projectId Project ID to set the maximum invocations for.
     * @param _maxInvocations Maximum invocations to set for the project.
     */
    function manuallyLimitProjectMaxInvocations(
        uint256 _projectId,
        uint256 _maxInvocations
    ) external {
        _onlyArtist(_projectId);
        // CHECKS
        // ensure that the manually set maxInvocations is not greater than what is set on the core contract
        uint256 maxInvocations;
        uint256 invocations;
        (invocations, maxInvocations, , , , ) = genArtCoreContract_Base
            .projectStateData(_projectId);
        require(
            _maxInvocations <= maxInvocations,
            "Cannot increase project max invocations above core contract set project max invocations"
        );
        require(
            _maxInvocations >= invocations,
            "Cannot set project max invocations to less than current invocations"
        );
        // EFFECTS
        // update storage with results
        projectConfig[_projectId].maxInvocations = uint24(_maxInvocations);
        // We need to ensure maxHasBeenInvoked is correctly set after manually
        // setting the local maxInvocations value.
        projectConfig[_projectId].maxHasBeenInvoked =
            invocations == _maxInvocations;

        emit ProjectMaxInvocationsLimitUpdated(_projectId, _maxInvocations);

        // for convenience, try to mint and assign a token to the project's
        // next slot
        _tryMintTokenToNextSlot(_projectId);
    }

    /**
     * @notice Sets the minimum and maximum values that are settable for
     * `durationSeconds` for all project configurations.
     * Note that the auction duration is the initial duration of the auction,
     * and does not include any extensions that may occur due to new bids being
     * placed near the end of an auction.
     * @param _minAuctionDurationSeconds Minimum auction duration in seconds.
     * @param _maxAuctionDurationSeconds Maximum auction duration in seconds.
     */
    function updateAllowableAuctionDurationSeconds(
        uint32 _minAuctionDurationSeconds,
        uint32 _maxAuctionDurationSeconds
    ) external {
        _onlyCoreAdminACL(this.updateAllowableAuctionDurationSeconds.selector);
        // CHECKS
        require(
            _maxAuctionDurationSeconds > _minAuctionDurationSeconds,
            "Only max gt min"
        );
        require(_minAuctionDurationSeconds > 0, "Only min gt 0");
        // EFFECTS
        minAuctionDurationSeconds = _minAuctionDurationSeconds;
        maxAuctionDurationSeconds = _maxAuctionDurationSeconds;
        emit AuctionDurationSecondsRangeUpdated(
            _minAuctionDurationSeconds,
            _minAuctionDurationSeconds
        );
    }

    /**
     * @notice Sets the minter-wide minimum bid increment percentage. New bids
     * must be this percent higher than the current top bid to be successful.
     * This value should be configured by admin such that appropriate price
     * discovery is able to be reached, but gas fees associated with bidding
     * wars do not dominate the economics of an auction.
     * @dev the input value is considered to be a percentage, so that a value
     * of 5 represents 5%.
     */
    function updateMinterMinBidIncrementPercentage(
        uint8 _minterMinBidIncrementPercentage
    ) external {
        _onlyCoreAdminACL(this.updateMinterMinBidIncrementPercentage.selector);
        // CHECKS
        require(_minterMinBidIncrementPercentage > 0, "Only gt 0");
        // EFFECTS
        minterMinBidIncrementPercentage = _minterMinBidIncrementPercentage;
        emit MinterMinBidIncrementPercentageUpdated(
            _minterMinBidIncrementPercentage
        );
    }

    /**
     * @notice Sets the minter-wide time buffer in seconds. The time buffer is
     * the minimum amount of time that must pass between the final bid and the
     * the end of an auction. Auctions are extended if a new bid is placed
     * within this time buffer of the auction end time.
     */
    function updateMinterTimeBufferSeconds(
        uint32 _minterTimeBufferSeconds
    ) external {
        _onlyCoreAdminACL(this.updateMinterTimeBufferSeconds.selector);
        // CHECKS
        require(_minterTimeBufferSeconds > 0, "Only gt 0");
        // EFFECTS
        minterTimeBufferSeconds = _minterTimeBufferSeconds;
        emit MinterTimeBufferUpdated(_minterTimeBufferSeconds);
    }

    /**
     * @notice Warning: Disabling purchaseTo is not supported on this minter.
     * This method exists purely for interface-conformance purposes.
     */
    function togglePurchaseToDisabled(uint256 _projectId) external view {
        _onlyArtist(_projectId);
        revert("Action not supported");
    }

    /**
     * @notice Sets auction details for project `_projectId`.
     * If project does not have a "next token" assigned, this function attempts
     * to mint a token and assign it to the project's next token slot.
     * @param _projectId Project ID to set future auction details for.
     * @param _timestampStart Timestamp after which new auctions may be
     * started. Note that this is not the timestamp of the auction start, but
     * rather the timestamp after which a auction may be started. Also note
     * that the passed value here must either be in the future, or `0` (which
     * indicates that auctions are immediately startable).
     * @param _auctionDurationSeconds Duration of new auctions, in seconds,
     * before any extensions due to bids being placed inside buffer period near
     * the end of an auction.
     * @param _basePrice reserve price (minimum starting bid price), in wei.
     * Must be greater than 0, but may be as low as 1 wei.
     * @dev `_basePrice` of zero not allowed so we can use zero as a gas-
     * efficient indicator of whether auctions have been configured for a
     * project.
     */
    function configureFutureAuctions(
        uint256 _projectId,
        uint256 _timestampStart,
        uint256 _auctionDurationSeconds,
        uint256 _basePrice
    ) external {
        _onlyArtist(_projectId);
        // CHECKS
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        require(
            _timestampStart == 0 || block.timestamp < _timestampStart,
            "Only future start times or 0"
        );
        require(
            (_auctionDurationSeconds >= minAuctionDurationSeconds) &&
                (_auctionDurationSeconds <= maxAuctionDurationSeconds),
            "Auction duration out of range"
        );
        require(_basePrice > 0, "Only base price gt 0");
        // EFFECTS
        _projectConfig.timestampStart = _timestampStart.toUint64();
        _projectConfig.auctionDurationSeconds = _auctionDurationSeconds
            .toUint32();
        _projectConfig.basePrice = _basePrice;

        emit ConfiguredFutureAuctions(
            _projectId,
            _timestampStart.toUint64(),
            _auctionDurationSeconds.toUint32(),
            _basePrice
        );

        // sync local max invocations if not initially populated
        // @dev if local max invocations and maxHasBeenInvoked are both
        // initial values, we know they have not been populated.
        if (
            _projectConfig.maxInvocations == 0 &&
            _projectConfig.maxHasBeenInvoked == false
        ) {
            setProjectMaxInvocations(_projectId);
            // @dev setProjectMaxInvocations function calls
            // _tryMintTokenToNextSlot, so we do not call it here.
        } else {
            // for convenience, try to mint to next token slot
            _tryMintTokenToNextSlot(_projectId);
        }
    }

    /**
     * @notice Resets future auction configuration for project `_projectId`,
     * zero-ing out all details having to do with future auction parameters.
     * This is not intended to be used in normal operation, but rather only in
     * case of the need to halt the creation of any future auctions.
     * Does not affect any project max invocation details.
     * Does not affect any project next token details (i.e. if a next token is
     * assigned, it will remain assigned and held by the minter until auction
     * details are reconfigured).
     * @param _projectId Project ID to reset future auction configuration
     * details for.
     */
    function resetAuctionDetails(uint256 _projectId) external {
        _onlyCoreAdminACLOrArtist(
            _projectId,
            this.resetAuctionDetails.selector
        );
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        // reset to initial values
        _projectConfig.timestampStart = 0;
        _projectConfig.auctionDurationSeconds = 0;
        _projectConfig.basePrice = 0;
        // @dev do not affect next token or max invocations

        emit ResetAuctionDetails(_projectId);
    }

    /**
     * @notice Emergency, Artist-only function that attempts to mint a new
     * token and set it as the the next token to be auctioned for project
     * `_projectId`.
     * Note: This function is only included for emergency, unforseen use cases,
     * and should not be used in normal operation. It is here only for
     * redundant protection against an unforseen edge case where the minter
     * does not have a populated "next token", but there are still invocations
     * remaining on the project.
     * This function reverts if the project is not configured on this minter.
     * This function returns early and does not modify state when:
     *   - the minter already has a populated "next token" for the project
     *   - the project has reached its maximum invocations on the core contract
     *     or minter
     * @dev This function is gated to only the project's artist to prevent
     * early minting of tokens by other users.
     * @param _projectId The project ID
     */
    function tryPopulateNextToken(uint256 _projectId) public nonReentrant {
        _onlyArtist(_projectId);
        // CHECKS
        // revert if project is not configured on this minter
        require(
            projectConfig[_projectId].basePrice > 0,
            "Project not configured"
        );
        // INTERACTIONS
        // attempt to mint new token to this minter contract, only if max
        // invocations has not been reached
        _tryMintTokenToNextSlot(_projectId);
    }

    /**
     * @notice Settles any complete auction for token `_settleTokenId` (if
     * applicable), then attempts to create a bid for token
     * `_bidTokenId` with bid amount and bidder address equal to
     * `msg.value` and `msg.sender`, respectively.
     * Intended to gracefully handle the case where a user is front-run by
     * one or more transactions to settle and/or initialize a new auction,
     * potentially still placing a bid on the auction for the token ID if the
     * bid value is sufficiently higher than the current highest bid.
     * Note that the use of `_targetTokenId` is to prevent the possibility of
     * transactions that are stuck in the pending pool for long periods of time
     * from unintentionally bidding on auctions for future tokens.
     * Note that calls to `settleAuction` and `createBid` are possible
     * to be called in separate transactions, but this function is provided for
     * convenience and executes both of those functions in a single
     * transaction, while handling front-running as gracefully as possible.
     * @param _settleTokenId Token ID to settle auction for.
     * @dev this function is not non-reentrant, but the underlying calls are
     * to non-reentrant functions.
     */
    function settleAuctionAndCreateBid(
        uint256 _settleTokenId,
        uint256 _bidTokenId
    ) external payable {
        // ensure tokens are in the same project
        require(
            _settleTokenId / ONE_MILLION == _bidTokenId / ONE_MILLION,
            "Only tokens in same project"
        );
        // settle completed auction, if applicable
        settleAuction(_settleTokenId);
        // attempt to bid on next token
        createBid_l34(_bidTokenId);
    }

    /**
     * @notice Settles a completed auction for `_tokenId`, if it exists and is
     * not yet settled.
     * Returns early (does not modify state) if there is no initialized auction
     * for the project associated with `_tokenId`, or if the auction for
     * `_tokenId` has already been settled.
     * This function reverts if there is an auction for a different token ID on
     * the project associated with `_tokenId`.
     * This function also reverts if the auction for `_tokenId` exists, but has
     * not yet ended.
     * @param _tokenId Token ID to settle auction for.
     */
    function settleAuction(uint256 _tokenId) public nonReentrant {
        uint256 _projectId = _tokenId / ONE_MILLION;
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        Auction storage _auction = _projectConfig.activeAuction;
        // CHECKS
        if (!_auction.initialized || _auction.settled) {
            // auction not initialized or already settled, so return early
            return;
        }
        require(_auction.tokenId != _tokenId, "Auction for different token");
        require(block.timestamp > _auction.endTime, "Auction not yet ended");
        // EFFECTS
        _auction.settled = true;
        // INTERACTIONS
        // send token to the winning bidder
        IERC721(genArt721CoreAddress).transferFrom(
            address(this),
            _auction.currentBidder,
            _tokenId
        );
        // distribute revenues from auction
        splitRevenuesETH(_projectId, _auction.currentBid, genArt721CoreAddress);

        emit AuctionSettled(
            _tokenId,
            _auction.currentBidder,
            _auction.currentBid
        );
    }

    /**
     * @notice Enters a bid for token `_tokenId`.
     * If an auction for token `_tokenId` does not exist, an auction will be
     * initialized as long as any existing auction for the project has been
     * settled.
     * In order to successfully place the bid, the token bid must be:
     * - greater than or equal to a project's minimum bid price if a new
     *   auction is initialized
     * - sufficiently greater than the current highest bid, according to the
     *   minter's bid increment percentage `minterMinBidIncrementPercentage`,
     *   if an auction for the token already exists
     * If the bid is unsuccessful, the transaction will revert.
     * If the bid is successful, but outbid by another bid before the auction
     * ends, the funds will be noncustodially returned to the bidder's address,
     * `msg.sender`. A fallback method of sending funds back to the bidder via
     * WETH is used if the bidder address is not accepting ETH (preventing
     * denial of service attacks) within a 30_000 gas limit.
     * Note that the use of `_tokenId` is to prevent the possibility of
     * transactions that are stuck in the pending pool for long periods of time
     * from unintentionally bidding on auctions for future tokens.
     * @param _tokenId Token ID being bidded on
     */
    function createBid(uint256 _tokenId) external payable {
        createBid_l34(_tokenId);
    }

    /**
     * @notice gas-optimized version of createBid(uint256).
     * @dev nonReentrant modifier is used to prevent reentrancy attacks, e.g.
     * an an auto-bidder that would be able to atomically outbid a user's
     * new bid via a reentrant call to createBid.
     */
    function createBid_l34(uint256 _tokenId) public payable nonReentrant {
        uint256 _projectId = _tokenId / ONE_MILLION;
        // CHECKS
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        Auction storage _auction = _projectConfig.activeAuction;

        // if no auction exists, or current auction is already settled, attempt
        // to initialize a new auction for the input token ID and immediately
        // return
        if ((!_auction.initialized) || _auction.settled) {
            _initializeAuctionWithBid(_projectId, _tokenId);
            return;
        }
        // @dev this branch is guaranteed to have an initialized auction that
        // not settled, so no need to check for initialized or not settled

        // ensure bids for a specific token ID are only applied to the auction
        // for that token ID.
        require(
            _auction.tokenId == _tokenId,
            "Token ID does not match auction"
        );

        // ensure auction is not already ended
        require(_auction.endTime > block.timestamp, "Auction already ended");

        // require bid to be sufficiently greater than current highest bid
        // @dev no overflow enforced automatically by solidity ^8.0.0
        require(
            msg.value >=
                (_auction.currentBid *
                    (100 + minterMinBidIncrementPercentage)) /
                    100,
            "Bid is too low"
        );

        // EFFECTS
        // record previous highest bid details for refunding
        uint256 previousBid = _auction.currentBid;
        address payable previousBidder = _auction.currentBidder;

        // update auction state
        _auction.currentBid = msg.value;
        _auction.currentBidder = payable(msg.sender);
        uint256 minEndTime = block.timestamp + minterTimeBufferSeconds;
        if (_auction.endTime < minEndTime) {
            _auction.endTime = minEndTime.toUint64();
        }

        // INTERACTIONS
        // refund previous highest bidder
        _safeTransferETHWithFallback(previousBidder, previousBid);

        emit AuctionBid(_tokenId, msg.sender, msg.value);
    }

    /**
     * @notice Inactive function - see `createBid` or
     * `settleAuctionAndCreateBid`
     */
    function purchase(
        uint256 /*_projectId*/
    ) external payable returns (uint256 /*tokenId*/) {
        revert("Inactive function");
    }

    /**
     * @notice Inactive function - see `createBid` or
     * `settleAuctionAndCreateBid`
     */
    function purchaseTo(
        address /*_to*/,
        uint256 /*_projectId*/
    ) external payable returns (uint256 /*tokenId*/) {
        revert("Inactive function");
    }

    /**
     * @notice View function to return the current minter-level configuration
     * details.
     * @return minAuctionDurationSeconds_ Minimum auction duration in seconds
     * @return maxAuctionDurationSeconds_ Maximum auction duration in seconds
     * @return minterMinBidIncrementPercentage_ Minimum bid increment percentage
     * @return minterTimeBufferSeconds_ Buffer time in seconds
     */
    function minterConfigurationDetails()
        external
        view
        returns (
            uint32 minAuctionDurationSeconds_,
            uint32 maxAuctionDurationSeconds_,
            uint8 minterMinBidIncrementPercentage_,
            uint32 minterTimeBufferSeconds_
        )
    {
        minAuctionDurationSeconds_ = minAuctionDurationSeconds;
        maxAuctionDurationSeconds_ = maxAuctionDurationSeconds;
        minterMinBidIncrementPercentage_ = minterMinBidIncrementPercentage;
        minterTimeBufferSeconds_ = minterTimeBufferSeconds;
    }

    /**
     * @notice projectId => has project reached its maximum number of
     * invocations? Note that this returns a local cache of the core contract's
     * state, and may be out of sync with the core contract. This is
     * intentional, as it only enables gas optimization of mints after a
     * project's maximum invocations has been reached. A false negative will
     * only result in a gas cost increase, since the core contract will still
     * enforce a maxInvocation check during minting. A false positive is not
     * possible because the V3 core contract only allows maximum invocations
     * to be reduced, not increased. Based on this rationale, we intentionally
     * do not do input validation in this method as to whether or not the input
     * `_projectId` is an existing project ID.
     *
     */
    function projectMaxHasBeenInvoked(
        uint256 _projectId
    ) external view returns (bool) {
        return projectConfig[_projectId].maxHasBeenInvoked;
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
     * to whether or not the input `_projectId` is an existing project ID.
     */
    function projectMaxInvocations(
        uint256 _projectId
    ) external view returns (uint256) {
        return uint256(projectConfig[_projectId].maxInvocations);
    }

    /**
     * @notice projectId => project configuration details.
     * Note that in the case of no auction being initialized for the project,
     * the returned `auction` will be the default struct.
     * @param _projectId The project ID
     * @return maxInvocations The project's maximum number of invocations
     * allowed on this minter
     * @return timestampStart The project's start timestamp, after which new
     * auctions may be created (one at a time)
     * @return auctionDurationSeconds The project's default auction duration,
     * before any extensions due to buffer time
     * @return basePrice The project's minimum starting bid price
     * @return nextTokenNumberIsPopulated Whether or not the project's next
     * token number has been populated
     * @return nextTokenNumber The project's next token number to be auctioned,
     * dummy value of 0 if `nextTokenNumberIsPopulated` is false
     * @return auction The project's active auction details. Will be the
     * default struct (w/ `auction.initialized = false`) if no auction has been
     * initialized for the project.
     */
    function projectConfigurationDetails(
        uint256 _projectId
    )
        external
        view
        returns (
            uint24 maxInvocations,
            uint64 timestampStart,
            uint32 auctionDurationSeconds,
            uint256 basePrice,
            bool nextTokenNumberIsPopulated,
            uint24 nextTokenNumber,
            Auction memory auction
        )
    {
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        maxInvocations = _projectConfig.maxInvocations;
        timestampStart = _projectConfig.timestampStart;
        auctionDurationSeconds = _projectConfig.auctionDurationSeconds;
        basePrice = _projectConfig.basePrice;
        nextTokenNumberIsPopulated = _projectConfig.nextTokenNumberIsPopulated;
        nextTokenNumber = _projectConfig.nextTokenNumberIsPopulated
            ? _projectConfig.nextTokenNumber
            : 0;
        auction = _projectConfig.activeAuction;
    }

    /**
     * @notice projectId => active auction details.
     * @dev reverts if no auction exists for the project.
     */
    function projectActiveAuctionDetails(
        uint256 _projectId
    ) external view returns (Auction memory auction) {
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        auction = _projectConfig.activeAuction;
        // do not return uninitialized auctions (i.e. auctions that do not
        // exist, and therefore are simply the default struct)
        require(auction.initialized, "No auction exists on project");
        return auction;
    }

    /**
     * @notice Convenience function that returns either the current token ID
     * being auctioned, or the next expected token ID to be auction if no
     * auction is currently initialized or if the current auction has concluded
     * (block.timestamp > auction.endTime).
     * This is intended to be useful for frontends or scripts that intend to
     * call `createBid` or `settleAuctionAndCreateBid`, which requires a
     * target bid token ID to be passed in as an argument.
     * The function reverts if a project does not have an active auction and
     * the next expected token ID has not been populated.
     * @param _projectId The project ID being queried
     * @return The current token ID being auctioned, or the next token ID to be
     * auctioned if a new auction is ready to be created.
     */
    function getTokenToBid(uint256 _projectId) external view returns (uint256) {
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        Auction storage _auction = _projectConfig.activeAuction;
        // if project has an active token auction that is not settled, return
        // that token ID
        if (_auction.initialized && (_auction.endTime > block.timestamp)) {
            return _auction.tokenId;
        }
        // otherwise, return the next expected token ID to be auctioned
        if (!_projectConfig.nextTokenNumberIsPopulated) {
            revert("Next token number not populated");
        }
        // @dev overflow automatically checked in Solidity ^0.8.0
        uint256 nextTokenId = (_projectId * ONE_MILLION) +
            _projectConfig.nextTokenNumber;
        return nextTokenId;
    }

    /**
     * @notice View function that returns the next token ID to be auctioned
     * by this minter for project `_projectId`.
     * Reverts if the next token ID has not been populated for the project.
     * @param _projectId The project ID being queried
     * @return nextTokenId The next token ID to be auctioned by this minter
     */
    function getNextTokenId(
        uint256 _projectId
    ) external view returns (uint256 nextTokenId) {
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        if (!_projectConfig.nextTokenNumberIsPopulated) {
            revert("Next token not populated");
        }
        // @dev overflow automatically checked in Solidity ^0.8.0
        nextTokenId =
            (_projectId * ONE_MILLION) +
            _projectConfig.nextTokenNumber;
        return nextTokenId;
    }

    /**
     * @dev Internal function to initialize an auction for the next token ID
     * on project `_projectId` with a bid of `msg.value` from `msg.sender`.
     * This function reverts in any of the following cases:
     *   - project is not configured on this minter
     *   - project is configured but has not yet reached its start time
     *   - project has a current active auction that is not settled
     *   - insufficient bid amount (msg.value < basePrice)
     *   - no next token has been minted for the project (artist may need to
     *     call `tryPopulateNextToken`)
     *   - `_targetTokenId` does not match the next token ID for the project
     * This function attempts to mint a new token and assign it to the
     * project's next token slot. However, if the project has reached its
     * maximum invocations on either the core contract or minter, this function
     * will not mint a new token, and the next token slot for the project will
     * remain empty.
     * @dev This should be executed in a nonReentrant context to provide redundant
     * protection against reentrancy.
     */
    function _initializeAuctionWithBid(
        uint256 _projectId,
        uint256 _targetTokenId
    ) internal {
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        Auction storage _auction = _projectConfig.activeAuction;
        // CHECKS
        // ensure project auctions are configured
        // @dev base price of zero indicates auctions are not configured
        // because only base price of gt zero is allowed when configuring
        require(_projectConfig.basePrice > 0, "Project not configured");
        // only initialize new auctions if they meet the start time
        // requirement
        require(
            block.timestamp >= _projectConfig.timestampStart,
            "Only gte project start time"
        );
        // the following require statement is redundant based on how this
        // internal function is called, but it is included for protection
        // against future changes that could easily introduce a bug if this
        // check is not present
        require(
            (!_auction.initialized) || _auction.settled,
            "Existing auction not settled"
        );
        // require valid bid value
        require(
            msg.value >= _projectConfig.basePrice,
            "Insufficient initial bid"
        );
        // require next token number is populated, giving intuitive error
        // message if project has reached its max invocations
        if (!_projectConfig.nextTokenNumberIsPopulated) {
            if (_projectConfig.maxHasBeenInvoked) {
                revert("Max invocations reached");
            } else {
                // @dev revert instead of attempting to mint a new next token,
                // because users should only mint a new new token if they
                // are able to know what it is a prori
                // @dev this is an unexpected case, but is included for safety
                revert(
                    "No next token, Artist may need to call `tryPopulateNextToken`"
                );
            }
        }
        // require next token number is the target token ID
        require(
            _projectConfig.nextTokenNumber == _targetTokenId % ONE_MILLION,
            "Incorrect target token ID"
        );

        // EFFECTS
        // create new auction, overwriting previous auction if it exists
        uint64 endTime = (block.timestamp +
            _projectConfig.auctionDurationSeconds).toUint64();
        _projectConfig.activeAuction = Auction({
            tokenId: _targetTokenId,
            currentBid: msg.value,
            currentBidder: payable(msg.sender),
            endTime: endTime,
            settled: false,
            initialized: true
        });
        // mark next token number as not populated
        // @dev intentionally not setting nextTokenNumber to zero to avoid
        // unnecessary gas costs
        _projectConfig.nextTokenNumberIsPopulated = false;

        // @dev we intentionally emit event here due to potential of early
        // return in INTERACTIONS section
        emit AuctionInitialized(_targetTokenId, msg.sender, msg.value, endTime);

        // INTERACTIONS
        // attempt to mint new token to this minter contract, only if max
        // invocations has not been reached
        _tryMintTokenToNextSlot(_projectId);
    }

    /**
     * @notice Internal function that attempts to mint a new token to the next
     * token slot for the project `_projectId`.
     * This function returns early and does not modify state if
     *   - the project has reached its maximum invocations on either the core
     *     contract or minter
     *   - the project config's `nextTokenNumberIsPopulated` is already true
     * @param _projectId The ID of the project to mint a new token for.
     */
    function _tryMintTokenToNextSlot(uint256 _projectId) internal {
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        if (_projectConfig.nextTokenNumberIsPopulated) {
            return;
        }
        // INTERACTIONS
        // attempt to mint new token to this minter contract, only if max
        // invocations has not been reached
        // we require up-to-date invocation data to properly handle last token
        (
            uint256 coreInvocations,
            uint256 coreMaxInvocations,
            ,
            ,
            ,

        ) = genArtCoreContract_Base.projectStateData(_projectId);
        uint256 localMaxInvocations = _projectConfig.maxInvocations;
        uint256 minMaxInvocations = Math.min(
            coreMaxInvocations,
            localMaxInvocations
        );
        if (coreInvocations >= minMaxInvocations) {
            // we have reached the max invocations, so we do not mint a new
            // token as the "next token", and leave the next token number as
            // not populated
            return;
        }
        // @dev this is an effect after a trusted contract interaction
        _projectConfig.nextTokenNumberIsPopulated = true;
        // mint a new token to this project's "next token" slot
        // @dev this is an interaction with a trusted contract
        uint256 nextTokenId = minterFilter.mint(
            address(this),
            _projectId,
            address(this)
        );
        // update state to reflect new token number
        // @dev state changes after trusted contract interaction
        // @dev unchecked is safe because mod 1e6 is guaranteed to be less than
        // max uint24
        unchecked {
            _projectConfig.nextTokenNumber = uint24(nextTokenId % ONE_MILLION);
        }
        // update local maxHasBeenInvoked value if necessary
        uint256 tokenInvocation = (nextTokenId % ONE_MILLION) + 1;
        if (tokenInvocation == localMaxInvocations) {
            _projectConfig.maxHasBeenInvoked = true;
        }
        emit ProjectNextTokenUpdated(_projectId, nextTokenId);
    }

    /**
     * @notice Transfer ETH. If the ETH transfer fails, wrap the ETH and send it as WETH.
     */
    function _safeTransferETHWithFallback(address to, uint256 amount) internal {
        (bool success, ) = to.call{value: amount, gas: 30_000}("");
        if (!success) {
            weth.deposit{value: amount}();
            weth.transfer(to, amount);
        }
    }

    /**
     * @notice Gets price info to become the leading bidder on a token auction.
     * If artist has not called `configureFutureAuctions` and there is no
     * active token auction accepting bids, `isConfigured` will be false, and a
     * dummy price of zero is assigned to `tokenPriceInWei`.
     * If there is an active auction accepting bids, `isConfigured` will be
     * true, and `tokenPriceInWei` will be the sum of the current bid value and
     * the minimum bid increment due to the minter's
     * `minterMinBidIncrementPercentage`.
     * If there is an auction that has ended (no longer accepting bids), but
     * the project is configured, `isConfigured` will be true, and
     * `tokenPriceInWei` will be the minimum initial bid price for the next
     * token auction.
     * Also returns currency symbol and address to be being used as payment,
     * which for this minter is ETH only.
     * @param _projectId Project ID to get price information for.
     * @return isConfigured true only if project auctions are configured.
     * @return tokenPriceInWei price in wei to become the leading bidder on a
     * token auction.
     * @return currencySymbol currency symbol for purchases of project on this
     * minter. This minter always returns "ETH"
     * @return currencyAddress currency address for purchases of project on
     * this minter. This minter always returns null address, reserved for ether
     */
    function getPriceInfo(
        uint256 _projectId
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
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        Auction storage _auction = _projectConfig.activeAuction;
        // base price of zero not allowed when configuring auctions, so use it
        // as indicator of whether auctions are configured for the project
        bool projectIsConfigured = (_projectConfig.basePrice > 0);
        bool auctionIsAcceptingBids = (_auction.initialized &&
            block.timestamp < _auction.endTime);
        isConfigured = projectIsConfigured || auctionIsAcceptingBids;
        // only return non-zero price if auction is configured
        if (isConfigured) {
            if (auctionIsAcceptingBids) {
                // return current bid plus minimum bid increment
                // @dev overflow automatically checked in Solidity ^0.8.0
                tokenPriceInWei =
                    (_auction.currentBid *
                        (100 + minterMinBidIncrementPercentage)) /
                    100;
            } else {
                // return base (starting) price if if current auction is not
                // accepting bids (i.e. the minimum initial bid price for the
                // next token auction)
                tokenPriceInWei = _projectConfig.basePrice;
            }
        }
        // else leave tokenPriceInWei as default value of zero
        currencySymbol = "ETH";
        currencyAddress = address(0);
    }
}
