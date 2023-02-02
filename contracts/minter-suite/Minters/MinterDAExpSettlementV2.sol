// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../../interfaces/0.8.x/IGenArt721CoreContractV3_Base.sol";
import "../../interfaces/0.8.x/IMinterFilterV0.sol";
import "../../interfaces/0.8.x/IFilteredMinterDAExpSettlementV1.sol";
import "./MinterBase_v0_1_1.sol";

import "@openzeppelin-4.7/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin-4.7/contracts/utils/math/SafeCast.sol";

pragma solidity 0.8.17;

/**
 * @title Filtered Minter contract that allows tokens to be minted with ETH.
 * Pricing is achieved using an automated Dutch-auction mechanism, with a
 * settlement mechanism for tokens purchased before the auction ends.
 * This is designed to be used with GenArt721CoreContractV3 flagship or
 * engine contracts.
 * @author Art Blocks Inc.
 * @notice Privileged Roles and Ownership:
 * This contract is designed to be managed, with limited powers.
 * Privileged roles and abilities are controlled by the core contract's Admin
 * ACL contract and a project's artist. Both of these roles hold extensive
 * power and can modify minter details.
 * Care must be taken to ensure that the admin ACL contract and artist
 * addresses are secure behind a multi-sig or other access control mechanism.
 * Additionally, the purchaser of a token has some trust assumptions regarding
 * settlement, beyond typical minter Art Blocks trust assumptions. In general,
 * Artists and Admin are trusted to not abuse their powers in a way that
 * would artifically inflate the sellout price of a project. They are
 * incentivized to not do so, as it would diminish their reputation and
 * ability to sell future projects. Agreements between Admin and Artist
 * may or may not be in place to further dissuade artificial inflation of an
 * auction's sellout price.
 * ----------------------------------------------------------------------------
 * The following functions are restricted to the core contract's Admin ACL
 * contract:
 * - setAllowablePriceDecayHalfLifeRangeSeconds (note: this range is only
 *   enforced when creating new auctions)
 * - resetAuctionDetails (note: this will prevent minting until a new auction
 *   is created)
 * - adminEmergencyReduceSelloutPrice
 * ----------------------------------------------------------------------------
 * The following functions are restricted to a project's artist or the core
 * contract's Admin ACL contract:
 * - withdrawArtistAndAdminRevenues (note: this may only be called after an
 *   auction has sold out or has reached base price)
 * ----------------------------------------------------------------------------
 * The following functions are restricted to a project's artist:
 * - setAuctionDetails (note: this may only be called when there is no active
 *   auction, and must start at a price less than or equal to any previously
 *   made purchases)
 * - setProjectMaxInvocations
 * - manuallyLimitProjectMaxInvocations
 * ----------------------------------------------------------------------------
 * Additional admin and artist privileged roles may be described on other
 * contracts that this minter integrates with.
 *
 * @dev Note that while this minter makes use of `block.timestamp` and it is
 * technically possible that this value is manipulated by block producers via
 * denial of service (in PoS), such manipulation will not have material impact
 * on the price values of this minter given the business practices for how
 * pricing is congfigured for this minter and that variations on the order of
 * less than a minute should not meaningfully impact price given the minimum
 * allowable price decay rate that this minter intends to support.
 */
