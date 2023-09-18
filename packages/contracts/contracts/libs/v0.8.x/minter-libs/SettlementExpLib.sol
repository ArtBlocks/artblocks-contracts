// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "./MaxInvocationsLib.sol";
import "./DAExpLib.sol";
import "./SplitFundsLib.sol";

import "@openzeppelin-4.7/contracts/utils/math/SafeCast.sol";

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Settlement Library for Exponential Auctions
 * @notice This library manages the settlement logic for Art Blocks settlement
 * minters. It provides functionality for managing a project's settlement state
 * via the SettlementAuctionProjectConfig struct, and managing an individual's
 * settlement state on a given project via the Receipt struct.
 * @author Art Blocks Inc.
 */

library SettlementExpLib {
    using SafeCast for uint256;

    bytes32 internal constant CONFIG_CURRENT_SETTLED_PRICE =
        "currentSettledPrice";
    bytes32 internal constant CONFIG_AUCTION_REVENUES_COLLECTED =
        "auctionRevenuesCollected";

    // The SettlementAuctionProjectConfig struct tracks the state of a project's
    // settlement auction. It tracks the number of tokens minted that have
    // potential of future settlement, the latest purchase price of a token on
    // the project, and whether or not the auction's revenues have been
    // collected.
    struct SettlementAuctionProjectConfig {
        // set to true only after artist + admin revenues have been collected
        bool auctionRevenuesCollected;
        // number of tokens minted that have potential of future settlement.
        // @dev max uint24 > 16.7 million tokens > 1 million tokens/project max
        uint24 numSettleableInvocations;
        // When non-zero, this value is used as a reference when an auction is
        // reset by admin, and then a new auction is configured by an artist.
        // In that case, the new auction will be required to have a starting
        // price less than or equal to this value, if one or more purchases
        // have been made on this minter.
        // @dev max uint112 allows for > 1e15 ETH
        // (one-hundred-trillion ETH is much more than max supply)
        // This enables struct packing, and is consistent with prices value
        // limits in DAExpLib's DAProjectConfig struct.
        uint112 latestPurchasePrice;
    }

    // The Receipt struct tracks the state of a user's settlement on a given
    // project. It tracks the total funds posted by the user on the project
    // and the number of tokens purchased by the user on the project.
    struct Receipt {
        // max uint232 allows for > 1e51 ETH (much more than max supply)
        uint232 netPosted;
        // max uint24 still allows for > max project supply of 1 million tokens
        uint24 numPurchased;
    }

    /**
     * This function updates the _receipt to include `msg.value` and increments
     * the number of tokens purchased by 1. It then checks that the updated
     * receipt is valid (i.e. sufficient funds have been posted for the
     * number of tokens purchased on the updated receipt), and reverts if not.
     * The new receipt net posted and num purchased are then returned to make
     * the values available in a gas-efficient manner to the caller of this
     * function.
     * @param _receipt Receipt struct for the user on the project being checked
     * @param _currentPriceInWei current price of token in Wei
     * @return netPosted total funds posted by user on project (that have not
     * been yet settled), including the current transaction
     * @return numPurchased total number of tokens purchased by user on
     * project, including the current transaction
     */
    function validateReceiptEffects(
        Receipt storage _receipt,
        uint256 _currentPriceInWei
    ) internal returns (uint232 netPosted, uint24 numPurchased) {
        // in memory copy + update
        netPosted = (_receipt.netPosted + msg.value).toUint232();
        numPurchased = _receipt.numPurchased + 1;

        // require sufficient payment on project
        require(
            netPosted >= numPurchased * _currentPriceInWei,
            "Min value to mint req."
        );

        // update Receipt in storage
        // @dev overflow checks are not required since the added values cannot
        // be enough to overflow due to maximum invocations or supply of ETH
        _receipt.netPosted = netPosted;
        _receipt.numPurchased = numPurchased;
    }

    /**
     * @notice Emergency override function that allows a sellout price of a
     * completed auction to be reduced to something below current latest
     * purchase price, but gte base price. This is useful in the case that a
     * project's auction artifically sold out at a price higher than the
     * project's base price, and the artist wishes to allow settlement at a
     * lower price (and thus lower settlement revenues, increasing purchaser
     * returned settlement funds by the minter to collectors).
     * @param _projectId Project ID to reduce auction sellout price for.
     * @param _newSelloutPrice New sellout price to set for the auction. Must
     * be less than the current sellout price, gte base price.
     */
    function adminEmergencyReduceSelloutPrice(
        uint256 _projectId,
        address _coreContract,
        uint112 _newSelloutPrice,
        SettlementAuctionProjectConfig storage _settlementAuctionProjectConfig,
        MaxInvocationsLib.MaxInvocationsProjectConfig
            storage _maxInvocationsProjectConfig,
        DAExpLib.DAProjectConfig storage _DAProjectConfig
    ) internal returns (bool maxInvocationsUpdated) {
        // CHECKS
        require(
            !_settlementAuctionProjectConfig.auctionRevenuesCollected,
            "Only before revenues collected"
        );

        // refresh max invocations, updating any local values that are
        // illogical with respect to the current core contract state, and
        // ensuring that local hasMaxBeenInvoked is accurate.
        maxInvocationsUpdated = MaxInvocationsLib.refreshMaxInvocations(
            _projectId,
            _coreContract,
            _maxInvocationsProjectConfig
        );
        require(
            _newSelloutPrice >= _DAProjectConfig.basePrice,
            "Only gte base price"
        );
        // require max invocations has been reached
        require(
            _maxInvocationsProjectConfig.maxHasBeenInvoked,
            "Auction must be complete"
        );
        // @dev no need to check that auction max invocations has been reached,
        // because if it was, the sellout price will be zero, and the following
        // check will fail.
        require(
            _newSelloutPrice <
                _settlementAuctionProjectConfig.latestPurchasePrice,
            "May only reduce sellout price"
        );
        // ensure _newSelloutPrice is non-zero
        // @dev this is a redundant check since minter doesn't allow base price
        // of zero, but is included in case that logic changes in the future.
        // @dev no coverage else branch of following line because redundant
        require(_newSelloutPrice > 0, "Only sellout prices > 0");
        // EFFECTS
        _settlementAuctionProjectConfig.latestPurchasePrice = _newSelloutPrice;
    }

    /**
     * @notice Distributes the net revenues from the project's auction, and
     * marks the auction as having had its revenues collected.
     * IMPORTANT - this affects state and distributes revenue funds, so it
     * performs all three of CHECKS, EFFECTS and INTERACTIONS.
     * @param _projectId Project ID to get revenues for
     * @param _coreContract Core contract address
     * @param _settlementAuctionProjectConfig SettlementAuctionProjectConfig
     * struct for the project.
     * @param _maxInvocationsProjectConfig MaxInvocationProjectConfig struct
     * for the project.
     * @param _DAProjectConfig DAProjectConfig struct for the project.
     * @param _isEngine bool indicating whether the core contract is an engine
     * @return maxInvocationsUpdated whether or not the minter's local max
     * invocations state was updated during this function call.
     * @return settledPriceUpdated whether or not the project's settled price
     * was updated during this function call.
     */
    function distributeArtistAndAdminRevenues(
        uint256 _projectId,
        address _coreContract,
        SettlementAuctionProjectConfig storage _settlementAuctionProjectConfig,
        MaxInvocationsLib.MaxInvocationsProjectConfig
            storage _maxInvocationsProjectConfig,
        DAExpLib.DAProjectConfig storage _DAProjectConfig,
        bool _isEngine
    ) internal returns (bool maxInvocationsUpdated, bool settledPriceUpdated) {
        // require revenues to not have already been collected
        require(
            !_settlementAuctionProjectConfig.auctionRevenuesCollected,
            "Revenues already collected"
        );
        // refresh max invocations, updating any local values that are
        // illogical with respect to the current core contract state, and
        // ensuring that local hasMaxBeenInvoked is accurate.
        maxInvocationsUpdated = MaxInvocationsLib.refreshMaxInvocations(
            _projectId,
            _coreContract,
            _maxInvocationsProjectConfig
        );

        // get the current net price of the auction - reverts if no auction
        // is configured.
        // @dev we use _getPriceUnsafe here, since we just safely synced the
        // project's max invocations and maxHasBeenInvoked, which guarantees
        // an accurate price calculation from _getPriceUnsafe, while being
        // more gas efficient than _getPriceSafe.
        // @dev price is guaranteed <= _projectConfig.latestPurchasePrice,
        // since this minter enforces monotonically decreasing purchase prices.
        uint256 _price = getPriceUnsafe({
            _settlementAuctionProjectConfig: _settlementAuctionProjectConfig,
            _maxInvocationsProjectConfig: _maxInvocationsProjectConfig,
            _DAProjectConfig: _DAProjectConfig
        });
        // if the price is not base price, require that the auction have
        // reached max invocations. This prevents premature withdrawl
        // before final auction price is possible to know.
        if (_price != _DAProjectConfig.basePrice) {
            // @dev we can trust maxHasBeenInvoked, since we just
            // refreshed it above with refreshMaxInvocations, preventing any
            // false negatives
            require(
                _maxInvocationsProjectConfig.maxHasBeenInvoked,
                "Active auction not yet sold out"
            );
        } else {
            uint112 basePrice = _DAProjectConfig.basePrice;
            // base price of zero indicates no sales, since base price of zero
            // is not allowed when configuring an auction.
            // @dev no coverage else branch of following line because redundant
            require(basePrice > 0, "Only latestPurchasePrice > 0");
            // if the price is base price, the auction is valid and may be claimed
            // update the latest purchase price to the base price, to ensure
            // the base price is used for all future settlement calculations
            // EFFECTS
            _settlementAuctionProjectConfig.latestPurchasePrice = basePrice;
            settledPriceUpdated = true;
        }
        _settlementAuctionProjectConfig.auctionRevenuesCollected = true;
        // calculate the artist and admin revenues
        uint256 netRevenues = _settlementAuctionProjectConfig
            .numSettleableInvocations * _price;
        // INTERACTIONS
        SplitFundsLib.splitRevenuesETHNoRefund({
            _projectId: _projectId,
            _valueInWei: netRevenues,
            _coreContract: _coreContract,
            _isEngine: _isEngine
        });
        // @dev (maxInvocationsUpdated, settledPriceUpdated) is returned
    }

    /**
     *
     * @param _settlementAuctionProjectConfig SettlementAuctionProjectConfig
     * struct for the project.
     * Reverts if no purchases have been made on the project by the collector
     * being checked.
     * @param _receipt Receipt struct for the collector on the project being
     * checked
     * @return excessSettlementFunds excess settlement funds, in wei
     * @return requiredAmountPosted required amount to be posted by user, in wei
     */
    function getProjectExcessSettlementFunds(
        SettlementAuctionProjectConfig storage _settlementAuctionProjectConfig,
        Receipt storage _receipt
    )
        internal
        view
        returns (uint256 excessSettlementFunds, uint256 requiredAmountPosted)
    {
        // require that a user has purchased at least one token on this project
        uint256 numPurchased = _receipt.numPurchased;
        require(numPurchased > 0, "No purchases made by this address");

        uint256 currentSettledTokenPrice = _settlementAuctionProjectConfig
            .latestPurchasePrice;

        // calculate the excess settlement funds amount
        // implicit overflow/underflow checks in solidity ^0.8
        requiredAmountPosted = numPurchased * currentSettledTokenPrice;
        excessSettlementFunds = _receipt.netPosted - requiredAmountPosted;
        return (excessSettlementFunds, requiredAmountPosted);
    }

    /**
     * @notice Gets price of minting a token on project `_projectId` given
     * the project's AuctionParameters and current block timestamp.
     * Reverts if auction has not yet started or auction is unconfigured, and
     * local hasMaxBeenInvoked is false and revenues have not been withdrawn.
     * Price is guaranteed to be accurate unless the minter's local
     * hasMaxBeenInvoked is stale and returning a false negative.
     * @dev when an accurate price is required regardless of the current state
     * state of the locally cached minter max invocations, use the less gas
     * efficient function `_getPriceSafe`.
     * @param _settlementAuctionProjectConfig SettlementAuctionProjectConfig
     * struct for the project.
     * @param _maxInvocationsProjectConfig MaxInvocationsProjectConfig
     * struct for the project.
     * @param _DAProjectConfig DAProjectConfig struct for the project.
     * @return uint256 current price of token in Wei, accurate if minter max
     * invocations are up to date
     * @dev This method calculates price decay using a linear interpolation
     * of exponential decay based on the artist-provided half-life for price
     * decay, `_priceDecayHalfLifeSeconds`.
     */
    function getPriceUnsafe(
        SettlementAuctionProjectConfig storage _settlementAuctionProjectConfig,
        MaxInvocationsLib.MaxInvocationsProjectConfig
            storage _maxInvocationsProjectConfig,
        DAExpLib.DAProjectConfig storage _DAProjectConfig
    ) internal view returns (uint256) {
        // return latest purchase price if:
        // - minter is aware of a sold-out auction (without updating max
        // invocation value)
        // - auction revenues have been collected, at which point the latest
        // purchase price will never change again
        if (
            _maxInvocationsProjectConfig.maxHasBeenInvoked ||
            _settlementAuctionProjectConfig.auctionRevenuesCollected
        ) {
            return _settlementAuctionProjectConfig.latestPurchasePrice;
        }
        // otherwise calculate price based on current block timestamp and
        // auction configuration
        // @dev this will revert if auction has not yet started or auction is
        // unconfigured, which is relied upon for security.
        return DAExpLib.getPriceExp({_DAProjectConfig: _DAProjectConfig});
    }

    /**
     * @notice Gets price of minting a token on project `_projectId` given
     * the project's AuctionParameters and current block timestamp.
     * This is labeled as "safe", because price is guaranteed to be accurate
     * even in the case of a stale locally cached minter max invocations.
     * Reverts if auction has not yet started or auction is unconfigured, and
     * auction has not sold out or revenues have not been withdrawn.
     * @dev This method is less gas efficient than `_getPriceUnsafe`, but is
     * guaranteed to be accurate.
     * @param _projectId Project ID to get price of token for.
     * @return tokenPriceInWei current price of token in Wei
     * @dev This method calculates price decay using a linear interpolation
     * of exponential decay based on the artist-provided half-life for price
     * decay, `_priceDecayHalfLifeSeconds`.
     */
    function getPriceSafe(
        uint256 _projectId,
        address _coreContract,
        SettlementAuctionProjectConfig storage _settlementAuctionProjectConfig,
        MaxInvocationsLib.MaxInvocationsProjectConfig
            storage _maxInvocationsProjectConfig,
        DAExpLib.DAProjectConfig storage _DAProjectConfig
    ) internal view returns (uint256 tokenPriceInWei) {
        // accurately check if project has sold out
        if (
            MaxInvocationsLib.projectMaxHasBeenInvokedSafe({
                _projectId: _projectId,
                _coreContract: _coreContract,
                _maxInvocationsProjectConfig: _maxInvocationsProjectConfig
            })
        ) {
            // max invocations have been reached, return the latest purchased
            // price
            tokenPriceInWei = _settlementAuctionProjectConfig
                .latestPurchasePrice;
        } else {
            // if not sold out, return the current price via getPriceUnsafe
            tokenPriceInWei = getPriceUnsafe({
                _settlementAuctionProjectConfig: _settlementAuctionProjectConfig,
                _maxInvocationsProjectConfig: _maxInvocationsProjectConfig,
                _DAProjectConfig: _DAProjectConfig
            });
        }
        return tokenPriceInWei;
    }

    /**
     * Returns if a new auction's start price is valid, given the current
     * state of the project's settlement auction configuration.
     * @param _startPrice starting price of new auction, in wei
     * @param _settlementAuctionProjectConfig SettlementAuctionProjectConfig
     * struct for the project being configured for a new auction.
     */
    function isValidStartPrice(
        uint256 _startPrice,
        SettlementAuctionProjectConfig storage _settlementAuctionProjectConfig
    ) internal view returns (bool) {
        // If previous purchases have been made, require monotonically
        // decreasing purchase prices to preserve settlement and revenue
        // claiming logic. Since base price is always non-zero, if
        // latestPurchasePrice is zero, then no previous purchases have been
        // made, and startPrice may be set to any value.
        return (_settlementAuctionProjectConfig.latestPurchasePrice == 0 || // never purchased
            _startPrice <= _settlementAuctionProjectConfig.latestPurchasePrice);
    }
}
