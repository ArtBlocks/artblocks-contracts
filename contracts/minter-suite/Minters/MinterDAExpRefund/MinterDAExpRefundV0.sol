// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../../../interfaces/0.8.x/IGenArt721CoreContractV3.sol";
import "../../../interfaces/0.8.x/IMinterFilterV0.sol";
import "../../../interfaces/0.8.x/IFilteredMinterDAExpRefundV0.sol";

import "@openzeppelin-4.5/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin-4.5/contracts/utils/math/SafeCast.sol";

pragma solidity 0.8.17;

/**
 * @title Filtered Minter contract that allows tokens to be minted with ETH.
 * Pricing is achieved using an automated Dutch-auction mechanism, with a
 * refund mechanism for tokens purchased before the auction ends.
 * This is designed to be used with IGenArt721CoreContractV3 contracts.
 * @author Art Blocks Inc.
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
 * - setAllowablePriceDecayHalfLifeRangeSeconds (note: this range is only
 *   enforced when creating new auctions)
 * - resetAuctionDetails (note: this will prevent minting until a new auction
 *   is created)
 * - TODO
 * ----------------------------------------------------------------------------
 * The following functions are restricted to a project's artist:
 * - setAuctionDetails (note: this may only be called when there is no active
 *   auction)
 * - TODO
 * ----------------------------------------------------------------------------
 * Additional admin and artist privileged roles may be described on other
 * contracts that this minter integrates with.
 *
 * @dev Note that while this minter makes use of `block.timestamp` and it is
 * technically possible that this value is manipulated by block producers, such
 * manipulation will not have material impact on the price values of this minter
 * given the business practices for how pricing is congfigured for this minter
 * and that variations on the order of less than a minute should not
 * meaningfully impact price given the minimum allowable price decay rate that
 * this minter intends to support.
 */
