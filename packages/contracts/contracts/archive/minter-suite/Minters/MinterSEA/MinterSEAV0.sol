// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.19;

import "../../../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import "../../../../interfaces/v0.8.x/IMinterFilterV0.sol";
import "../../../../interfaces/v0.8.x/IFilteredMinterSEAV0.sol";
import "../MinterBase_v0_1_1.sol";

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
 * @notice Bid Front-Running:
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
 * - ejectNextTokenTo
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
    string public constant minterVersion = "v0.0.1";

    uint256 constant ONE_MILLION = 1_000_000;

    mapping(uint256 => ProjectConfig) public projectConfig;

    // minter-wide, admin-configurable parameters
    // ----------------------------------------
    // minimum initial auction length, in seconds; configurable by admin
    // max uint32 ~= 4.3e9 sec ~= 136 years
    // @dev enforced only when artist configures a project
    // @dev default to 10 minutes
    uint32 minAuctionDurationSeconds = 600;
    // maximum initial auction length, in seconds; configurable by admin
    // @dev enforced only when artist configures a project
    // @dev default to 1 month (1/12 of a year)
    uint32 maxAuctionDurationSeconds = 2_629_746;
    // the minimum percent increase for new bids above the current bid
    // configurable by admin
    // max uint8 ~= 255, > 100 percent
    // @dev used when determining the increment percentage for any new bid on
    // the minter, across all projects
    uint8 minterMinBidIncrementPercentage = 5;
    // minimum time remaining in auction after a new bid is placed
    // configurable by admin
    // max uint32 ~= 4.3e9 sec ~= 136 years
    // @dev used when determining the buffer time for any new bid on the
    // minter, across all projects
    uint32 minterTimeBufferSeconds = 120;
    // gas limit for refunding ETH to bidders
    // configurable by admin, default to 30,000
    // max uint16 = 65,535 to ensure bid refund gas limit remains reasonable
    uint16 minterRefundGasLimit = 30_000;

    // modifier-like internal functions
    // @dev we use internal functions instead of modifiers to reduce contract
    // bytecode size
    // ----------------------------------------
    // function to restrict access to only AdminACL allowed calls
    // @dev defers to the ACL contract used on the core contract
    function _onlyCoreAdminACL(bytes4 _selector) internal {
        require(_adminACLAllowed(_selector), "Only Core AdminACL allowed");
    }

    // function to restrict access to only the artist of a project
    function _onlyArtist(uint256 _projectId) internal view {
        require(_senderIsArtist(_projectId), "Only Artist");
    }

    // function to restrict access to only the artist of a project or
    // AdminACL allowed calls
    // @dev defers to the ACL contract used on the core contract
    function _onlyCoreAdminACLOrArtist(
        uint256 _projectId,
        bytes4 _selector
    ) internal {
        require(
            _senderIsArtist(_projectId) || _adminACLAllowed(_selector),
            "Only Artist or Admin ACL"
        );
    }

    // function to require that a value is non-zero
    function _onlyNonZero(uint256 _value) internal pure {
        require(_value != 0, "Only non-zero");
    }

    /**
     * @notice Initializes contract to be a Filtered Minter for
     * `_minterFilter`, integrated with Art Blocks core contract
     * at address `_genArt721Address`.
     * @param _genArt721Address Art Blocks core contract address for
     * which this contract will be a minter.
     * @param _minterFilter Minter filter for which
     * this will a filtered minter.
     * payment method when ETH transfers are failing during bidding process
     */
    constructor(
        address _genArt721Address,
        address _minterFilter
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
        // emit events indicating default minter configuration values
        emit AuctionDurationSecondsRangeUpdated({
            minAuctionDurationSeconds: minAuctionDurationSeconds,
            maxAuctionDurationSeconds: maxAuctionDurationSeconds
        });
        emit MinterMinBidIncrementPercentageUpdated(
            minterMinBidIncrementPercentage
        );
        emit MinterTimeBufferUpdated(minterTimeBufferSeconds);
        emit MinterRefundGasLimitUpdated(minterRefundGasLimit);
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

        emit ProjectMaxInvocationsLimitUpdated({
            _projectId: _projectId,
            _maxInvocations: maxInvocations
        });

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

        emit ProjectMaxInvocationsLimitUpdated({
            _projectId: _projectId,
            _maxInvocations: _maxInvocations
        });

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
        _onlyNonZero(_minAuctionDurationSeconds);
        _onlyCoreAdminACL(this.updateAllowableAuctionDurationSeconds.selector);
        // CHECKS
        require(
            _maxAuctionDurationSeconds > _minAuctionDurationSeconds,
            "Only max gt min"
        );
        // EFFECTS
        minAuctionDurationSeconds = _minAuctionDurationSeconds;
        maxAuctionDurationSeconds = _maxAuctionDurationSeconds;
        emit AuctionDurationSecondsRangeUpdated({
            minAuctionDurationSeconds: _minAuctionDurationSeconds,
            maxAuctionDurationSeconds: _maxAuctionDurationSeconds
        });
    }

    /**
     * @notice Sets the minter-wide minimum bid increment percentage. New bids
     * must be this percent higher than the current top bid to be successful.
     * This value should be configured by admin such that appropriate price
     * discovery is able to be reached, but gas fees associated with bidding
     * wars do not dominate the economics of an auction.
     * @dev the input value is considered to be a percentage, so that a value
     * of 5 represents 5%.
     * @param _minterMinBidIncrementPercentage Minimum bid increment percentage
     */
    function updateMinterMinBidIncrementPercentage(
        uint8 _minterMinBidIncrementPercentage
    ) external {
        _onlyNonZero(_minterMinBidIncrementPercentage);
        _onlyCoreAdminACL(this.updateMinterMinBidIncrementPercentage.selector);
        // CHECKS
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
     * @param _minterTimeBufferSeconds Time buffer in seconds.
     */
    function updateMinterTimeBufferSeconds(
        uint32 _minterTimeBufferSeconds
    ) external {
        _onlyNonZero(_minterTimeBufferSeconds);
        _onlyCoreAdminACL(this.updateMinterTimeBufferSeconds.selector);
        // CHECKS
        // EFFECTS
        minterTimeBufferSeconds = _minterTimeBufferSeconds;
        emit MinterTimeBufferUpdated(_minterTimeBufferSeconds);
    }

    /**
     * @notice Sets the gas limit during ETH refunds when a collector is
     * outbid. This value should be set to a value that is high enough to
     * ensure that refunds are successful for commonly used wallets, but low
     * enough to avoid excessive abuse of refund gas allowance during a new
     * bid.
     * @dev max gas limit is 63,535, which is considered a future-safe upper
     * bound.
     * @param _minterRefundGasLimit Gas limit to set for refunds. Must be between
     * 5,000 and max uint16 (63,535).
     */
    function updateRefundGasLimit(uint16 _minterRefundGasLimit) external {
        _onlyCoreAdminACL(this.updateRefundGasLimit.selector);
        // CHECKS
        // @dev max gas limit implicitly checked by using uint16 input arg
        // @dev min gas limit is based on rounding up current cost to send ETH
        // to a Gnosis Safe wallet, which accesses cold address and emits event
        require(_minterRefundGasLimit >= 7_000, "Only gte 7_000");
        // EFFECTS
        minterRefundGasLimit = _minterRefundGasLimit;
        emit MinterRefundGasLimitUpdated(_minterRefundGasLimit);
    }

    /**
     * @notice Warning: Disabling purchaseTo is not supported on this minter.
     * This method exists purely for interface-conformance purposes.
     */
    function togglePurchaseToDisabled(uint256 /*_projectId*/) external pure {
        // @dev access control to _onlyArtist is required if this method is
        // ever re-implemented
        revert("Action not supported");
    }

    /**
     * @notice Sets auction details for project `_projectId`.
     * If project does not have a "next token" assigned, this function attempts
     * to mint a token and assign it to the project's next token slot.
     * @param _projectId Project ID to set future auction details for.
     * @param _timestampStart Timestamp after which new auctions may be
     * started. Note that this is not the timestamp of the auction start, but
     * rather the timestamp after which an auction may be started. Also note
     * that the passed value here must either be in the future, or `0` (which
     * indicates that auctions are immediately startable).
     * @param _auctionDurationSeconds Duration of new auctions, in seconds,
     * before any extensions due to bids being placed inside buffer period near
     * the end of an auction.
     * @param _basePrice reserve price (minimum starting bid price), in wei.
     * Must be greater than 0, but may be as low as 1 wei.
     * @dev `_basePrice` of zero not allowed to prevent accidental
     * misconfiguration of auctions
     */
    function configureFutureAuctions(
        uint256 _projectId,
        uint256 _timestampStart,
        uint256 _auctionDurationSeconds,
        uint256 _basePrice
    ) external {
        _onlyNonZero(_basePrice);
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
        // EFFECTS
        _projectConfig.timestampStart = _timestampStart.toUint64();
        _projectConfig.auctionDurationSeconds = _auctionDurationSeconds
            .toUint32();
        _projectConfig.basePrice = _basePrice;

        emit ConfiguredFutureAuctions({
            projectId: _projectId,
            timestampStart: _timestampStart.toUint64(),
            auctionDurationSeconds: _auctionDurationSeconds.toUint32(),
            basePrice: _basePrice
        });

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
     * @notice Admin-only function that ejects a project's "next token" from
     * the minter and sends it to the input `_to` address.
     * This function is only intended for use in the edge case where the minter
     * has a "next token" assigned to a project, but the project has been reset
     * via `resetAuctionDetails`, and the artist does not want an auction to be
     * started for the "next token". This function also protects against the
     * unforeseen case where the minter is in an unexpected state where it has a
     * "next token" assigned to a project, but for some reason the project is
     * unable to begin a new auction due to a bug.
     * @dev only a single token may be actively assigned to a project's "next
     * token" slot at any given time. This function will eject the token, and
     * no further tokens will be assigned to the project's "next token" slot,
     * unless the project is subsequently reconfigured via an artist call to
     * `configureFutureAuctions`.
     * @param _projectId Project ID to eject next token for.
     * @param _to Address to send the ejected token to.
     */
    function ejectNextTokenTo(uint256 _projectId, address _to) external {
        _onlyCoreAdminACL(this.ejectNextTokenTo.selector);
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        // CHECKS
        // only if project is not configured (i.e. artist called
        // `resetAuctionDetails`)
        require(
            !_projectIsConfigured(_projectConfig),
            "Only unconfigured projects"
        );
        // only if minter has a next token assigned
        require(
            _projectConfig.nextTokenNumberIsPopulated == true,
            "No next token"
        );
        // EFFECTS
        _projectConfig.nextTokenNumberIsPopulated = false;
        // INTERACTIONS
        // @dev overflow automatically handled by Sol ^0.8.0
        uint256 nextTokenId = (_projectId * ONE_MILLION) +
            _projectConfig.nextTokenNumber;
        IERC721(genArt721CoreAddress).transferFrom({
            from: address(this),
            to: _to,
            tokenId: nextTokenId
        });
        emit ProjectNextTokenEjected(_projectId);
    }

    /**
     * @notice Emergency, Artist-only function that attempts to mint a new
     * token and set it as the next token to be auctioned for project
     * `_projectId`.
     * Note: This function is only included for emergency, unforeseen use cases,
     * and should not be used in normal operation. It is here only for
     * redundant protection against an unforeseen edge case where the minter
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
            _projectIsConfigured(projectConfig[_projectId]),
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
     * Note that the use of `_bidTokenId` is to prevent the possibility of
     * transactions that are stuck in the pending pool for long periods of time
     * from unintentionally bidding on auctions for future tokens.
     * Note that calls to `settleAuction` and `createBid` are possible
     * to be called in separate transactions, but this function is provided for
     * convenience and executes both of those functions in a single
     * transaction, while handling front-running as gracefully as possible.
     * @param _settleTokenId Token ID to settle auction for.
     * @param _bidTokenId Token ID to bid on.
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
     * Returns early (does not modify state) if
     *   - there is no initialized auction for the project
     *   - there is an auction that has already been settled for the project
     *   - there is an auction for a different token ID on the project
     *     (likely due to a front-run)
     * This function reverts if the auction for `_tokenId` exists, but has not
     * yet ended.
     * @param _tokenId Token ID to settle auction for.
     */
    function settleAuction(uint256 _tokenId) public nonReentrant {
        uint256 _projectId = _tokenId / ONE_MILLION;
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        Auction storage _auction = _projectConfig.activeAuction;
        // load from storage to memory for gas efficiency
        address currentBidder = _auction.currentBidder;
        uint256 currentBid = _auction.currentBid;
        address genArt721CoreAddress_ = genArt721CoreAddress;
        // CHECKS
        // @dev this check is not strictly necessary, but is included for
        // clear error messaging
        require(_auctionIsInitialized(_auction), "Auction not initialized");
        if (_auction.settled || (_auction.tokenId != _tokenId)) {
            // auction already settled or is for a different token ID, so
            // return early and do not modify state
            return;
        }
        // @dev important that the following check is after the early return
        // block above to maintain desired behavior
        require(block.timestamp >= _auction.endTime, "Auction not yet ended");
        // EFFECTS
        _auction.settled = true;
        // INTERACTIONS
        // send token to the winning bidder
        IERC721(genArt721CoreAddress_).transferFrom({
            from: address(this),
            to: currentBidder,
            tokenId: _tokenId
        });
        // distribute revenues from auction
        splitRevenuesETH(_projectId, currentBid, genArt721CoreAddress_);

        emit AuctionSettled({
            tokenId: _tokenId,
            winner: currentBidder,
            price: currentBid
        });
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
     * SELFDESTRUCT (SENDALL) prevents denial of service attacks, even if the
     * original bidder reverts or runs out of gas during receive or fallback.
     * ------------------------------------------------------------------------
     * WARNING: bidders must be prepared to handle the case where their bid is
     * outbid and their funds are returned to the original `msg.sender` address
     * via SELFDESTRUCT (SENDALL).
     * ------------------------------------------------------------------------
     * Note that the use of `_tokenId` is to prevent the possibility of
     * transactions that are stuck in the pending pool for long periods of time
     * from unintentionally bidding on auctions for future tokens.
     * If a new auction is initialized during this call, the project's next
     * token will be attempted to be minted to this minter contract, preparing
     * it for the next auction. If the project's next token cannot be minted
     * due to e.g. reaching the maximum invocations on the core contract or
     * minter, the project's next token will not be minted.
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
        // load from storage to memory for gas efficiency
        uint256 auctionEndTime = _auction.endTime;
        uint256 previousBid = _auction.currentBid;

        // if no auction exists, or current auction is already settled, attempt
        // to initialize a new auction for the input token ID and immediately
        // return
        if ((!_auctionIsInitialized(_auction)) || _auction.settled) {
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
        require(auctionEndTime > block.timestamp, "Auction already ended");

        // require bid to be sufficiently greater than current highest bid
        // @dev no overflow enforced automatically by solidity ^0.8.0
        require(
            msg.value >=
                (previousBid * (100 + minterMinBidIncrementPercentage)) / 100,
            "Bid is too low"
        );

        // EFFECTS
        // record previous highest bider for refunding
        address payable previousBidder = _auction.currentBidder;

        // update auction state
        _auction.currentBid = msg.value;
        _auction.currentBidder = payable(msg.sender);
        uint256 minEndTime = block.timestamp + minterTimeBufferSeconds;
        if (auctionEndTime < minEndTime) {
            _auction.endTime = minEndTime.toUint64();
        }

        // INTERACTIONS
        // refund previous highest bidder
        _forceSafeTransferETH(previousBidder, previousBid);

        emit AuctionBid({
            tokenId: _tokenId,
            bidder: msg.sender,
            bidAmount: msg.value
        });
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
     * @return minterRefundGasLimit_ Gas limit for refunding ETH
     */
    function minterConfigurationDetails()
        external
        view
        returns (
            uint32 minAuctionDurationSeconds_,
            uint32 maxAuctionDurationSeconds_,
            uint8 minterMinBidIncrementPercentage_,
            uint32 minterTimeBufferSeconds_,
            uint16 minterRefundGasLimit_
        )
    {
        minAuctionDurationSeconds_ = minAuctionDurationSeconds;
        maxAuctionDurationSeconds_ = maxAuctionDurationSeconds;
        minterMinBidIncrementPercentage_ = minterMinBidIncrementPercentage;
        minterTimeBufferSeconds_ = minterTimeBufferSeconds;
        minterRefundGasLimit_ = minterRefundGasLimit;
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
     * @return projectConfig_ The project configuration details
     */
    function projectConfigurationDetails(
        uint256 _projectId
    ) external view returns (ProjectConfig memory projectConfig_) {
        projectConfig_ = projectConfig[_projectId];
        // clean up next token number to handle case where it is stale
        projectConfig_.nextTokenNumber = projectConfig_
            .nextTokenNumberIsPopulated
            ? projectConfig_.nextTokenNumber
            : 0;
    }

    /**
     * @notice projectId => active auction details.
     * @dev reverts if no auction exists for the project.
     */
    function projectActiveAuctionDetails(
        uint256 _projectId
    ) external view returns (Auction memory auction) {
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        Auction storage _auction = _projectConfig.activeAuction;
        // do not return uninitialized auctions (i.e. auctions that do not
        // exist, where currentBidder is still the default value)
        require(
            _auctionIsInitialized(_auction),
            "No auction exists on project"
        );
        // load entire auction into memory
        auction = _projectConfig.activeAuction;
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
        if (
            _auctionIsInitialized(_auction) &&
            (_auction.endTime > block.timestamp)
        ) {
            return _auction.tokenId;
        }
        // otherwise, return the next expected token ID to be auctioned
        return getNextTokenId(_projectId);
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
    ) public view returns (uint256 nextTokenId) {
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
     * After initializing a new auction, this function attempts to mint a new
     * token and assign it to the project's next token slot, in preparation for
     * a future token auction. However, if the project has reached its maximum
     * invocations on either the core contract or minter, the next token slot
     * for the project will remain empty.
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
        require(_projectIsConfigured(_projectConfig), "Project not configured");
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
        // @dev no cover else branch of next line because unreachable
        require(
            (!_auctionIsInitialized(_auction)) || _auction.settled,
            "Existing auction not settled"
        );
        // require valid bid value
        require(
            msg.value >= _projectConfig.basePrice,
            "Insufficient initial bid"
        );
        // require next token number is populated
        // @dev this should only be encountered if the project has reached
        // its maximum invocations on either the core contract or minter
        require(
            _projectConfig.nextTokenNumberIsPopulated,
            "No next token, check max invocations"
        );
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
            settled: false
        });
        // mark next token number as not populated
        // @dev intentionally not setting nextTokenNumber to zero to avoid
        // unnecessary gas costs
        _projectConfig.nextTokenNumberIsPopulated = false;

        // @dev we intentionally emit event here due to potential of early
        // return in INTERACTIONS section
        emit AuctionInitialized({
            tokenId: _targetTokenId,
            bidder: msg.sender,
            bidAmount: msg.value,
            endTime: endTime
        });

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
     * @dev this calls mint with `msg.sender` as the sender, allowing artists
     * to mint tokens to the next token slot for their project while a project
     * is still paused. This happens when an artist is configuring their
     * project's auction parameters or minter max invocations.
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
            msg.sender
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
        emit ProjectNextTokenUpdated({
            projectId: _projectId,
            tokenId: nextTokenId
        });
    }

    /**
     * @notice Force sends `amount` (in wei) ETH to `to`, with a gas stipend
     * equal to `minterRefundGasLimit`.
     * If sending via the normal procedure fails, force sends the ETH by
     * creating a temporary contract which uses `SELFDESTRUCT` to force send
     * the ETH.
     * Reverts if the current contract has insufficient balance.
     * @param _to The address to send ETH to.
     * @param _amount The amount of ETH to send.
     * @dev This function is adapted from the `forceSafeTransferETH` function
     * in the `https://github.com/Vectorized/solady` repository, with
     * modifications to not check if the current contract has sufficient
     * balance.
     */
    function _forceSafeTransferETH(address _to, uint256 _amount) internal {
        // load state variable into memory for use in inline assembly
        uint256 minterRefundGasLimit_ = minterRefundGasLimit;
        // Manually inlined because the compiler doesn't inline functions with
        // branches.
        /// @solidity memory-safe-assembly
        assembly {
            // @dev intentionally do not check if this contract has sufficient
            // balance, because that is not intended to be a valid state.

            // Transfer the ETH and check if it succeeded or not.
            if iszero(call(minterRefundGasLimit_, _to, _amount, 0, 0, 0, 0)) {
                // if the transfer failed, we create a temporary contract with
                // initialization code that uses `SELFDESTRUCT` to force send
                // the ETH.
                // note: Compatible with `SENDALL`:
                // https://eips.ethereum.org/EIPS/eip-4758

                //---------------------------------------------------------------------------------------------------------------//
                // Opcode  | Opcode + Arguments  | Description        | Stack View                                               //
                //---------------------------------------------------------------------------------------------------------------//
                // Contract creation code that uses `SELFDESTRUCT` to force send ETH to a specified address.                     //
                // Creation code summary: 0x73<20-byte toAddress>0xff                                                            //
                //---------------------------------------------------------------------------------------------------------------//
                // 0x73    |  0x73_toAddress     | PUSH20 toAddress   | toAddress                                                //
                // 0xFF    |  0xFF               | SELFDESTRUCT       |                                                          //
                //---------------------------------------------------------------------------------------------------------------//
                // Store the address in scratch space, starting at 0x00, which begins the 20-byte address at 32-20=12 in memory
                // @dev use scratch space because we have enough space for simple creation code (less than 0x40 bytes)
                mstore(0x00, _to)
                // store opcode PUSH20 immediately before the address, starting at 0x0b (11) in memory
                mstore8(0x0b, 0x73)
                // store opcode SELFDESTRUCT immediately after the address, starting at 0x20 (32) in memory
                mstore8(0x20, 0xff)
                // this will always succeed because the contract creation code is
                // valid, and the address is valid because it is a 20-byte value
                if iszero(create(_amount, 0x0b, 0x16)) {
                    // @dev For better gas estimation.
                    if iszero(gt(gas(), 1000000)) {
                        revert(0, 0)
                    }
                }
            }
        }
    }

    /**
     * @notice Determines if a project is configured or not on this minter.
     * Uses project config's `auctionDurationSeconds` to determine if project
     * is configured, because `auctionDurationSeconds` is required to be
     * non-zero when configured.
     * @param _projectConfig The project config to check.
     */
    function _projectIsConfigured(
        ProjectConfig storage _projectConfig
    ) internal view returns (bool) {
        return _projectConfig.auctionDurationSeconds != 0;
    }

    /**
     * @notice Determines if an auction is initialized.
     * Uses auction's `currentBidder` address to determine if auction is
     * initialized, because `currentBidder` is always non-zero after an auction
     * has been initialized.
     * @param _auction The auction to check.
     */
    function _auctionIsInitialized(
        Auction storage _auction
    ) internal view returns (bool isInitialized) {
        // auction is initialized if currentBidder is non-zero
        return _auction.currentBidder != address(0);
    }

    function _senderIsArtist(
        uint256 _projectId
    ) private view returns (bool senderIsArtist) {
        return
            msg.sender ==
            genArtCoreContract_Base.projectIdToArtistAddress(_projectId);
    }

    function _adminACLAllowed(bytes4 _selector) private returns (bool) {
        return
            genArtCoreContract_Base.adminACLAllowed({
                _sender: msg.sender,
                _contract: address(this),
                _selector: _selector
            });
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
        bool projectIsConfigured = _projectIsConfigured(_projectConfig);
        bool auctionIsAcceptingBids = (_auctionIsInitialized(_auction) &&
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