contract MinterDAExpSettlementV2 is
    ReentrancyGuard,
    MinterBase,
    IFilteredMinterDAExpSettlementV1
{
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
    string public constant minterType = "MinterDAExpSettlementV2";

    uint256 constant ONE_MILLION = 1_000_000;

    struct ProjectConfig {
        // maxHasBeenInvokedCoreCached is a locally cached value on the minter, and may
        // be out of sync with the core contract's value and return a false
        // negative. This must be appropriately accounted for in this minter's
        // logic.
        bool maxHasBeenInvokedCoreCached;
        // maxInvocationsCoreCached is the maximum number of tokens that may be minted
        // for this project. The value here is cached on the minter, and may
        // be out of sync with the core contract's value. This must be
        // appropriately accounted for in this minter's logic.
        uint24 maxInvocationsCoreCached;
        // maxHasBeenInvokedLocal is only true if invocations are equal to the
        // locally limited max invocations value, `maxInvocationsLocal`.
        bool maxHasBeenInvokedLocal;
        // maxInvocationsLocal is the maximum number of tokens that may be minted
        // for this project. The value here is cached on the minter, and may
        // be out of sync with the core contract's value. This must be
        // appropriately accounted for in this minter's logic.
        uint24 maxInvocationsLocal;
        // boolean indicating whether the minter's local max invocations should
        // be enforced, or if the core contract's max invocations should be
        // enforced.
        bool useLocalMaxInvocations;
        // set to true only after artist + admin revenues have been collected
        bool auctionRevenuesCollected;
        // number of tokens minted that have potential of future settlement.
        // max uint24 > 16.7 million tokens > 1 million tokens/project max
        uint24 numSettleableInvocations;
        // max uint64 ~= 1.8e19 sec ~= 570 billion years
        uint64 timestampStart;
        uint64 priceDecayHalfLifeSeconds;
        // Prices are packed internally as uint128, resulting in a maximum
        // allowed price of ~3.4e20 ETH. This is many orders of magnitude
        // greater than current ETH supply.
        uint128 startPrice;
        // base price is non-zero for all configured auctions on this minter
        uint128 basePrice;
        // This value is only zero if no purchases have been made on this
        // minter.
        // When non-zero, this value is used as a reference when an auction is
        // reset by admin, and then a new auction is configured by an artist.
        // In that case, the new auction will be required to have a starting
        // price less than or equal to this value, if one or more purchases
        // have been made on this minter.
        uint256 latestPurchasePrice;
    }

    mapping(uint256 => ProjectConfig) public projectConfig;

    /// Minimum price decay half life: price must decay with a half life of at
    /// least this amount (must cut in half at least every N seconds).
    uint256 public minimumPriceDecayHalfLifeSeconds = 300; // 5 minutes
    /// Maximum price decay half life: price may decay with a half life of no
    /// more than this amount (may cut in half at no more than every N seconds).
    uint256 public maximumPriceDecayHalfLifeSeconds = 3600; // 60 minutes

    struct Receipt {
        // max uint232 allows for > 1e51 ETH (much more than max supply)
        uint232 netPosted;
        // max uint24 still allows for > max project supply of 1 million tokens
        uint24 numPurchased;
    }
    /// user address => project ID => receipt
    mapping(address => mapping(uint256 => Receipt)) receipts;

    // modifier to restrict access to only AdminACL or the artist
    modifier onlyCoreAdminACLOrArtist(uint256 _projectId, bytes4 _selector) {
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
        _;
    }

    // modifier to restrict access to only AdminACL allowed calls
    // @dev defers which ACL contract is used to the core contract
    modifier onlyCoreAdminACL(bytes4 _selector) {
        require(
            genArtCoreContract_Base.adminACLAllowed(
                msg.sender,
                address(this),
                _selector
            ),
            "Only Core AdminACL allowed"
        );
        _;
    }

    modifier onlyArtist(uint256 _projectId) {
        require(
            (msg.sender ==
                genArtCoreContract_Base.projectIdToArtistAddress(_projectId)),
            "Only Artist"
        );
        _;
    }

    /**
     * @notice Initializes contract to be a Filtered Minter for
     * `_minterFilter`, integrated with Art Blocks core contract
     * at address `_genArt721Address`.
     * @param _genArt721Address Art Blocks core contract address for
     * which this contract will be a minter.
     * @param _minterFilter Minter filter for which
     * this will a filtered minter.
     */
    constructor(
        address _genArt721Address,
        address _minterFilter
    ) ReentrancyGuard() MinterBase(_genArt721Address) {
        genArt721CoreAddress = _genArt721Address;
        // always populate immutable engine contracts, but only use appropriate
        // interface based on isEngine in the rest of the contract
        genArtCoreContract_Base = IGenArt721CoreContractV3_Base(
            _genArt721Address
        );
        minterFilterAddress = _minterFilter;
        minterFilter = IMinterFilterV0(_minterFilter);
        require(
            minterFilter.genArt721CoreAddress() == _genArt721Address,
            "Illegal contract pairing"
        );
    }

    /**
     * @notice Syncs local maximum invocations of project `_projectId` based on
     * the value currently defined in the core contract. Also syncs the
     * project config's `maxHasBeenInvoked` state. Also configures the project
     * to use the core contract's maximum invocations value, and not the local
     * manual limit set on the minter.
     * WARNING - If relying on the local maximum invocations value, BE SURE TO
     * COLLECT REVENUES BEFORE CALLING THIS FUNCTION. Otherwise, the local
     * maximum invocations value will be set to the core contract's maximum
     * invocations value, and the auction will be able to be invoked again,
     * potentially reducing the artist's revenue below sellout price.
     * @param _projectId Project ID to set the maximum invocations for.
     * @dev this enables gas reduction after maxInvocations have been reached -
     * core contracts shall still enforce a maxInvocation check during mint.
     */
    function setProjectMaxInvocations(
        uint256 _projectId
    ) external onlyArtist(_projectId) {
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        // stop using minter's local maxInvocations value
        _projectConfig.useLocalMaxInvocations = false;
        // sync cached core maxInvocations and invocations values
        uint256 maxInvocations;
        uint256 invocations;
        (
            invocations,
            maxInvocations
        ) = _getProjectCoreInvocationsAndMaxInvocations(_projectId);

        // update storage with results
        _projectConfig.maxInvocationsCoreCached = uint24(maxInvocations);

        // We need to ensure maxHasBeenInvoked is correctly set after manually syncing the
        // local maxInvocations value with the core contract's maxInvocations value.
        // This synced value of maxInvocations from the core contract will always be greater
        // than or equal to the previous value of maxInvocations stored locally.
        _projectConfig.maxHasBeenInvokedCoreCached =
            invocations == maxInvocations;

        emit ProjectMaxInvocationsLimitUpdated(_projectId, maxInvocations);
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
    ) external onlyArtist(_projectId) {
        // CHECKS
        // ensure that the manually set maxInvocations is not greater than what is set on the core contract
        uint256 maxInvocationsCore;
        uint256 invocationsCore;
        (invocationsCore, maxInvocationsCore, , , , ) = genArtCoreContract_Base
            .projectStateData(_projectId);
        require(
            _maxInvocations <= maxInvocationsCore,
            "Cannot increase project max invocations above core contract set project max invocations"
        );
        require(
            _maxInvocations >= invocationsCore,
            "Cannot set project max invocations to less than current invocations"
        );
        // EFFECTS
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        // update storage with results
        _projectConfig.maxInvocationsLocal = uint24(_maxInvocations);
        // We need to ensure maxHasBeenInvoked is correctly set after manually setting the
        // local maxInvocations value.
        _projectConfig.maxHasBeenInvokedLocal =
            invocationsCore == _maxInvocations;
        // configure the project to use the local minter's maxInvocations value
        _projectConfig.useLocalMaxInvocations = true;

        emit ProjectMaxInvocationsLimitUpdated(_projectId, _maxInvocations);
    }

    /**
     * @notice Warning: Disabling purchaseTo is not supported on this minter.
     * This method exists purely for interface-conformance purposes.
     */
    function togglePurchaseToDisabled(
        uint256 _projectId
    ) external view onlyArtist(_projectId) {
        revert("Action not supported");
    }

    /**
     * @notice projectId => has project reached its maximum number of
     * invocations?
     * Note that this returns a local cached value on the minter, and may be
     * out of sync with the core core contract's state, in which it may return
     * a false negative.
     */
    function projectMaxHasBeenInvoked(
        uint256 _projectId
    ) external view returns (bool) {
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        return
            _projectConfig.useLocalMaxInvocations
                ? _projectConfig.maxHasBeenInvokedLocal
                : _projectConfig.maxHasBeenInvokedCoreCached;
    }

    /**
     * @notice projectId => project's maximum number of invocations.
     * Note that this returns a local cached value, and may be manually
     * limited to be different than the core contract's maxInvocations,
     * or may be out of sync with the core contract's maxInvocations state.
     */
    function projectMaxInvocations(
        uint256 _projectId
    ) external view returns (uint256) {
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        return
            _projectConfig.useLocalMaxInvocations
                ? _projectConfig.maxInvocationsLocal
                : _projectConfig.maxInvocationsCoreCached;
    }

    /**
     * @notice projectId => auction parameters
     */
    function projectAuctionParameters(
        uint256 _projectId
    )
        external
        view
        returns (
            uint256 timestampStart,
            uint256 priceDecayHalfLifeSeconds,
            uint256 startPrice,
            uint256 basePrice
        )
    {
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        return (
            _projectConfig.timestampStart,
            _projectConfig.priceDecayHalfLifeSeconds,
            _projectConfig.startPrice,
            _projectConfig.basePrice
        );
    }

    /**
     * @notice Sets the minimum and maximum values that are settable for
     * `_priceDecayHalfLifeSeconds` across all projects.
     * @param _minimumPriceDecayHalfLifeSeconds Minimum price decay half life
     * (in seconds).
     * @param _maximumPriceDecayHalfLifeSeconds Maximum price decay half life
     * (in seconds).
     */
    function setAllowablePriceDecayHalfLifeRangeSeconds(
        uint256 _minimumPriceDecayHalfLifeSeconds,
        uint256 _maximumPriceDecayHalfLifeSeconds
    )
        external
        onlyCoreAdminACL(
            this.setAllowablePriceDecayHalfLifeRangeSeconds.selector
        )
    {
        require(
            _maximumPriceDecayHalfLifeSeconds >
                _minimumPriceDecayHalfLifeSeconds,
            "Maximum half life must be greater than minimum"
        );
        require(
            _minimumPriceDecayHalfLifeSeconds > 0,
            "Half life of zero not allowed"
        );
        minimumPriceDecayHalfLifeSeconds = _minimumPriceDecayHalfLifeSeconds;
        maximumPriceDecayHalfLifeSeconds = _maximumPriceDecayHalfLifeSeconds;
        emit AuctionHalfLifeRangeSecondsUpdated(
            _minimumPriceDecayHalfLifeSeconds,
            _maximumPriceDecayHalfLifeSeconds
        );
    }

    ////// Auction Functions
    /**
     * @notice Sets auction details for project `_projectId`.
     * @param _projectId Project ID to set auction details for.
     * @param _auctionTimestampStart Timestamp at which to start the auction.
     * @param _priceDecayHalfLifeSeconds The half life with which to decay the
     *  price (in seconds).
     * @param _startPrice Price at which to start the auction, in Wei.
     * If a previous auction existed on this minter and at least one settleable
     * purchase has been made, this value must be less than or equal to the
     * price when the previous auction was paused. This enforces an overall
     * monatonically decreasing auction. Must be greater than or equal to
     * max(uint128) for internal storage packing purposes.
     * @param _basePrice Resting price of the auction, in Wei. Must be greater
     * than or equal to max(uint128) for internal storage packing purposes.
     * @dev Note that setting the auction price explicitly to `0` is
     * intentionally not allowed. This allows the minter to use the assumption
     * that a price of `0` indicates that the auction is not configured.
     * @dev Note that prices must be <= max(128) for internal storage packing
     * efficiency purposes only. This function's interface remains unchanged
     * for interface conformance purposes.
     */
    function setAuctionDetails(
        uint256 _projectId,
        uint256 _auctionTimestampStart,
        uint256 _priceDecayHalfLifeSeconds,
        uint256 _startPrice,
        uint256 _basePrice
    ) external onlyArtist(_projectId) {
        // CHECKS
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        require(
            _projectConfig.timestampStart == 0 ||
                block.timestamp < _projectConfig.timestampStart,
            "No modifications mid-auction"
        );
        require(
            block.timestamp < _auctionTimestampStart,
            "Only future auctions"
        );
        require(
            _startPrice > _basePrice,
            "Auction start price must be greater than auction end price"
        );
        // require _basePrice is non-zero to simplify logic of this minter
        require(_basePrice > 0, "Base price must be non-zero");
        // If previous purchases have been made, require monotonically
        // decreasing purchase prices to preserve settlement and revenue
        // claiming logic. Since base price is always non-zero, if
        // latestPurchasePrice is zero, then no previous purchases have been
        // made, and startPrice may be set to any value.
        require(
            _projectConfig.latestPurchasePrice == 0 || // never purchased
                _startPrice <= _projectConfig.latestPurchasePrice,
            "Auction start price must be <= latest purchase price"
        );
        require(
            (_priceDecayHalfLifeSeconds >= minimumPriceDecayHalfLifeSeconds) &&
                (_priceDecayHalfLifeSeconds <=
                    maximumPriceDecayHalfLifeSeconds),
            "Price decay half life must fall between min and max allowable values"
        );
        // EFFECTS
        // refresh cache of max invocations if using core value (convenience only)
        if (!_projectConfig.useLocalMaxInvocations) {
            _syncProjectMaxInvocationsCoreCached(_projectId);
        }
        _projectConfig.timestampStart = _auctionTimestampStart.toUint64();
        _projectConfig.priceDecayHalfLifeSeconds = _priceDecayHalfLifeSeconds
            .toUint64();
        _projectConfig.startPrice = _startPrice.toUint128();
        _projectConfig.basePrice = _basePrice.toUint128();

        emit SetAuctionDetails(
            _projectId,
            _auctionTimestampStart,
            _priceDecayHalfLifeSeconds,
            _startPrice,
            _basePrice
        );
    }

    /**
     * @notice Resets auction details for project `_projectId`, zero-ing out all
     * relevant auction fields. Not intended to be used in normal auction
     * operation, but rather only in case of the need to reset an ongoing
     * auction. An expected time this might occur would be when a frontend
     * issue was occuring, and many typical users are actively being prevented
     * from easily minting (even though minting would technically be possible
     * directly from the contract).
     * This function is only callable by the core admin during an active
     * auction, before revenues have been collected.
     * The price at the time of the reset will be the maximum starting price
     * when re-configuring the next auction if one or more settleable purchases
     * have been made.
     * This is to ensure that purchases up through the block that this is
     * called on will remain settleable, and that revenue claimed does not
     * surpass (payments - excess_settlement_funds) for a given project.
     * @param _projectId Project ID to set auction details for.
     */
    function resetAuctionDetails(
        uint256 _projectId
    ) external onlyCoreAdminACL(this.resetAuctionDetails.selector) {
        // CHECKS
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        require(_projectConfig.startPrice != 0, "Auction must be configured");
        // no reset after revenues collected, since that solidifies amount due
        require(
            !_projectConfig.auctionRevenuesCollected,
            "Only before revenues collected"
        );
        // EFFECTS
        // reset to initial values
        _projectConfig.timestampStart = 0;
        _projectConfig.priceDecayHalfLifeSeconds = 0;
        _projectConfig.startPrice = 0;
        _projectConfig.basePrice = 0;
        // Since auction revenues have not been collected, we can safely assume
        // that numSettleableInvocations is the number of purchases made on
        // this minter. A dummy value of 0 is used for latest purchase price if
        // no purchases have been made.
        emit ResetAuctionDetails(
            _projectId,
            _projectConfig.numSettleableInvocations,
            _projectConfig.latestPurchasePrice
        );
    }

    /**
     * @notice This represents an admin stepping in and reducing the sellout
     * price of an auction. This is only callable by the core admin, only
     * after the auction is complete, but before project revenues are
     * withdrawn.
     * This is only intended to be used in the case where for some reason, the
     * sellout price was too high.
     * @param _projectId Project ID to reduce auction sellout price for.
     * @param _newSelloutPrice New sellout price to set for the auction. Must
     * be less than the current sellout price.
     */
    function adminEmergencyReduceSelloutPrice(
        uint256 _projectId,
        uint256 _newSelloutPrice
    )
        external
        onlyCoreAdminACL(this.adminEmergencyReduceSelloutPrice.selector)
    {
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        require(
            !_projectConfig.auctionRevenuesCollected,
            "Only before revenues collected"
        );
        // refresh cache of max invocations if using core values
        bool useLocalMaxInvocations = _projectConfig.useLocalMaxInvocations;
        if (!useLocalMaxInvocations) {
            _syncProjectMaxInvocationsCoreCached(_projectId);
        }
        bool hasMaxBeenInvoked = useLocalMaxInvocations
            ? _projectConfig.maxHasBeenInvokedLocal
            : _projectConfig.maxHasBeenInvokedCoreCached;
        require(hasMaxBeenInvoked, "Auction must be complete");
        // @dev no need to check that auction max invocations has been reached,
        // because if it was, the sellout price will be zero, and the following
        // check will fail.
        require(
            _newSelloutPrice < _projectConfig.latestPurchasePrice,
            "May only reduce sellout price"
        );
        require(
            _newSelloutPrice >= _projectConfig.basePrice,
            "May only reduce sellout price to base price or greater"
        );
        // ensure _newSelloutPrice is non-zero
        require(_newSelloutPrice > 0, "Only sellout prices > 0");
        _projectConfig.latestPurchasePrice = _newSelloutPrice;
        emit SelloutPriceUpdated(_projectId, _newSelloutPrice);
    }

    /**
     * @notice This withdraws project revenues for the artist and admin.
     * This function is only callable by the artist or admin, and only after
     * one of the following is true:
     * - the auction has sold out above base price
     * - the auction has reached base price
     * Note that revenues are not claimable if in a temporary state after
     * an auction is reset.
     * Revenues may only be collected a single time per project.
     * After revenues are collected, auction parameters will never be allowed
     * to be reset, and excess settlement funds will become immutable and fully
     * deterministic.
     */
    function withdrawArtistAndAdminRevenues(
        uint256 _projectId
    )
        external
        nonReentrant
        onlyCoreAdminACLOrArtist(
            _projectId,
            this.withdrawArtistAndAdminRevenues.selector
        )
    {
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        // CHECKS
        // require revenues to not have already been collected
        require(
            !_projectConfig.auctionRevenuesCollected,
            "Revenues already collected"
        );
        // refresh cache of max invocations if using core values
        bool useLocalMaxInvocations = _projectConfig.useLocalMaxInvocations;
        if (!useLocalMaxInvocations) {
            _syncProjectMaxInvocationsCoreCached(_projectId);
        }

        // get the current net price of the auction - reverts if no auction
        // is configured.
        // @dev we use _getPriceUnsafe here, since we just safely synced the
        // project's max invocations and maxHasBeenInvoked, which guarantees
        // an accurate price calculation from _getPriceUnsafe, while being
        // more gas efficient than _getPriceSafe.
        // @dev price is guaranteed <= _projectConfig.latestPurchasePrice,
        // since this minter enforces monotonically decreasing purchase prices.
        uint256 _price = _getPriceUnsafe(_projectId);
        // if the price is not base price, require that the auction have
        // reached max invocations. This prevents premature withdrawl
        // before final auction price is possible to know.
        if (_price != _projectConfig.basePrice) {
            // @dev we can trust maxHasBeenInvokedCoreCached, since we just
            // refreshed it above with _syncProjectMaxInvocationsCoreCached, if
            // needed.
            require(
                useLocalMaxInvocations
                    ? _projectConfig.maxHasBeenInvokedLocal
                    : _projectConfig.maxHasBeenInvokedCoreCached,
                "Active auction not yet sold out"
            );
        } else {
            // update the latest purchase price to the base price, to ensure
            // the base price is used for all future settlement calculations
            _projectConfig.latestPurchasePrice = _projectConfig.basePrice;
        }
        // EFFECTS
        _projectConfig.auctionRevenuesCollected = true;
        // if the price is base price, the auction is valid and may be claimed
        // calculate the artist and admin revenues
        uint256 netRevenues = _projectConfig.numSettleableInvocations * _price;
        // INTERACTIONS
        splitRevenuesETH(_projectId, netRevenues, genArt721CoreAddress);
        emit ArtistAndAdminRevenuesWithdrawn(_projectId);
    }

    /**
     * @notice Purchases a token from project `_projectId`.
     * @param _projectId Project ID to mint a token on.
     * @return tokenId Token ID of minted token
     */
    function purchase(
        uint256 _projectId
    ) external payable returns (uint256 tokenId) {
        tokenId = purchaseTo_do6(msg.sender, _projectId);
        return tokenId;
    }

    /**
     * @notice gas-optimized version of purchase(uint256).
     */
    function purchase_H4M(
        uint256 _projectId
    ) external payable returns (uint256 tokenId) {
        tokenId = purchaseTo_do6(msg.sender, _projectId);
        return tokenId;
    }

    /**
     * @notice Purchases a token from project `_projectId` and sets
     * the token's owner to `_to`.
     * @param _to Address to be the new token's owner.
     * @param _projectId Project ID to mint a token on.
     * @return tokenId Token ID of minted token
     */
    function purchaseTo(
        address _to,
        uint256 _projectId
    ) external payable returns (uint256 tokenId) {
        return purchaseTo_do6(_to, _projectId);
    }

    /**
     * @notice gas-optimized version of purchaseTo(address, uint256).
     */
    function purchaseTo_do6(
        address _to,
        uint256 _projectId
    ) public payable nonReentrant returns (uint256 tokenId) {
        // CHECKS
        ProjectConfig storage _projectConfig = projectConfig[_projectId];

        // Note that when deferring to the core contract, the cached
        // maxHasBeenInvokedCachedCore is only checked here to reduce gas
        // consumption after a project has been fully minted. It is locally
        // cached on the minter, and may return a false negative. This is
        // acceptable, since the core contract also enforces its own max
        // invocation check during minting.
        // We do, however, need to enforce the local limit of
        // maxHasBeenInvokedLocal if it is being used, since that is not
        // enforced by the core.
        bool useLocalMaxInvocations = _projectConfig.useLocalMaxInvocations;
        if (useLocalMaxInvocations) {
            require(
                !_projectConfig.maxHasBeenInvokedLocal,
                "Maximum number of invocations reached"
            );
        } else {
            // @dev okay to use cached value here, since we can rely on the
            // core contract to enforce its own max invocation check during
            // minting.
            require(
                !_projectConfig.maxHasBeenInvokedCoreCached,
                "Maximum number of invocations reached"
            );
        }

        // _getPriceUnsafe reverts if auction is unconfigured or has not started
        // @dev _getPriceUnsafe is guaranteed to be accurate unless the core
        // contract is limiting invocations and
        // `_projectConfig.maxHasBeenInvokedCoreCached` is returning a false
        // negative. That is acceptable, because that case will revert this
        // call later on in this function, when the core contract's max
        // invocation check fails.
        uint256 currentPriceInWei = _getPriceUnsafe(_projectId);

        // EFFECTS
        // update the purchaser's receipt and require sufficient net payment
        Receipt storage receipt = receipts[msg.sender][_projectId];

        // in memory copy + update
        uint256 netPosted = receipt.netPosted + msg.value;
        uint256 numPurchased = receipt.numPurchased + 1;

        // require sufficient payment on project
        require(
            netPosted >= numPurchased * currentPriceInWei,
            "Must send minimum value to mint"
        );

        // update Receipt in storage
        // @dev overflow checks are not required since the added values cannot
        // be enough to overflow due to maximum invocations or supply of ETH
        receipt.netPosted = uint232(netPosted);
        receipt.numPurchased = uint24(numPurchased);

        // emit event indicating new receipt state
        emit ReceiptUpdated(msg.sender, _projectId, numPurchased, netPosted);

        // update latest purchase price (on this minter) in storage
        // @dev this is used to enforce monotonically decreasing purchase price
        // across multiple auctions
        _projectConfig.latestPurchasePrice = currentPriceInWei;

        tokenId = minterFilter.mint(_to, _projectId, msg.sender);

        // okay if this underflows because:
        // - if using local max invocations, if maxInvocationsLocal is zero,
        //   maxHasBeenInvokedLocal is already true (we will revert above)
        // - if using core cached max invocations, statement will always eval
        //   false, and we can rely on the core contract to enforce its own max
        //   invocation check during minting.
        unchecked {
            if (useLocalMaxInvocations) {
                // using local max invocations
                if (
                    tokenId % ONE_MILLION ==
                    _projectConfig.maxInvocationsLocal - 1
                ) {
                    _projectConfig.maxHasBeenInvokedLocal = true;
                }
            } else {
                // using core cached max invocations
                if (
                    tokenId % ONE_MILLION ==
                    _projectConfig.maxInvocationsCoreCached - 1
                ) {
                    _projectConfig.maxHasBeenInvokedCoreCached = true;
                }
            }
        }

        // INTERACTIONS
        if (_projectConfig.auctionRevenuesCollected) {
            // if revenues have been collected, split funds immediately.
            // @dev note that we are guaranteed to be at auction base price,
            // since we know we didn't sellout prior to this tx.
            // note that we don't refund msg.sender here, since a separate
            // settlement mechanism is provided on this minter, unrelated to
            // msg.value
            splitRevenuesETH(
                _projectId,
                currentPriceInWei,
                genArt721CoreAddress
            );
        } else {
            // increment the number of settleable invocations that will be
            // claimable by the artist and admin once auction is validated.
            // do not split revenue here since will be claimed at a later time.
            _projectConfig.numSettleableInvocations++;
        }

        return tokenId;
    }

    /**
     * @notice Reclaims the sender's payment above current settled price for
     * project `_projectId`. The current settled price is the the price paid
     * for the most recently purchased token, or the base price if the artist
     * has withdrawn revenues after the auction reached base price.
     * This function is callable at any point, but is expected to typically be
     * called after auction has sold out above base price or after the auction
     * has been purchased at base price. This minimizes the amount of gas
     * required to send all excess settlement funds to the sender.
     * Sends excess settlement funds to msg.sender.
     * @param _projectId Project ID to reclaim excess settlement funds on.
     */
    function reclaimProjectExcessSettlementFunds(uint256 _projectId) external {
        reclaimProjectExcessSettlementFundsTo(payable(msg.sender), _projectId);
    }

    /**
     * @notice Reclaims the sender's payment above current settled price for
     * project `_projectId`. The current settled price is the the price paid
     * for the most recently purchased token, or the base price if the artist
     * has withdrawn revenues after the auction reached base price.
     * This function is callable at any point, but is expected to typically be
     * called after auction has sold out above base price or after the auction
     * has been purchased at base price. This minimizes the amount of gas
     * required to send all excess settlement funds.
     * Sends excess settlement funds to address `_to`.
     * @param _to Address to send excess settlement funds to.
     * @param _projectId Project ID to reclaim excess settlement funds on.
     */
    function reclaimProjectExcessSettlementFundsTo(
        address payable _to,
        uint256 _projectId
    ) public nonReentrant {
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        Receipt storage receipt = receipts[msg.sender][_projectId];
        uint256 numPurchased = receipt.numPurchased;
        // CHECKS
        // input validation
        require(_to != address(0), "No claiming to the zero address");
        // require that a user has purchased at least one token on this project
        require(numPurchased > 0, "No purchases made by this address");
        // get the latestPurchasePrice, which returns the sellout price if the
        // auction sold out before reaching base price, or returns the base
        // price if auction has reached base price and artist has withdrawn
        // revenues.
        // @dev if user is eligible for a reclaiming, they have purchased a
        // token, therefore we are guaranteed to have a populated
        // latestPurchasePrice
        uint256 currentSettledTokenPrice = _projectConfig.latestPurchasePrice;

        // EFFECTS
        // calculate the excess settlement funds amount
        // implicit overflow/underflow checks in solidity ^0.8
        uint256 requiredAmountPosted = numPurchased * currentSettledTokenPrice;
        uint256 excessSettlementFunds = receipt.netPosted -
            requiredAmountPosted;
        // update Receipt in storage
        receipt.netPosted = requiredAmountPosted.toUint232();
        // emit event indicating new receipt state
        emit ReceiptUpdated(
            msg.sender,
            _projectId,
            numPurchased,
            requiredAmountPosted
        );

        // INTERACTIONS
        bool success_;
        (success_, ) = _to.call{value: excessSettlementFunds}("");
        require(success_, "Reclaiming failed");
    }

    /**
     * @notice Reclaims the sender's payment above current settled price for
     * projects in `_projectIds`. The current settled price is the the price
     * paid for the most recently purchased token, or the base price if the
     * artist has withdrawn revenues after the auction reached base price.
     * This function is callable at any point, but is expected to typically be
     * called after auction has sold out above base price or after the auction
     * has been purchased at base price. This minimizes the amount of gas
     * required to send all excess settlement funds to the sender.
     * Sends total of all excess settlement funds to msg.sender in a single
     * chunk. Entire transaction reverts if any excess settlement calculation
     * fails.
     * @param _projectIds Array of project IDs to reclaim excess settlement
     * funds on.
     */
    function reclaimProjectsExcessSettlementFunds(
        uint256[] calldata _projectIds
    ) external {
        reclaimProjectsExcessSettlementFundsTo(
            payable(msg.sender),
            _projectIds
        );
    }

    /**
     * @notice Reclaims the sender's payment above current settled price for
     * projects in `_projectIds`. The current settled price is the the price
     * paid for the most recently purchased token, or the base price if the
     * artist has withdrawn revenues after the auction reached base price.
     * This function is callable at any point, but is expected to typically be
     * called after auction has sold out above base price or after the auction
     * has been purchased at base price. This minimizes the amount of gas
     * required to send all excess settlement funds to the sender.
     * Sends total of all excess settlement funds to `_to` in a single
     * chunk. Entire transaction reverts if any excess settlement calculation
     * fails.
     * @param _to Address to send excess settlement funds to.
     * @param _projectIds Array of project IDs to reclaim excess settlement
     * funds on.
     */
    function reclaimProjectsExcessSettlementFundsTo(
        address payable _to,
        uint256[] memory _projectIds
    ) public nonReentrant {
        // CHECKS
        // input validation
        require(_to != address(0), "No claiming to the zero address");
        // EFFECTS
        // for each project, tally up the excess settlement funds and update
        // the receipt in storage
        uint256 excessSettlementFunds;
        uint256 projectIdsLength = _projectIds.length;
        for (uint256 i; i < projectIdsLength; ) {
            uint256 projectId = _projectIds[i];
            ProjectConfig storage _projectConfig = projectConfig[projectId];
            Receipt storage receipt = receipts[msg.sender][projectId];
            uint256 numPurchased = receipt.numPurchased;
            // input validation
            // require that a user has purchased at least one token on this project
            require(numPurchased > 0, "No purchases made by this address");
            // get the latestPurchasePrice, which returns the sellout price if the
            // auction sold out before reaching base price, or returns the base
            // price if auction has reached base price and artist has withdrawn
            // revenues.
            // @dev if user is eligible for a claim, they have purchased a token,
            // therefore we are guaranteed to have a populated
            // latestPurchasePrice
            uint256 currentSettledTokenPrice = _projectConfig
                .latestPurchasePrice;
            // calculate the excessSettlementFunds amount
            // implicit overflow/underflow checks in solidity ^0.8
            uint256 requiredAmountPosted = numPurchased *
                currentSettledTokenPrice;
            excessSettlementFunds += (receipt.netPosted - requiredAmountPosted);
            // reduce the netPosted (in storage) to value after excess settlement
            // funds deducted
            receipt.netPosted = requiredAmountPosted.toUint232();
            // emit event indicating new receipt state
            emit ReceiptUpdated(
                msg.sender,
                projectId,
                numPurchased,
                requiredAmountPosted
            );
            // gas efficiently increment i
            // won't overflow due to for loop, as well as gas limts
            unchecked {
                ++i;
            }
        }

        // INTERACTIONS
        // send excess settlement funds in a single chunk for all
        // projects
        bool success_;
        (success_, ) = _to.call{value: excessSettlementFunds}("");
        require(success_, "Reclaiming failed");
    }

    /**
     * @notice Gets price of minting a token on project `_projectId` given
     * the project's AuctionParameters and current block timestamp.
     * Reverts if auction has not yet started or auction is unconfigured, and
     * auction has not sold out or revenues have not been withdrawn.
     * Price is guaranteed to be accurate, regardless of the current state of
     * the locally cached minter max invocations.
     * @dev This method is less gas efficient than `_getPriceUnsafe`, but is
     * guaranteed to be accurate.
     * @param _projectId Project ID to get price of token for.
     * @return tokenPriceInWei current price of token in Wei
     * @dev This method calculates price decay using a linear interpolation
     * of exponential decay based on the artist-provided half-life for price
     * decay, `_priceDecayHalfLifeSeconds`.
     */
    function _getPriceSafe(
        uint256 _projectId
    ) private view returns (uint256 tokenPriceInWei) {
        // accurately check if project has sold out
        if (_projectMaxHasBeenInvokedSafe(_projectId)) {
            // max invocations have been reached, return the latest purchased
            // price
            tokenPriceInWei = projectConfig[_projectId].latestPurchasePrice;
        } else {
            // if not sold out, return the current price
            tokenPriceInWei = _getPriceUnsafe(_projectId);
        }
        return tokenPriceInWei;
    }

    /**
     * @notice Gets price of minting a token on project `_projectId` given
     * the project's AuctionParameters and current block timestamp.
     * Reverts if auction has not yet started or auction is unconfigured, and
     * auction has not sold out or revenues have not been withdrawn.
     * Price is guaranteed to be accurate unless the core contract is the
     * entity limiting the number of max invocations, and the minter's local
     * max invocations is stale (i.e. returning a false negative).
     * @dev when an accurate price is required regardless of the current state
     * state of the locally cached minter max invocations, use the less gas
     * efficient function `_getPriceSafe`.
     * @param _projectId Project ID to get price of token for.
     * @return uint256 current price of token in Wei, accurate if minter max
     * invocations are up to date
     * @dev This method calculates price decay using a linear interpolation
     * of exponential decay based on the artist-provided half-life for price
     * decay, `_priceDecayHalfLifeSeconds`.
     */
    function _getPriceUnsafe(
        uint256 _projectId
    ) private view returns (uint256) {
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        // return latest purchase price if:
        // - minter is aware of a sold-out auction (without refreshing cache)
        // - auction revenues have been collected, at which point the
        //   latest purchase price will never change again
        bool hasMaxBeenInvokedNaive = _projectConfig.useLocalMaxInvocations
            ? _projectConfig.maxHasBeenInvokedLocal
            : _projectConfig.maxHasBeenInvokedCoreCached;
        if (hasMaxBeenInvokedNaive || _projectConfig.auctionRevenuesCollected) {
            return _projectConfig.latestPurchasePrice;
        }
        // otherwise calculate price based on current block timestamp and
        // auction configuration (will revert if auction has not started)
        // move parameters to memory if used more than once
        uint256 _timestampStart = uint256(_projectConfig.timestampStart);
        uint256 _priceDecayHalfLifeSeconds = uint256(
            _projectConfig.priceDecayHalfLifeSeconds
        );
        uint256 _basePrice = _projectConfig.basePrice;

        require(block.timestamp > _timestampStart, "Auction not yet started");
        require(_priceDecayHalfLifeSeconds > 0, "Only configured auctions");
        uint256 decayedPrice = _projectConfig.startPrice;
        uint256 elapsedTimeSeconds;
        unchecked {
            // already checked that block.timestamp > _timestampStart above
            elapsedTimeSeconds = block.timestamp - _timestampStart;
        }
        // Divide by two (via bit-shifting) for the number of entirely completed
        // half-lives that have elapsed since auction start time.
        unchecked {
            // already required _priceDecayHalfLifeSeconds > 0
            decayedPrice >>= elapsedTimeSeconds / _priceDecayHalfLifeSeconds;
        }
        // Perform a linear interpolation between partial half-life points, to
        // approximate the current place on a perfect exponential decay curve.
        unchecked {
            // value of expression is provably always less than decayedPrice,
            // so no underflow is possible when the subtraction assignment
            // operator is used on decayedPrice.
            decayedPrice -=
                (decayedPrice *
                    (elapsedTimeSeconds % _priceDecayHalfLifeSeconds)) /
                _priceDecayHalfLifeSeconds /
                2;
        }
        if (decayedPrice < _basePrice) {
            // Price may not decay below stay `basePrice`.
            return _basePrice;
        }
        return decayedPrice;
    }

    /**
     * @notice Gets the current excess settlement funds on project `_projectId`
     * for address `_walletAddress`. The returned value is expected to change
     * throughtout an auction, since the latest purchase price is used when
     * determining excess settlement funds.
     * A user may claim excess settlement funds by calling the function
     * `reclaimProjectExcessSettlementFunds(_projectId)`.
     * @param _projectId Project ID to query.
     * @param _walletAddress Account address for which the excess posted funds
     * is being queried.
     * @return excessSettlementFundsInWei Amount of excess settlement funds, in
     * wei
     */
    function getProjectExcessSettlementFunds(
        uint256 _projectId,
        address _walletAddress
    ) external view returns (uint256 excessSettlementFundsInWei) {
        // input validation
        require(_walletAddress != address(0), "No zero address");
        // load struct from storage
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        Receipt storage receipt = receipts[_walletAddress][_projectId];
        // require that a user has purchased at least one token on this project
        require(receipt.numPurchased > 0, "No purchases made by this address");
        // get the latestPurchasePrice, which returns the sellout price if the
        // auction sold out before reaching base price, or returns the base
        // price if auction has reached base price and artist has withdrawn
        // revenues.
        // @dev if user is eligible for a reclaiming, they have purchased a
        // token, therefore we are guaranteed to have a populated
        // latestPurchasePrice
        uint256 currentSettledTokenPrice = _projectConfig.latestPurchasePrice;

        // EFFECTS
        // calculate the excess settlement funds amount and return
        // implicit overflow/underflow checks in solidity ^0.8
        uint256 requiredAmountPosted = receipt.numPurchased *
            currentSettledTokenPrice;
        excessSettlementFundsInWei = receipt.netPosted - requiredAmountPosted;
        return excessSettlementFundsInWei;
    }

    /**
     * @notice Gets the latest purchase price for project `_projectId`, or 0 if
     * no purchases have been made.
     */
    function getProjectLatestPurchasePrice(
        uint256 _projectId
    ) external view returns (uint256 latestPurchasePrice) {
        return projectConfig[_projectId].latestPurchasePrice;
    }

    /**
     * @notice Gets the number of settleable invocations for project `_projectId`.
     */
    function getNumSettleableInvocations(
        uint256 _projectId
    ) external view returns (uint256 numSettleableInvocations) {
        return projectConfig[_projectId].numSettleableInvocations;
    }

    /**
     * @notice Gets if price of token is configured, price of minting a
     * token on project `_projectId`, and currency symbol and address to be
     * used as payment. Supersedes any core contract price information.
     * @param _projectId Project ID to get price information for.
     * @return isConfigured true only if project's auction parameters have been
     * configured on this minter
     * @return tokenPriceInWei current price of token on this minter - invalid
     * if auction has not yet been configured
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

        isConfigured = (_projectConfig.startPrice > 0);
        if (block.timestamp <= _projectConfig.timestampStart) {
            // Provide a reasonable value for `tokenPriceInWei` when it would
            // otherwise revert, using the starting price before auction starts.
            tokenPriceInWei = _projectConfig.startPrice;
        } else if (_projectConfig.startPrice == 0) {
            // In the case of unconfigured auction, return price of zero when
            // it would otherwise revert
            tokenPriceInWei = 0;
        } else {
            tokenPriceInWei = _getPriceSafe(_projectId);
        }
        currencySymbol = "ETH";
        currencyAddress = address(0);
    }

    /**
     * @notice Refreshes the cached values of the core contract's maxInvocation
     * state.
     * Also updates the project config's `maxHasBeenInvokedCoreCached` state.
     * This does not affect the project's `useLocalMaxInvocations` state.
     * @param _projectId Project ID to set the maximum invocations for.
     */
    function _syncProjectMaxInvocationsCoreCached(uint256 _projectId) internal {
        uint256 coreMaxInvocations;
        uint256 coreInvocations;
        (
            coreInvocations,
            coreMaxInvocations
        ) = _getProjectCoreInvocationsAndMaxInvocations(_projectId);
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        // update storage with results, emit event after change
        _projectConfig.maxInvocationsCoreCached = uint24(coreMaxInvocations);
        _projectConfig.maxHasBeenInvokedCoreCached =
            coreMaxInvocations == coreInvocations;

        emit ProjectMaxInvocationsLimitUpdated(_projectId, coreMaxInvocations);
    }

    /**
     * @notice Returns the current invocations and maximum invocations of
     * project `_projectId` from the core contract.
     * @param _projectId Project ID to get invocations and maximum invocations
     * for.
     * @return invocations current invocations of project.
     * @return maxInvocations maximum invocations of project.
     */
    function _getProjectCoreInvocationsAndMaxInvocations(
        uint256 _projectId
    ) internal view returns (uint256 invocations, uint256 maxInvocations) {
        (invocations, maxInvocations, , , , ) = genArtCoreContract_Base
            .projectStateData(_projectId);
    }

    /**
     * @notice Returns true if the project `_projectId` is sold out, false
     * otherwise. This function returns an accurate value regardless of whether
     * the project's maximum invocations value cached locally on the minter is
     * up to date with the core contract's maximum invocations value.
     * @param _projectId Project ID to check if sold out.
     * @return bool true if the project is sold out, false otherwise.
     * @dev this is a view method, and will not update the minter's local
     * cached state.
     */
    function _projectMaxHasBeenInvokedSafe(
        uint256 _projectId
    ) internal view returns (bool) {
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        if (_projectConfig.useLocalMaxInvocations) {
            // value is locally defined and up to date
            return _projectConfig.maxHasBeenInvokedLocal;
        }
        // not using local max invocations, so get from core contract
        uint256 coreInvocations;
        uint256 coreMaxInvocations;
        (
            coreInvocations,
            coreMaxInvocations
        ) = _getProjectCoreInvocationsAndMaxInvocations(_projectId);
        return (coreInvocations == coreMaxInvocations);
    }
}
