// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.19;

import {ISharedMinterV0} from "../../interfaces/v0.8.x/ISharedMinterV0.sol";
import {ISharedMinterSEAV0} from "../../interfaces/v0.8.x/ISharedMinterSEAV0.sol";
import {IMinterFilterV1} from "../../interfaces/v0.8.x/IMinterFilterV1.sol";

import {ABHelpers} from "../../libs/v0.8.x/ABHelpers.sol";
import {AuthLib} from "../../libs/v0.8.x/AuthLib.sol";
import {SEALib} from "../../libs/v0.8.x/minter-libs/SEALib.sol";
import {SplitFundsLib} from "../../libs/v0.8.x/minter-libs/SplitFundsLib.sol";
import {MaxInvocationsLib} from "../../libs/v0.8.x/minter-libs/MaxInvocationsLib.sol";

import {ReentrancyGuard} from "@openzeppelin-4.7/contracts/security/ReentrancyGuard.sol";
import {SafeCast} from "@openzeppelin-4.7/contracts/utils/math/SafeCast.sol";
import {Math} from "@openzeppelin-4.7/contracts/utils/math/Math.sol";

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
 * - ejectNextTokenTo
 * ----------------------------------------------------------------------------
 * The following functions are restricted to this minter's minter filter's
 * Admin ACL contract:
 * - updateMinterTimeBufferSeconds
 * - updateRefundGasLimit
 * ----------------------------------------------------------------------------
 * The following functions are restricted to a project's artist:
 * - syncProjectMaxInvocationsToCore
 * - manuallyLimitProjectMaxInvocations
 * - configureFutureAuctions
 * - tryPopulateNextToken
 * ----------------------------------------------------------------------------
 * The following functions are restricted to a project's artist or the core
 * contract's Admin ACL contract:
 * - resetFutureAuctionDetails
 * ----------------------------------------------------------------------------
 * Additional admin and artist privileged roles may be described on other
 * contracts that this minter integrates with.
 * ----------------------------------------------------------------------------
 * @notice Caution: While Engine projects must be registered on the Art Blocks
 * Core Registry to assign this minter, this minter does not enforce that a
 * project is registered when configured or queried. This is primarily for gas
 * optimization purposes. It is, therefore, possible that fake projects may be
 * configured on this minter, but they will not be able to mint tokens due to
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
contract MinterSEAV1 is ReentrancyGuard, ISharedMinterV0, ISharedMinterSEAV0 {
    using SafeCast for uint256;

    /// Minter filter address this minter interacts with
    address public immutable minterFilterAddress;

    /// Minter filter this minter may interact with.
    IMinterFilterV1 private immutable minterFilter;

    /// minterType for this minter
    string public constant minterType = "MinterSEAV1";

    /// minter version for this minter
    string public constant minterVersion = "v1.0.0";

    uint256 public constant MIN_AUCTION_DURATION_SECONDS = 60; // seconds

    // minter-wide, AdminACL-configurable parameters, where AdminACL is the
    // admin of this minter's MinterFilter.
    // ----------------------------------------
    // minimum time remaining in auction after a new bid is placed
    // configureable by admin, default to 120 seconds
    // max uint32 ~= 4.3e9 sec ~= 136 years
    // @dev used when determining the buffer time for any new bid on the
    // minter, across all projects
    uint32 minterTimeBufferSeconds = 120;
    // gas limit for refunding ETH to bidders
    // configurable by admin, default to 30,000
    // max uint24 ~= 16 million gas, more than enough for a refund
    // @dev SENDALL fallback is used to refund ETH if this limit is exceeded
    uint24 minterRefundGasLimit = 30_000;

    // MODIFIERS
    // @dev contract uses modifier-like internal functions instead of modifiers
    // to reduce contract bytecode size
    // @dev contract uses AuthLib for some modifier-like functions

    // function to require that a value is non-zero
    function _onlyNonZero(uint256 _value) internal pure {
        require(_value != 0, "Only non-zero");
    }

    /**
     * @notice Initializes contract to be a shared, filtered minter for
     * minter filter `_minterFilter`
     * @param _minterFilter Minter filter for which this will be a minter
     */
    constructor(address _minterFilter) ReentrancyGuard() {
        minterFilterAddress = _minterFilter;
        minterFilter = IMinterFilterV1(_minterFilter);
        // emit events indicating default minter configuration values
        emit SEALib.MinAuctionDurationSecondsUpdated(
            MIN_AUCTION_DURATION_SECONDS
        );
        emit SEALib.MinterTimeBufferUpdated(minterTimeBufferSeconds);
        emit SEALib.MinterRefundGasLimitUpdated(minterRefundGasLimit);
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
     * @param _coreContract Core contract address for the given project.
     * @param _maxInvocations Maximum invocations to set for the project.
     */
    function manuallyLimitProjectMaxInvocations(
        uint256 _projectId,
        address _coreContract,
        uint24 _maxInvocations
    ) external {
        AuthLib.onlyArtist({
            _projectId: _projectId,
            _coreContract: _coreContract,
            _sender: msg.sender
        });
        MaxInvocationsLib.manuallyLimitProjectMaxInvocations(
            _projectId,
            _coreContract,
            _maxInvocations
        );

        // @dev the following is unique behavior to this minter
        // for convenience, try to mint and assign a token to the project's
        // next slot
        SEALib.tryMintTokenToNextSlot({
            _projectId: _projectId,
            _coreContract: _coreContract,
            _minterFilter: minterFilter
        });
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
        // CHECKS
        _onlyNonZero(_minterTimeBufferSeconds);
        AuthLib.onlyMinterFilterAdminACL({
            _minterFilterAddress: minterFilterAddress,
            _sender: msg.sender,
            _contract: address(this),
            _selector: this.updateMinterTimeBufferSeconds.selector
        });
        // EFFECTS
        minterTimeBufferSeconds = _minterTimeBufferSeconds;
        emit SEALib.MinterTimeBufferUpdated(_minterTimeBufferSeconds);
    }

    /**
     * @notice Sets the gas limit during ETH refunds when a collector is
     * outbid. This value should be set to a value that is high enough to
     * ensure that refunds are successful for commonly used wallets, but low
     * enough to avoid excessive abuse of refund gas allowance during a new
     * bid.
     * @dev max gas limit is ~16M, which is considered well over a future-safe
     * upper bound.
     * @param _minterRefundGasLimit Gas limit to set for refunds. Must be
     * between 7,000 and max uint24 (~16M).
     */
    function updateRefundGasLimit(uint24 _minterRefundGasLimit) external {
        // CHECKS
        AuthLib.onlyMinterFilterAdminACL({
            _minterFilterAddress: minterFilterAddress,
            _sender: msg.sender,
            _contract: address(this),
            _selector: this.updateRefundGasLimit.selector
        });
        // @dev max gas limit implicitly checked by using uint16 input arg
        // @dev min gas limit is based on rounding up current cost to send ETH
        // to a Gnosis Safe wallet, which accesses cold address and emits event
        require(_minterRefundGasLimit >= 7_000, "Only gte 7_000");
        // EFFECTS
        minterRefundGasLimit = _minterRefundGasLimit;
        emit SEALib.MinterRefundGasLimitUpdated(_minterRefundGasLimit);
    }

    /**
     * @notice Sets auction details for project `_projectId`.
     * If project does not have a "next token" assigned, this function attempts
     * to mint a token and assign it to the project's next token slot.
     * @param _projectId Project ID to set future auction details for.
     * @param _coreContract Core contract address for the given project.
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
     * @param _minBidIncrementPercentage Minimum percentage amount that a new
     * bid must be over the previous bid. Must be greater than 0, and may be as
     * high as 255. Recommended value is 5%. Values represent whole
     * percentages, so a value of 5 represents 5%.
     * @dev `_basePrice` of zero not allowed to prevent accidental
     * misconfiguration of auctions
     */
    function configureFutureAuctions(
        uint256 _projectId,
        address _coreContract,
        uint256 _timestampStart,
        uint256 _auctionDurationSeconds,
        uint256 _basePrice,
        uint8 _minBidIncrementPercentage
    ) external {
        // CHECKS
        _onlyNonZero(_basePrice);
        _onlyNonZero(_minBidIncrementPercentage);
        AuthLib.onlyArtist({
            _projectId: _projectId,
            _coreContract: _coreContract,
            _sender: msg.sender
        });
        require(
            _auctionDurationSeconds >= MIN_AUCTION_DURATION_SECONDS,
            "Auction duration below minimum"
        );
        SEALib.configureFutureAuctions({
            _projectId: _projectId,
            _coreContract: _coreContract,
            _timestampStart: _timestampStart,
            _auctionDurationSeconds: _auctionDurationSeconds,
            _basePrice: _basePrice,
            _minBidIncrementPercentage: _minBidIncrementPercentage
        });

        // for convenience, sync local max invocations to the core contract if
        // and only if max invocations have not already been synced.
        // @dev do not sync if max invocations have already been synced, as
        // local max invocations could have been manually set to be
        // intentionally less than the core contract's max invocations.
        // sync local max invocations if not initially populated
        if (
            MaxInvocationsLib.maxInvocationsIsUnconfigured(
                _projectId,
                _coreContract
            )
        ) {
            syncProjectMaxInvocationsToCore(_projectId, _coreContract);
            // @dev syncProjectMaxInvocationsToCore function calls
            // SEALib.tryMintTokenToNextSlot, so we do not call it here.
        } else {
            // for convenience, try to mint to next token slot
            SEALib.tryMintTokenToNextSlot({
                _projectId: _projectId,
                _coreContract: _coreContract,
                _minterFilter: minterFilter
            });
        }
    }

    /**
     * @notice Resets future auction configuration for project `_projectId` on
     * core contract `_coreContract`, zero-ing out all details having to do
     * with future auction parameters.
     * This is not intended to be used in normal operation, but rather only in
     * case of the need to halt the creation of any future auctions.
     * Does not affect any project max invocation details.
     * Does not affect any project next token details (i.e. if a next token is
     * assigned, it will remain assigned and held by the minter until auction
     * details are reconfigured).
     * @param _projectId Project ID to reset future auction configuration
     * details for.
     * @param _coreContract Core contract address for the given project.
     */
    function resetFutureAuctionDetails(
        uint256 _projectId,
        address _coreContract
    ) external {
        AuthLib.onlyCoreAdminACLOrArtist({
            _projectId: _projectId,
            _coreContract: _coreContract,
            _sender: msg.sender,
            _contract: address(this),
            _selector: this.resetFutureAuctionDetails.selector
        });
        // reset to initial values
        SEALib.resetFutureAuctionDetails({
            _projectId: _projectId,
            _coreContract: _coreContract
        });
        // @dev do not affect next token or max invocations
    }

    /**
     * @notice Admin-only function that ejects a project's "next token" from
     * the minter and sends it to the input `_to` address.
     * This function is only intended for use in the edge case where the minter
     * has a "next token" assigned to a project, but the project has been reset
     * via `resetAuctionDetails`, and the artist does not want an auction to be
     * started for the "next token". This function also protects against the
     * unforseen case where the minter is in an unexpected state where it has a
     * "next token" assigned to a project, but for some reason the project is
     * unable to begin a new auction due to a bug.
     * @dev only a single token may be actively assigned to a project's "next
     * token" slot at any given time. This function will eject the token, and
     * no further tokens will be assigned to the project's "next token" slot,
     * unless the project is subsequently reconfigured via an artist call to
     * `configureFutureAuctions`.
     * @param _projectId Project ID to eject next token for.
     * @param _coreContract Core contract address for the given project.
     * @param _to Address to send the ejected token to.
     */
    function ejectNextTokenTo(
        uint256 _projectId,
        address _coreContract,
        address _to
    ) external {
        AuthLib.onlyCoreAdminACL({
            _coreContract: _coreContract,
            _sender: msg.sender,
            _contract: address(this),
            _selector: this.ejectNextTokenTo.selector
        });
        SEALib.ejectNextTokenTo({
            _projectId: _projectId,
            _coreContract: _coreContract,
            _to: _to
        });
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
     * @param _coreContract Core contract address for the given project.
     * @dev this function is not non-reentrant, but the underlying calls are
     * to non-reentrant functions.
     */
    function settleAuctionAndCreateBid(
        uint256 _settleTokenId,
        uint256 _bidTokenId,
        address _coreContract
    ) external payable {
        // ensure tokens are in the same project
        require(
            ABHelpers.tokenIdToProjectId(_settleTokenId) ==
                ABHelpers.tokenIdToProjectId(_bidTokenId),
            "Only tokens in same project"
        );
        // settle completed auction, if applicable
        settleAuction(_settleTokenId, _coreContract);
        // attempt to bid on next token
        createBid(_bidTokenId, _coreContract);
    }

    /**
     * @notice View function to return the current minter-level configuration
     * details.
     * @return minAuctionDurationSeconds_ Minimum auction duration in seconds.
     * Note that this value is a constant on this version of the minter.
     * @return minterTimeBufferSeconds_ Buffer time in seconds
     * @return minterRefundGasLimit_ Gas limit for refunding ETH
     */
    function minterConfigurationDetails()
        external
        view
        returns (
            uint256 minAuctionDurationSeconds_,
            uint32 minterTimeBufferSeconds_,
            uint24 minterRefundGasLimit_
        )
    {
        minAuctionDurationSeconds_ = MIN_AUCTION_DURATION_SECONDS;
        minterTimeBufferSeconds_ = minterTimeBufferSeconds;
        minterRefundGasLimit_ = minterRefundGasLimit;
    }

    /**
     * @notice Gets the maximum invocations project configuration.
     * @param _projectId The ID of the project whose data needs to be fetched.
     * @param _coreContract The address of the core contract.
     * @return MaxInvocationsLib.MaxInvocationsProjectConfig instance with the
     * configuration data.
     */
    function maxInvocationsProjectConfig(
        uint256 _projectId,
        address _coreContract
    )
        external
        view
        returns (MaxInvocationsLib.MaxInvocationsProjectConfig memory)
    {
        return
            MaxInvocationsLib.getMaxInvocationsProjectConfig(
                _projectId,
                _coreContract
            );
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
     * @param `_projectId` is an existing project ID.
     * @param `_coreContract` is an existing core contract address.
     */
    function projectMaxHasBeenInvoked(
        uint256 _projectId,
        address _coreContract
    ) external view returns (bool) {
        return
            MaxInvocationsLib.getMaxHasBeenInvoked(_projectId, _coreContract);
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
     * @param `_projectId` is an existing project ID.
     * @param `_coreContract` is an existing core contract address.
     */
    function projectMaxInvocations(
        uint256 _projectId,
        address _coreContract
    ) external view returns (uint256) {
        return MaxInvocationsLib.getMaxInvocations(_projectId, _coreContract);
    }

    /**
     * @notice Checks if the specified `_coreContract` is a valid engine contract.
     * @dev This function retrieves the cached value of `_isEngine` from
     * the `isEngineCache` mapping. If the cached value is already set, it
     * returns the cached value. Otherwise, it calls the `getV3CoreIsEngine`
     * function from the `SplitFundsLib` library to check if `_coreContract`
     * is a valid engine contract.
     * @dev This function will revert if the provided `_coreContract` is not
     * a valid Engine or V3 Flagship contract.
     * @param _coreContract The address of the contract to check.
     * @return bool indicating if `_coreContract` is a valid engine contract.
     */
    function isEngineView(address _coreContract) external view returns (bool) {
        SplitFundsLib.IsEngineCache storage isEngineCache = SplitFundsLib
            .getIsEngineCacheConfig(_coreContract);
        if (isEngineCache.isCached) {
            return isEngineCache.isEngine;
        } else {
            // @dev this calls the non-modifying variant of getV3CoreIsEngine
            return SplitFundsLib.getV3CoreIsEngineView(_coreContract);
        }
    }

    /**
     * @notice projectId => SEA project configuration details.
     * Note that in the case of no auction being initialized for the project,
     * the returned `auction` will be the default struct.
     * @param _projectId The project ID
     * @param _coreContract The core contract address
     * @return SEAProjectConfig_ The SEA project configuration details
     */
    function SEAProjectConfigurationDetails(
        uint256 _projectId,
        address _coreContract
    ) external view returns (SEALib.SEAProjectConfig memory SEAProjectConfig_) {
        SEAProjectConfig_ = SEALib.getSEAProjectConfig({
            _projectId: _projectId,
            _coreContract: _coreContract
        });
        // clean up next token number to handle case where it is stale
        SEAProjectConfig_.nextTokenNumber = SEAProjectConfig_
            .nextTokenNumberIsPopulated
            ? SEAProjectConfig_.nextTokenNumber
            : 0;
    }

    /**
     * @notice projectId => active auction details.
     * @dev reverts if no auction exists for the project.
     * @param _projectId The project ID
     * @param _coreContract The core contract address
     */
    function projectActiveAuctionDetails(
        uint256 _projectId,
        address _coreContract
    ) external view returns (SEALib.Auction memory auction) {
        return
            SEALib.projectActiveAuctionDetails({
                _projectId: _projectId,
                _coreContract: _coreContract
            });
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
     * @param _coreContract The core contract address
     * @return The current token ID being auctioned, or the next token ID to be
     * auctioned if a new auction is ready to be created.
     */
    function getTokenToBid(
        uint256 _projectId,
        address _coreContract
    ) external view returns (uint256) {
        return
            SEALib.getTokenToBid({
                _projectId: _projectId,
                _coreContract: _coreContract
            });
    }

    /**
     * @notice View function that returns the next token ID to be auctioned
     * by this minter for project `_projectId`.
     * Reverts if the next token ID has not been populated for the project.
     * @param _projectId The project ID being queried
     * @param _coreContract The core contract address
     * @return nextTokenId The next token ID to be auctioned by this minter
     */
    function getNextTokenId(
        uint256 _projectId,
        address _coreContract
    ) external view returns (uint256 nextTokenId) {
        return
            SEALib.getNextTokenId({
                _projectId: _projectId,
                _coreContract: _coreContract
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
     * @param _coreContract Core contract to get price information for.
     * @return isConfigured true only if project auctions are configured.
     * @return tokenPriceInWei price in wei to become the leading bidder on a
     * token auction.
     * @return currencySymbol currency symbol for purchases of project on this
     * minter. This minter always returns "ETH"
     * @return currencyAddress currency address for purchases of project on
     * this minter. This minter always returns null address, reserved for ether
     */
    function getPriceInfo(
        uint256 _projectId,
        address _coreContract
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
        (isConfigured, tokenPriceInWei) = SEALib.getPriceInfo({
            _projectId: _projectId,
            _coreContract: _coreContract
        });
        // currency is always ETH
        currencySymbol = "ETH";
        currencyAddress = address(0);
    }

    /**
     * @notice Syncs local maximum invocations of project `_projectId` based on
     * the value currently defined in the core contract.
     * @param _projectId Project ID to set the maximum invocations for.
     * @param _coreContract Core contract address for the given project.
     * @dev this enables gas reduction after maxInvocations have been reached -
     * core contracts shall still enforce a maxInvocation check during mint.
     */
    function syncProjectMaxInvocationsToCore(
        uint256 _projectId,
        address _coreContract
    ) public {
        AuthLib.onlyArtist({
            _projectId: _projectId,
            _coreContract: _coreContract,
            _sender: msg.sender
        });

        MaxInvocationsLib.syncProjectMaxInvocationsToCore(
            _projectId,
            _coreContract
        );

        // for convenience, try to mint and assign a token to the project's
        // next slot
        SEALib.tryMintTokenToNextSlot({
            _projectId: _projectId,
            _coreContract: _coreContract,
            _minterFilter: minterFilter
        });
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
     * @param _coreContract The core contract address for the given project.
     */
    function tryPopulateNextToken(
        uint256 _projectId,
        address _coreContract
    ) public nonReentrant {
        AuthLib.onlyArtist({
            _projectId: _projectId,
            _coreContract: _coreContract,
            _sender: msg.sender
        });
        // CHECKS
        // revert if project is not configured on this minter
        require(
            SEALib.projectIsConfigured({
                _projectId: _projectId,
                _coreContract: _coreContract
            }),
            "Project not configured"
        );
        // INTERACTIONS
        // attempt to mint new token to this minter contract, only if max
        // invocations has not been reached
        SEALib.tryMintTokenToNextSlot({
            _projectId: _projectId,
            _coreContract: _coreContract,
            _minterFilter: minterFilter
        });
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
     * @param _coreContract Core contract address for the given token.
     */
    function settleAuction(
        uint256 _tokenId,
        address _coreContract
    ) public nonReentrant {
        SEALib.settleAuction({
            _tokenId: _tokenId,
            _coreContract: _coreContract
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
     * @param _tokenId Token ID being bid on.
     * @param _coreContract Core contract address for the given project.
     * @dev nonReentrant modifier is used to prevent reentrancy attacks, e.g.
     * an an auto-bidder that would be able to atomically outbid a user's
     * new bid via a reentrant call to createBid.
     */
    function createBid(
        uint256 _tokenId,
        address _coreContract
    ) public payable nonReentrant {
        SEALib.createBid({
            _tokenId: _tokenId,
            _coreContract: _coreContract,
            _minterTimeBufferSeconds: minterTimeBufferSeconds,
            _minterRefundGasLimit: minterRefundGasLimit,
            _minterFilter: minterFilter
        });
    }
}