contract MinterDAExpRefundV0 is ReentrancyGuard, IFilteredMinterDAExpRefundV0 {
    using SafeCast for uint256;

    /// Core contract address this minter interacts with
    address public immutable genArt721CoreAddress;

    /// This contract handles cores with interface IV3
    IGenArt721CoreContractV3 private immutable genArtCoreContract;

    /// Minter filter address this minter interacts with
    address public immutable minterFilterAddress;

    /// Minter filter this minter may interact with.
    IMinterFilterV0 private immutable minterFilter;

    /// minterType for this minter
    string public constant minterType = "MinterDAExpRefundV0";

    uint256 constant ONE_MILLION = 1_000_000;

    struct ProjectConfig {
        // this value is updated only if maxHasBeenInvoked is true, and
        // represents the purchase price of the final token during a sellout
        // auction. If a sellout is not achieved before the auction ends (i.e.
        // reaches base price), this value will be 0.
        uint256 selloutPrice;
        // on this minter, hasMaxBeenInvoked is updated only during every
        // purchase, and is only true if this minter minted the final token.
        // this enables the minter to know when a sellout price is greater than
        // the auction's base price.
        bool maxHasBeenInvoked;
        // set to true by the admin if the auction has ended and the sellout
        // price is considered verified and final. This is not necessary to be
        // true if the auction did not sell out before reaching base price,
        // since base price is the lowest possible price.
        bool auctionIsVerifiedComplete;
        // number of tokens minted that have potential of future refunds.
        // max uint24 > 16.7 million tokens > 1 million tokens/project max
        uint24 numRefundableInvocations;
        // max uint64 ~= 1.8e19 sec ~= 570 billion years
        uint64 timestampStart;
        uint64 priceDecayHalfLifeSeconds;
        uint256 startPrice;
        uint256 basePrice;
    }

    mapping(uint256 => ProjectConfig) public projectConfig;

    /// Minimum price decay half life: price must decay with a half life of at
    /// least this amount (must cut in half at least every N seconds).
    uint256 public minimumPriceDecayHalfLifeSeconds = 300; // 5 minutes
    /// Maximum price decay half life: price may decay with a half life of no
    /// more than this amount (may cut in half at no more than every N seconds).
    uint256 public maximumPriceDecayHalfLifeSeconds = 3600; // 60 minutes

    struct Receipt {
        uint256 netPaid;
        uint256 numPurchased;
    }
    /// user address => project ID => receipt
    mapping(address => mapping(uint256 => Receipt)) receipts;

    // modifier to restrict access to only AdminACL or the artist
    modifier onlyCoreAdminACLOrArtist(uint256 _projectId, bytes4 _selector) {
        require(
            (msg.sender ==
                genArtCoreContract.projectIdToArtistAddress(_projectId)) ||
                (
                    genArtCoreContract.adminACLAllowed(
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
            genArtCoreContract.adminACLAllowed(
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
                genArtCoreContract.projectIdToArtistAddress(_projectId)),
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
    constructor(address _genArt721Address, address _minterFilter)
        ReentrancyGuard()
    {
        genArt721CoreAddress = _genArt721Address;
        genArtCoreContract = IGenArt721CoreContractV3(_genArt721Address);
        minterFilterAddress = _minterFilter;
        minterFilter = IMinterFilterV0(_minterFilter);
        require(
            minterFilter.genArt721CoreAddress() == _genArt721Address,
            "Illegal contract pairing"
        );
    }

    /**
     * @notice This function is not implemented on this minter, and exists only
     * for interface conformance reasons. This minter checks if max invocations
     * have been reached during every purchase to determine if a sellout has
     * occurred. Therefore, the local caching of max invocations is not
     * beneficial or necessary.
     */
    function setProjectMaxInvocations(
        uint256 /*_projectId*/
    ) external pure {
        // not implemented because maxInvocations must be checked during every mint
        // to know if final price should be set
        revert(
            "setProjectMaxInvocations not implemented - updated during every mint"
        );
    }

    /**
     * @notice Warning: Disabling purchaseTo is not supported on this minter.
     * This method exists purely for interface-conformance purposes.
     */
    function togglePurchaseToDisabled(uint256 _projectId)
        external
        view
        onlyArtist(_projectId)
    {
        revert("Action not supported");
    }

    /**
     * @notice projectId => has project reached its maximum number of
     * invocations while being minted with this minter?
     * Note that this returns a local cache of the core contract's
     * state, and may be out of sync with the core contract. This is
     * intentional. A false negative will only result in a gas cost increase,
     * since the core contract will still enforce max invocations during during
     * minting. A false negative will also only occur if the max invocations
     * was either reduced on the core contract to equal current invocations, or
     * if the max invocations was reached by minting on a different minter.
     * In both of these cases, we expect the net purchase price (after refund)
     * shall be the base price of the project's auction. This prevents an
     * an artist from benefiting by reducing max invocations on the core mid-
     * auction, or by minting on a different minter.
     * Note that if an artist wishes to reduce the max invocations on the core
     * to something less than the current invocations, but more than max
     * invocations (with the hope of increasing the sellout price), an admin
     * function is provided to manually reduce the sellout price to a lower
     * value, if desired, in the `adminEmergencyReduceAuctionSelloutPrice`
     * function.
     * @param _projectId projectId to be queried
     *
     */
    function projectMaxHasBeenInvoked(uint256 _projectId)
        external
        view
        returns (bool)
    {
        return projectConfig[_projectId].maxHasBeenInvoked;
    }

    /**
     * @notice projectId => auction parameters
     */
    function projectAuctionParameters(uint256 _projectId)
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
     * @param _basePrice Resting price of the auction, in Wei.
     * @dev Note that it is intentionally supported here that the configured
     * price may be explicitly set to `0`.
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
        require(
            (_priceDecayHalfLifeSeconds >= minimumPriceDecayHalfLifeSeconds) &&
                (_priceDecayHalfLifeSeconds <=
                    maximumPriceDecayHalfLifeSeconds),
            "Price decay half life must fall between min and max allowable values"
        );
        // EFFECTS
        _projectConfig.timestampStart = _auctionTimestampStart.toUint64();
        _projectConfig.priceDecayHalfLifeSeconds = _priceDecayHalfLifeSeconds
            .toUint64();
        _projectConfig.startPrice = _startPrice;
        _projectConfig.basePrice = _basePrice;

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
     * operation, but rather only in case of the need to prevent an auction.
     * This function is only callable by the core admin before an auction has
     * had any refundable purchases have been made. Once a refundable purchase
     * has been made, there is no way to reset the auction details.
     * This is because a refundable purchase represents an agreement between
     * the purchaser and the artist, and the artist should not be able to
     * change the terms of that agreement.
     * @param _projectId Project ID to set auction details for.
     */
    function resetAuctionDetails(uint256 _projectId)
        external
        onlyCoreAdminACL(this.resetAuctionDetails.selector)
    {
        // CHECKS
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        // once one or more refundable purchase have been made on this minter,
        // a project's auction cannot be reset due to refunds possible on this minter
        require(
            _projectConfig.numRefundableInvocations == 0,
            "No modifications after refundable purchases"
        );
        // EFFECTS
        // reset to initial values
        _projectConfig.timestampStart = 0;
        _projectConfig.priceDecayHalfLifeSeconds = 0;
        _projectConfig.startPrice = 0;
        _projectConfig.basePrice = 0;

        emit ResetAuctionDetails(_projectId);
    }

    /**
     * @notice This represents an admin stepping in and reducing the sellout
     * price of an auction. This is only callable by the core admin, only
     * before the auction is marked as valid (which enables the artist or admin
     * to initiate admin and artist withdrawals).
     * This is only intended to be used in the case where for some reason,
     * whether malicious or accidental, the sellout price was too high.
     * Examples of this include:
     *  - The artist reducing a project's maxInvocations on the core contract
     *    after an auction has started, but before it ends, eliminating the
     *    ability of purchasers to fairly determine market price under the
     *    original, expected auction parameters.
     *  - Any other reason the admin deems to be a valid reason to reduce the
     *    sellout price of an auction, prior to marking it as valid.
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
        // @dev no need to check that auction max invocations has been reached,
        // because if it was, the sellout price will be zero, and the following
        // check will fail.
        require(
            _newSelloutPrice < _projectConfig.selloutPrice,
            "May only reduce sellout price"
        );
        require(
            _newSelloutPrice >= _projectConfig.basePrice,
            "May only reduce sellout price to base price or greater"
        );
        require(
            _projectConfig.auctionIsVerifiedComplete == false,
            "Auction already verified"
        );
        _projectConfig.selloutPrice = _newSelloutPrice;
        emit SelloutPriceUpdated(_projectId, _newSelloutPrice);
    }

    /**
     * @notice This represents an admin agreeing with the auction's sellout
     * price (if it is a sellout auction) and marking the auction as valid.
     * This is only callable by the core admin, only after the auction has
     * sold out.
     * This function is only required to be called in the case where an auction
     * is a sellout auction, in which case it must be called before the artist
     * or admin can withdraw funds. It is not required to be called in the case
     * of a non-sellout auction, because in that case, the auction reached its
     * base price, which is the lowest possible price, and therefore is
     * considered valid and fair by default.
     * This is intended to provide a mechanism for the admin to prevent an
     * artist from withdrawing funds from an auction that has sold out, but did
     * not sell out at a price that the admin deems to be fair. See the comment
     * in the `adminEmergencyReduceSelloutPrice` function for examples.
     * @param _projectId Project ID to mark auction as valid for.
     */
    function adminValidateSelloutPrice(uint256 _projectId)
        external
        onlyCoreAdminACL(this.adminValidateSelloutPrice.selector)
    {
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        // may only be called after the auction has hit max invocations while
        // minting on this minter.
        require(_projectConfig.maxHasBeenInvoked, "Auction must be sellout");
        // only callable when the sellout price is greater than auction base price
        require(
            _projectConfig.selloutPrice > projectConfig[_projectId].basePrice,
            "Only sellout price greater than base price"
        );
        // update state
        _projectConfig.auctionIsVerifiedComplete = true;
        emit SelloutPriceValidated(_projectId, _projectConfig.selloutPrice);
    }

    /**
     * @notice This withdraws project revenues for the artist and admin.
     * This function is only callable by the artist or admin, and only after
     * one of the following is true:
     * - The auction has sold out above base price, and the admin has validated
     *   the sellout price.
     * - The auction has reached base price, and therefore is considered valid
     *   by default.
     */
    function withdrawArtistAndAdminRevenues(uint256 _projectId)
        external
        onlyCoreAdminACLOrArtist(
            _projectId,
            this.withdrawArtistAndAdminRevenues.selector
        )
    {
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        // get the current net price of the auction
        uint256 _price = _getPrice(_projectId);
        // if the price is not base price, the auction is only valid if the
        // admin has validated the sellout price (since price is monotonically
        // decreasing).
        if (_price != _projectConfig.basePrice) {
            require(
                _projectConfig.auctionIsVerifiedComplete,
                "Auction not yet verified"
            );
        }
        // if the price is base price, the auction is valid and may be claimed
        // calculate the artist and admin revenues (no check requuired)
        uint256 netRevenues = _projectConfig.numRefundableInvocations * _price;
        _splitETHRevenues(_projectId, netRevenues);
        emit ArtistAndAdminRevenuesWithdrawn(_projectId);
    }

    /**
     * @notice Purchases a token from project `_projectId`.
     * @param _projectId Project ID to mint a token on.
     * @return tokenId Token ID of minted token
     */
    function purchase(uint256 _projectId)
        external
        payable
        returns (uint256 tokenId)
    {
        tokenId = purchaseTo_do6(msg.sender, _projectId);
        return tokenId;
    }

    /**
     * @notice gas-optimized version of purchase(uint256).
     */
    function purchase_H4M(uint256 _projectId)
        external
        payable
        returns (uint256 tokenId)
    {
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
    function purchaseTo(address _to, uint256 _projectId)
        external
        payable
        returns (uint256 tokenId)
    {
        return purchaseTo_do6(_to, _projectId);
    }

    /**
     * @notice gas-optimized version of purchaseTo(address, uint256).
     */
    function purchaseTo_do6(address _to, uint256 _projectId)
        public
        payable
        nonReentrant
        returns (uint256 tokenId)
    {
        // CHECKS
        ProjectConfig storage _projectConfig = projectConfig[_projectId];

        // Note that `maxHasBeenInvoked` is only checked here to reduce gas
        // consumption after a project has been fully minted.
        // `_projectConfig.maxHasBeenInvoked` is locally cached during every
        // purchase to reduce gas consumption and enable recording of sellout
        // price, but if not in sync with the core contract's value,
        // the core contract also enforces its own max invocation check during
        // minting.
        require(
            !_projectConfig.maxHasBeenInvoked,
            "Maximum number of invocations reached"
        );

        // _getPrice reverts if auction is unconfigured or has not started
        uint256 currentPriceInWei = _getPrice(_projectId);

        // EFFECTS
        // update the purchaser's receipt and require sufficient net payment
        Receipt storage _receipt = receipts[msg.sender][_projectId];
        _receipt.netPaid += msg.value;
        _receipt.numPurchased++;
        require(
            _receipt.numPurchased * currentPriceInWei >= _receipt.netPaid,
            "Must send minimum value to mint!"
        );
        // emit event indicating new receipt state
        emit ReceiptUpdated(
            msg.sender,
            _projectId,
            _receipt.numPurchased,
            _receipt.netPaid
        );

        tokenId = minterFilter.mint(_to, _projectId, msg.sender);

        // Note that this requires that the core contract's maxInvocations
        // be accurate to ensure that the minters selloutPrice is accurate,
        // so we get the value from the core contract directly.
        uint256 maxInvocations;
        (, maxInvocations, , , , ) = genArtCoreContract.projectStateData(
            _projectId
        );
        // okay if this underflows because if statement will always eval false.
        // this is only for gas optimization and recording selloutPrice
        // (core enforces maxInvocations).
        unchecked {
            if (tokenId % ONE_MILLION == maxInvocations - 1) {
                _projectConfig.maxHasBeenInvoked = true;
                _projectConfig.selloutPrice = currentPriceInWei;
                emit SelloutPriceUpdated(_projectId, currentPriceInWei);
            }
        }

        // INTERACTIONS
        if (currentPriceInWei == _projectConfig.basePrice) {
            // if the price is base price, split funds immediately since
            // the auction is already at minimum price, and is valid by default.
            // note that we don't refund msg.sender here, since a separate
            // refund mechanism is provided for refunds, unrelated to msg.value
            _splitETHRevenues(_projectId, currentPriceInWei);
        } else {
            // increment the number of refundable invocations that will be
            // claimable by the artist and admin once auction is validated.
            _projectConfig.numRefundableInvocations++;
        }

        return tokenId;
    }

    function claimRefund(uint256 _projectId) external {
        claimRefundTo(payable(msg.sender), _projectId);
    }

    function claimRefundTo(address payable _to, uint256 _projectId)
        public
        nonReentrant
    {
        // CHECKS
        // get the current price, which returns the sellout price if the
        // auction sold out before reaching base price, or returns the base
        // price if auction has reached base price without reaching max
        // invocations on this minter. Reverts if auction is unconfigured or
        // has not started.
        uint256 currentPriceInWei = _getPrice(_projectId);

        // EFFECTS
        // calculate the refund amount
        Receipt storage receipt = receipts[msg.sender][_projectId];
        // implicit overflow/underflow checks in solidity ^0.8
        uint256 amountDue = receipt.numPurchased * currentPriceInWei;
        uint256 refund = receipt.netPaid - amountDue;
        // reduce the netPaid (in storage) to value after refund deducted
        receipt.netPaid = amountDue;
        // emit event indicating new receipt state
        emit ReceiptUpdated(
            msg.sender,
            _projectId,
            receipt.numPurchased,
            receipt.netPaid
        );

        // INTERACTIONS
        bool success_;
        (success_, ) = _to.call{value: refund}("");
        require(success_, "Refund failed");
    }

    /**
     * @dev splits ETH revenues between foundation, artist, and artist's
     * additional payee for revenue generated by project `_projectId`.
     * @dev possible DoS during splits is acknowledged, and mitigated by
     * business practices, including end-to-end testing on mainnet, and
     * admin-accepted artist payment addresses.
     * @param _projectId Project ID for which funds shall be split.
     * @param _valueInWei Value to be split, in Wei.
     */
    function _splitETHRevenues(uint256 _projectId, uint256 _valueInWei)
        internal
    {
        if (_valueInWei > 0) {
            bool success_;
            // split funds between foundation, artist, and artist's
            // additional payee
            (
                uint256 artblocksRevenue_,
                address payable artblocksAddress_,
                uint256 artistRevenue_,
                address payable artistAddress_,
                uint256 additionalPayeePrimaryRevenue_,
                address payable additionalPayeePrimaryAddress_
            ) = genArtCoreContract.getPrimaryRevenueSplits(
                    _projectId,
                    _valueInWei
                );
            // Art Blocks payment
            if (artblocksRevenue_ > 0) {
                (success_, ) = artblocksAddress_.call{value: artblocksRevenue_}(
                    ""
                );
                require(success_, "Art Blocks payment failed");
            }
            // artist payment
            if (artistRevenue_ > 0) {
                (success_, ) = artistAddress_.call{value: artistRevenue_}("");
                require(success_, "Artist payment failed");
            }
            // additional payee payment
            if (additionalPayeePrimaryRevenue_ > 0) {
                (success_, ) = additionalPayeePrimaryAddress_.call{
                    value: additionalPayeePrimaryRevenue_
                }("");
                require(success_, "Additional Payee payment failed");
            }
        }
    }

    /**
     * @notice Gets price of minting a token on project `_projectId` given
     * the project's AuctionParameters and current block timestamp.
     * Reverts if auction has not yet started or auction is unconfigured.
     * Returns auction last purchase price if auction sold out before reaching
     * base price.
     * @param _projectId Project ID to get price of token for.
     * @return current price of token in Wei
     * @dev This method calculates price decay using a linear interpolation
     * of exponential decay based on the artist-provided half-life for price
     * decay, `_priceDecayHalfLifeSeconds`.
     */
    function _getPrice(uint256 _projectId) private view returns (uint256) {
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        // if auction sold out on this minter, return the sellout price.
        // this allows this function to return the amount due after an auction
        // is complete.
        if (_projectConfig.maxHasBeenInvoked) {
            return _projectConfig.selloutPrice;
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
    function getPriceInfo(uint256 _projectId)
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
            tokenPriceInWei = _getPrice(_projectId);
        }
        currencySymbol = "ETH";
        currencyAddress = address(0);
    }
}
