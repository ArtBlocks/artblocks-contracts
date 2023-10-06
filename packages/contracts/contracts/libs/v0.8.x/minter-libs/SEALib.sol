// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IMinterFilterV1} from "../../../interfaces/v0.8.x/IMinterFilterV1.sol";

import {ABHelpers} from "../ABHelpers.sol";
import {SplitFundsLib} from "./SplitFundsLib.sol";
import {MaxInvocationsLib} from "./MaxInvocationsLib.sol";

import {IERC721} from "@openzeppelin-4.7/contracts/token/ERC721/IERC721.sol";
import {SafeCast} from "@openzeppelin-4.7/contracts/utils/math/SafeCast.sol";

/**
 * @title Art Blocks SEA Minter Library
 * @notice This library is designed for the Art Blocks platform. It includes
 * Structs and functions that help with serial English auction minters.
 * @author Art Blocks Inc.
 */

library SEALib {
    using SafeCast for uint256;
    /**
     * @notice Minimum auction length, in seconds, was updated to be the
     * provided value.
     */
    event MinAuctionDurationSecondsUpdated(uint256 minAuctionDurationSeconds);

    /// Admin-controlled time buffer updated
    event MinterTimeBufferUpdated(uint32 minterTimeBufferSeconds);

    // Admin-controlled refund gas limit updated
    event MinterRefundGasLimitUpdated(uint24 refundGasLimit);

    /// Artist configured future auction details
    event ConfiguredFutureAuctions(
        uint256 indexed projectId,
        address indexed coreContract,
        uint64 timestampStart,
        uint32 auctionDurationSeconds,
        uint256 basePrice,
        uint8 minBidIncrementPercentage
    );

    /// New token auction created, token created and sent to minter
    event AuctionInitialized(
        uint256 indexed tokenId,
        address indexed coreContract,
        address indexed bidder,
        uint256 bidAmount,
        uint64 endTime,
        uint8 minBidIncrementPercentage
    );

    /// Successful bid placed on token auction
    event AuctionBid(
        uint256 indexed tokenId,
        address indexed coreContract,
        address indexed bidder,
        uint256 bidAmount
    );

    /// Token auction was settled (token distributed to winner)
    event AuctionSettled(
        uint256 indexed tokenId,
        address indexed coreContract,
        address indexed winner,
        uint256 price
    );

    /// Future auction details for project `projectId` reset
    event ResetAuctionDetails(
        uint256 indexed projectId,
        address indexed coreContract
    );

    // Next token ID for project `projectId` updated
    event ProjectNextTokenUpdated(
        uint256 indexed projectId,
        address indexed coreContract,
        uint256 tokenId
    );

    // Next token ID for project `projectId` was ejected from the minter
    // and is no longer populated
    event ProjectNextTokenEjected(
        uint256 indexed projectId,
        address indexed coreContract
    );

    // position of SEA Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant SEA_LIB_STORAGE_POSITION = keccak256("sealib.storage");

    uint256 constant ONE_MILLION = 1_000_000;

    // project-specific parameters
    struct SEAProjectConfig {
        uint64 timestampStart;
        // duration of each new auction, before any extensions due to late bids
        // @dev for configured auctions, this will be gt 0, so it may be used
        // to determine if an auction is configured
        uint32 auctionDurationSeconds;
        // minimum bid increment percentage. each subsequent bid must be at
        // least this percentage greater than the previous bid. the value is
        // expressed as a whole percentage, e.g. 5% is 5, 10% is 10, etc.
        // @dev this is a project-level constraint, defined by the artist.
        // recommended values are between 5 and 10 percent.
        // max uint8 = 255, so max value is 255% (which is more than expected
        // to be used)
        uint8 minBidIncrementPercentage;
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
        uint256 basePrice;
        // active auction for project
        Auction activeAuction;
    }

    /// Struct that defines a single token English auction
    struct Auction {
        // token number of NFT being auctioned
        uint256 tokenId;
        // The current highest bid amount (in wei)
        uint256 currentBid;
        // The address of the current highest bidder
        // @dev if this is not the zero address, then the auction is
        // considered initialized
        address payable currentBidder;
        // The time that the auction is scheduled to end
        // max uint64 ~= 1.8e19 sec ~= 570 billion years
        uint64 endTime;
        // The minimum percentage increase required for the next bid
        // value is copied from SEAProjectConfig, where it is also a uint8
        uint8 minBidIncrementPercentage;
        // Whether or not the auction has been settled
        bool settled;
    }

    // Diamond storage pattern is used in this library
    struct SEALibStorage {
        mapping(address coreContract => mapping(uint256 projectId => SEAProjectConfig)) SEAProjectConfigs;
    }

    /**
     * @notice Updates the SEAProjectConfig to clear the current settings for
     * future auctions on the project. Values are reset to their default
     * initial values.
     * Current auction details are not cleared or affected.
     * @param _projectId Project ID to reset
     * @param _coreContract Core contract address to reset
     */
    function resetFutureAuctionDetails(
        uint256 _projectId,
        address _coreContract
    ) internal {
        SEAProjectConfig storage SEAProjectConfig_ = getSEAProjectConfig({
            _projectId: _projectId,
            _coreContract: _coreContract
        });
        // reset future auction details
        SEAProjectConfig_.auctionDurationSeconds = 0;
        SEAProjectConfig_.minBidIncrementPercentage = 0;
        SEAProjectConfig_.basePrice = 0;
        SEAProjectConfig_.timestampStart = 0;

        emit ResetAuctionDetails(_projectId, _coreContract);
    }

    /**
     * @notice Configures future auctions for project `_projectId` on core
     * contract `_coreContract`.
     * Reverts if `_timestampStart` is in the past and not zero.
     * @param _projectId Project ID to configure
     * @param _coreContract Core contract address to configure
     * @param _timestampStart Timestamp to start future auctions at. If zero,
     * auctions can start immediately.
     * @param _auctionDurationSeconds Duration of each new auction, before any
     * extensions due to late bids
     * @param _basePrice Minimum bid price for the token auctions
     * @param _minBidIncrementPercentage Minimum bid increment percentage. Each
     * subsequent bid must be at least this percentage greater than the
     * previous bid. The value is expressed as a whole percentage, e.g. 5% is
     * 5, 10% is 10, etc.
     */
    function configureFutureAuctions(
        uint256 _projectId,
        address _coreContract,
        uint256 _timestampStart,
        uint256 _auctionDurationSeconds,
        uint256 _basePrice,
        uint8 _minBidIncrementPercentage
    ) internal {
        SEAProjectConfig storage SEAProjectConfig_ = getSEAProjectConfig({
            _projectId: _projectId,
            _coreContract: _coreContract
        });
        require(
            _timestampStart == 0 || block.timestamp < _timestampStart,
            "Only future start times or 0"
        );
        // EFFECTS
        SEAProjectConfig_.timestampStart = _timestampStart.toUint64();
        SEAProjectConfig_.auctionDurationSeconds = _auctionDurationSeconds
            .toUint32();
        SEAProjectConfig_.basePrice = _basePrice;
        SEAProjectConfig_
            .minBidIncrementPercentage = _minBidIncrementPercentage;

        emit ConfiguredFutureAuctions({
            projectId: _projectId,
            coreContract: _coreContract,
            timestampStart: _timestampStart.toUint64(),
            auctionDurationSeconds: _auctionDurationSeconds.toUint32(),
            basePrice: _basePrice,
            minBidIncrementPercentage: _minBidIncrementPercentage
        });
    }

    /**
     * @notice Updates the bid state of an Auction.
     * Note that the auction's end time is extended if the bid is placed within
     * the last `_timeBufferSeconds` of the auction.
     * NOTE: This function does not check if the bid is valid. It is assumed
     * that the bid has already been checked for validity by the caller.
     * @param _auction Auction to update
     * @param _timeBufferSeconds Time buffer to extend the auction to if the
     * bid is placed within the last `_timeBufferSeconds` of the auction.
     * @param _bidAmount bid amount
     * @param _bidder bidder's payable address
     */
    function auctionUpdateBid(
        Auction storage _auction,
        uint256 _timeBufferSeconds,
        uint256 _bidAmount,
        address payable _bidder
    ) internal {
        // update auction state
        _auction.currentBid = _bidAmount;
        _auction.currentBidder = _bidder;
        uint256 minEndTime = block.timestamp + _timeBufferSeconds;
        if (_auction.endTime < minEndTime) {
            _auction.endTime = minEndTime.toUint64();
        }
    }

    /**
     * @notice Ejects a project's "next token" from the minter and sends it to
     * the input `_to` address.
     * This function is only intended for use in the edge case where the minter
     * has a "next token" assigned to a project, but the project has been reset
     * via `resetAuctionDetails`, and the artist does not want an auction to be
     * started for the "next token". This function also protects against the
     * unforseen case where the minter is in an unexpected state where it has a
     * "next token" assigned to a project, but for some reason the project is
     * unable to begin a new auction due to a bug.
     * @param _projectId The project ID being ejected
     * @param _coreContract The core contract address being ejected
     * @param _to The address to send the ejected token to
     */
    function ejectNextTokenTo(
        uint256 _projectId,
        address _coreContract,
        address _to
    ) internal {
        SEAProjectConfig storage SEAProjectConfig_ = getSEAProjectConfig({
            _projectId: _projectId,
            _coreContract: _coreContract
        });
        // CHECKS
        // only if project is not configured (i.e. artist called
        // `resetAuctionDetails`)
        require(
            !projectIsConfigured({
                _projectId: _projectId,
                _coreContract: _coreContract
            }),
            "Only unconfigured projects"
        );
        // only if project has a next token assigned
        require(
            SEAProjectConfig_.nextTokenNumberIsPopulated == true,
            "No next token"
        );
        // EFFECTS
        SEAProjectConfig_.nextTokenNumberIsPopulated = false;
        // INTERACTIONS
        // @dev overflow automatically handled by Sol ^0.8.0
        uint256 nextTokenId = ABHelpers.tokenIdFromProjectIdAndTokenNumber({
            _projectId: _projectId,
            _tokenNumber: SEAProjectConfig_.nextTokenNumber
        });
        IERC721(_coreContract).transferFrom({
            from: address(this),
            to: _to,
            tokenId: nextTokenId
        });
        emit ProjectNextTokenEjected(_projectId, _coreContract);
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
    function settleAuction(uint256 _tokenId, address _coreContract) internal {
        uint256 _projectId = ABHelpers.tokenIdToProjectId(_tokenId);
        SEAProjectConfig storage _SEAProjectConfig = getSEAProjectConfig({
            _projectId: _projectId,
            _coreContract: _coreContract
        });
        Auction storage _auction = _SEAProjectConfig.activeAuction;
        // load from storage to memory for gas efficiency
        address currentBidder = _auction.currentBidder;
        uint256 currentBid = _auction.currentBid;
        // CHECKS
        // @dev this check is not strictly necessary, but is included for
        // clear error messaging
        require(auctionIsInitialized(_auction), "Auction not initialized");
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
        IERC721(_coreContract).transferFrom({
            from: address(this),
            to: currentBidder,
            tokenId: _tokenId
        });
        // distribute revenues from auction
        SplitFundsLib.splitRevenuesETHNoRefund({
            _projectId: _projectId,
            _valueInWei: currentBid,
            _coreContract: _coreContract
        });

        emit AuctionSettled({
            tokenId: _tokenId,
            coreContract: _coreContract,
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
     * @param _tokenId Token ID being bid on.
     * @param _coreContract Core contract address for the given project.
     * @dev nonReentrant modifier is used to prevent reentrancy attacks, e.g.
     * an an auto-bidder that would be able to atomically outbid a user's
     * new bid via a reentrant call to createBid.
     */
    function createBid(
        uint256 _tokenId,
        address _coreContract,
        uint256 _minterTimeBufferSeconds,
        uint256 _minterRefundGasLimit,
        IMinterFilterV1 _minterFilter
    ) internal {
        uint256 _projectId = ABHelpers.tokenIdToProjectId(_tokenId);
        SEAProjectConfig storage SEAProjectConfig_ = getSEAProjectConfig({
            _projectId: _projectId,
            _coreContract: _coreContract
        });
        Auction storage _auction = SEAProjectConfig_.activeAuction;
        // CHECKS
        // load from storage to memory for gas efficiency
        uint256 auctionEndTime = _auction.endTime;
        uint256 previousBid = _auction.currentBid;

        // if no auction exists, or current auction is already settled, attempt
        // to initialize a new auction for the input token ID and immediately
        // return
        if ((!auctionIsInitialized(_auction)) || _auction.settled) {
            _initializeAuctionWithBid({
                _projectId: _projectId,
                _coreContract: _coreContract,
                _targetTokenId: _tokenId,
                _minterFilter: _minterFilter
            });
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
        require(msg.value >= getMinimumNextBid(_auction), "Bid is too low");

        // EFFECTS
        // record previous highest bider for refunding
        address payable previousBidder = _auction.currentBidder;

        // update auction bid state
        auctionUpdateBid({
            _auction: _auction,
            _timeBufferSeconds: _minterTimeBufferSeconds,
            _bidAmount: msg.value,
            _bidder: payable(msg.sender)
        });

        // INTERACTIONS
        // refund previous highest bidder
        SplitFundsLib.forceSafeTransferETH({
            _to: previousBidder,
            _amount: previousBid,
            _minterRefundGasLimit: _minterRefundGasLimit
        });

        emit AuctionBid({
            tokenId: _tokenId,
            coreContract: _coreContract,
            bidder: msg.sender,
            bidAmount: msg.value
        });
    }

    /**
     * @notice Internal function that attempts to mint a new token to the next
     * token slot for the project `_projectId`.
     * This function returns early and does not modify state if
     *   - the project has reached its maximum invocations on either the core
     *     contract or minter
     *   - the project config's `nextTokenNumberIsPopulated` is already true
     * @param _projectId The ID of the project to mint a new token for.
     * @param _coreContract The core contract address
     * @param _minterFilter The minter filter contract address
     * @dev this calls mint with `msg.sender` as the sender, allowing artists
     * to mint tokens to the next token slot for their project while a project
     * is still paused. This happens when an artist is configuring their
     * project's auction parameters or minter max invocations.
     */
    function tryMintTokenToNextSlot(
        uint256 _projectId,
        address _coreContract,
        IMinterFilterV1 _minterFilter
    ) internal {
        SEAProjectConfig storage SEAProjectConfig_ = getSEAProjectConfig({
            _projectId: _projectId,
            _coreContract: _coreContract
        });
        if (SEAProjectConfig_.nextTokenNumberIsPopulated) {
            return;
        }
        // INTERACTIONS
        // attempt to mint new token to this minter contract, only if max
        // invocations has not been reached
        // we require up-to-date invocation data to properly handle last token
        // and avoid revert if relying on core to limit invocations, therefore
        // use MaxInvocationsLib.invocationsRemain, which calls core contract
        // to get latest invocation data
        if (!MaxInvocationsLib.invocationsRemain(_projectId, _coreContract)) {
            // we have reached the max invocations, so we do not mint a new
            // token as the "next token", and leave the next token number as
            // not populated
            return;
        }
        // @dev this is an effect after a trusted contract interaction
        SEAProjectConfig_.nextTokenNumberIsPopulated = true;
        // mint a new token to this project's "next token" slot
        // @dev this is an interaction with a trusted contract
        uint256 nextTokenId = _minterFilter.mint_joo(
            address(this),
            _projectId,
            _coreContract,
            msg.sender
        );
        // update state to reflect new token number
        // @dev state changes after trusted contract interaction
        // @dev unchecked is safe because mod 1e6 is guaranteed to be less than
        // max uint24
        unchecked {
            SEAProjectConfig_.nextTokenNumber = uint24(
                ABHelpers.tokenIdToTokenNumber(nextTokenId)
            );
        }
        // update local maxHasBeenInvoked value if necessary
        MaxInvocationsLib.validatePurchaseEffectsInvocations({
            _tokenId: nextTokenId,
            _coreContract: _coreContract
        });
        emit ProjectNextTokenUpdated({
            projectId: _projectId,
            coreContract: _coreContract,
            tokenId: nextTokenId
        });
    }

    /**
     * @notice Determines if a project is configured or not on this minter.
     * Uses project config's `auctionDurationSeconds` to determine if project
     * is configured, because `auctionDurationSeconds` is required to be
     * non-zero when configured.
     * @param _projectId The project ID being queried
     * @param _coreContract The core contract address being queried
     */
    function projectIsConfigured(
        uint256 _projectId,
        address _coreContract
    ) internal view returns (bool) {
        SEAProjectConfig storage SEAProjectConfig_ = getSEAProjectConfig({
            _projectId: _projectId,
            _coreContract: _coreContract
        });
        return SEAProjectConfig_.auctionDurationSeconds != 0;
    }

    /**
     * @notice Determines if an auction is initialized.
     * Uses auction's `currentBidder` address to determine if auction is
     * initialized, because `currentBidder` is always non-zero after an auction
     * has been initialized.
     * @param _auction The auction to check.
     */
    function auctionIsInitialized(
        Auction storage _auction
    ) internal view returns (bool isInitialized) {
        // auction is initialized if currentBidder is non-zero
        return _auction.currentBidder != address(0);
    }

    /**
     * Returns bool representing if an auction is accepting bids above base
     * price. It is accepting bids if it is initialized and has not reached its
     * end time.
     * @param _auction The auction to check.
     */
    function auctionIsAcceptingIncreasingBids(
        Auction storage _auction
    ) internal view returns (bool isAcceptingBids) {
        // auction is accepting bids if it is initialized and has not reached
        // its end time
        isAcceptingBids = (auctionIsInitialized(_auction) &&
            block.timestamp < _auction.endTime);
        return isAcceptingBids;
    }

    /**
     * @notice SEAProjectConfig => active auction details.
     * @dev reverts if no auction exists for the project.
     * @param _projectId The project ID being queried
     * @param _coreContract The core contract address being queried
     */
    function projectActiveAuctionDetails(
        uint256 _projectId,
        address _coreContract
    ) internal view returns (Auction memory auction) {
        SEAProjectConfig storage SEAProjectConfig_ = getSEAProjectConfig({
            _projectId: _projectId,
            _coreContract: _coreContract
        });
        Auction storage _auction = SEAProjectConfig_.activeAuction;
        // do not return uninitialized auctions (i.e. auctions that do not
        // exist, where currentBidder is still the default value)
        require(auctionIsInitialized(_auction), "No auction exists on project");
        // load entire auction into memory
        auction = SEAProjectConfig_.activeAuction;
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
     * @param _coreContract The core contract address being queried
     * @return The current token ID being auctioned, or the next token ID to be
     * auctioned if a new auction is ready to be created.
     */
    function getTokenToBid(
        uint256 _projectId,
        address _coreContract
    ) internal view returns (uint256) {
        SEAProjectConfig storage SEAProjectConfig_ = getSEAProjectConfig({
            _projectId: _projectId,
            _coreContract: _coreContract
        });
        Auction storage _auction = SEAProjectConfig_.activeAuction;
        // if project has an active token auction that is not settled, return
        // that token ID
        if (
            auctionIsInitialized(_auction) &&
            (_auction.endTime > block.timestamp)
        ) {
            return _auction.tokenId;
        }
        // otherwise, return the next expected token ID to be auctioned.
        return getNextTokenId(_projectId, _coreContract);
    }

    /**
     * @notice View function that returns the next token ID to be auctioned
     * by this minter for project `_projectId`.
     * Reverts if the next token ID has not been populated for the project.
     * @param _projectId The project ID being queried
     * @param _coreContract The core contract address being queried
     */
    function getNextTokenId(
        uint256 _projectId,
        address _coreContract
    ) internal view returns (uint256 nextTokenId) {
        SEAProjectConfig storage SEAProjectConfig_ = getSEAProjectConfig({
            _projectId: _projectId,
            _coreContract: _coreContract
        });
        if (!SEAProjectConfig_.nextTokenNumberIsPopulated) {
            revert("Next token not populated");
        }
        // @dev overflow automatically checked in Solidity ^0.8.0
        nextTokenId =
            (_projectId * ONE_MILLION) +
            SEAProjectConfig_.nextTokenNumber;
        return nextTokenId;
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
     * @param _projectId Project ID to get price info for
     * @param _coreContract Core contract address to get price info for
     * @return isConfigured true only if project auctions are configured.
     * @return tokenPriceInWei price in wei to become the leading bidder on a
     * token auction.
     */
    function getPriceInfo(
        uint256 _projectId,
        address _coreContract
    ) internal view returns (bool isConfigured, uint256 tokenPriceInWei) {
        SEAProjectConfig storage SEAProjectConfig_ = getSEAProjectConfig({
            _projectId: _projectId,
            _coreContract: _coreContract
        });
        Auction storage _auction = SEAProjectConfig_.activeAuction;
        // base price of zero not allowed when configuring auctions, so use it
        // as indicator of whether auctions are configured for the project
        bool projectIsConfigured_ = projectIsConfigured({
            _projectId: _projectId,
            _coreContract: _coreContract
        });
        bool auctionIsAcceptingIncreasingBids_ = auctionIsAcceptingIncreasingBids(
                _auction
            );
        isConfigured =
            projectIsConfigured_ ||
            auctionIsAcceptingIncreasingBids_;
        // only return non-zero price if auction is configured
        if (isConfigured) {
            if (auctionIsAcceptingIncreasingBids_) {
                // return minimum next bid, given current bid
                tokenPriceInWei = getMinimumNextBid(_auction);
            } else {
                // return base (starting) price if if current auction is not
                // accepting bids (i.e. the minimum initial bid price for the
                // next token auction)
                tokenPriceInWei = SEAProjectConfig_.basePrice;
            }
        }
        // else leave tokenPriceInWei as default value of zero
        // @dev values of `isConfigured` and `tokenPriceInWei` are returned
    }

    /**
     * Returns the minimum next bid amount in a configured auction, given the
     * current bid amount and the project's configured minimum bid increment
     * percentage.
     * @param _auction Auction to query
     */
    function getMinimumNextBid(
        Auction storage _auction
    ) internal view returns (uint256 minimumNextBid) {
        // @dev overflow automatically checked in Solidity ^0.8.0
        return
            (_auction.currentBid * (100 + _auction.minBidIncrementPercentage)) /
            100;
    }

    /**
     * @dev Private function to initialize an auction for the next token ID
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
        address _coreContract,
        uint256 _targetTokenId,
        IMinterFilterV1 _minterFilter
    ) private {
        SEAProjectConfig storage SEAProjectConfig_ = getSEAProjectConfig({
            _projectId: _projectId,
            _coreContract: _coreContract
        });
        Auction storage _auction = SEAProjectConfig_.activeAuction;
        // CHECKS
        // ensure project auctions are configured
        // @dev base price of zero indicates auctions are not configured
        // because only base price of gt zero is allowed when configuring
        require(
            projectIsConfigured({
                _projectId: _projectId,
                _coreContract: _coreContract
            }),
            "Project not configured"
        );
        // only initialize new auctions if they meet the start time
        // requirement
        require(
            block.timestamp >= SEAProjectConfig_.timestampStart,
            "Only gte project start time"
        );
        // the following require statement is redundant based on how this
        // internal function is called, but it is included for protection
        // against future changes that could easily introduce a bug if this
        // check is not present
        // @dev no cover else branch of next line because unreachable
        require(
            (!auctionIsInitialized(_auction)) || _auction.settled,
            "Existing auction not settled"
        );
        // require valid bid value
        require(
            msg.value >= SEAProjectConfig_.basePrice,
            "Insufficient initial bid"
        );
        // require next token number is populated
        // @dev this should only be encountered if the project has reached
        // its maximum invocations on either the core contract or minter
        require(
            SEAProjectConfig_.nextTokenNumberIsPopulated,
            "No next token, check max invocations"
        );
        // require next token number is the target token ID
        require(
            SEAProjectConfig_.nextTokenNumber ==
                ABHelpers.tokenIdToTokenNumber(_targetTokenId),
            "Incorrect target token ID"
        );

        // EFFECTS
        // create new auction, overwriting previous auction if it exists
        uint64 endTime = overwriteProjectActiveAuction({
            _SEAProjectConfig: SEAProjectConfig_,
            _targetTokenId: _targetTokenId,
            _bidAmount: msg.value,
            _bidder: payable(msg.sender)
        });
        // mark next token number as not populated
        // @dev intentionally not setting nextTokenNumber to zero to avoid
        // unnecessary gas costs
        SEAProjectConfig_.nextTokenNumberIsPopulated = false;

        // @dev we intentionally emit event here due to potential of early
        // return in INTERACTIONS section
        emit AuctionInitialized({
            tokenId: _targetTokenId,
            coreContract: _coreContract,
            bidder: msg.sender,
            bidAmount: msg.value,
            endTime: endTime,
            minBidIncrementPercentage: SEAProjectConfig_
                .activeAuction
                .minBidIncrementPercentage
        });

        // INTERACTIONS
        // attempt to mint new token to this minter contract, only if max
        // invocations has not been reached
        tryMintTokenToNextSlot(_projectId, _coreContract, _minterFilter);
    }

    /**
     * Overwrite the active auction for a project with a new auction.
     * @dev This function is used to initialize a new auction. Care must be
     * taken to ensure that the existing auction is fully complete and settled.
     * @param _SEAProjectConfig SEAProjectConfig to update
     * @param _targetTokenId token ID to create the auction for
     * @param _bidAmount initial bid amount
     * @param _bidder initial bidder's payable address
     * @return endTime end time of the newly created auction
     */
    function overwriteProjectActiveAuction(
        SEAProjectConfig storage _SEAProjectConfig,
        uint256 _targetTokenId,
        uint256 _bidAmount,
        address payable _bidder
    ) private returns (uint64 endTime) {
        // calculate auction end time
        endTime = (block.timestamp + _SEAProjectConfig.auctionDurationSeconds)
            .toUint64();
        // set active auction on SEAProjectConfig
        _SEAProjectConfig.activeAuction = Auction({
            tokenId: _targetTokenId,
            currentBid: _bidAmount,
            currentBidder: _bidder,
            endTime: endTime,
            minBidIncrementPercentage: _SEAProjectConfig
                .minBidIncrementPercentage,
            settled: false
        });
        return endTime;
    }

    /**
     * Loads the SEAProjectConfig for a given project and core
     * contract.
     * @param _projectId Project Id to get config for
     * @param _coreContract Core contract address to get config for
     */
    function getSEAProjectConfig(
        uint256 _projectId,
        address _coreContract
    ) internal view returns (SEAProjectConfig storage) {
        return s().SEAProjectConfigs[_coreContract][_projectId];
    }

    /**
     * @notice Return the storage struct for reading and writing. This library
     * uses a diamond storage pattern when managing storage.
     * @return storageStruct The SEALibStorage struct.
     */
    function s() internal pure returns (SEALibStorage storage storageStruct) {
        bytes32 position = SEA_LIB_STORAGE_POSITION;
        assembly {
            storageStruct.slot := position
        }
    }
}
