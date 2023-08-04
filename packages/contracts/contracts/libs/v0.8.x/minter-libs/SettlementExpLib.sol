// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "./MaxInvocationsLib.sol";
import "./DAExpLib.sol";

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
    struct SettlementAuctionProjectConfig {
        // set to true only after artist + admin revenues have been collected
        bool auctionRevenuesCollected;
        // number of tokens minted that have potential of future settlement.
        // max uint24 > 16.7 million tokens > 1 million tokens/project max
        uint24 numSettleableInvocations;
        // When non-zero, this value is used as a reference when an auction is
        // reset by admin, and then a new auction is configured by an artist.
        // In that case, the new auction will be required to have a starting
        // price less than or equal to this value, if one or more purchases
        // have been made on this minter.
        uint256 latestPurchasePrice;
    }

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
    ) internal returns (uint256 netPosted, uint256 numPurchased) {
        // in memory copy + update
        netPosted = _receipt.netPosted + msg.value;
        numPurchased = _receipt.numPurchased + 1;

        // require sufficient payment on project
        require(
            netPosted >= numPurchased * _currentPriceInWei,
            "Min value to mint req."
        );

        // update Receipt in storage
        // @dev overflow checks are not required since the added values cannot
        // be enough to overflow due to maximum invocations or supply of ETH
        _receipt.netPosted = uint232(netPosted);
        _receipt.numPurchased = uint24(numPurchased);
    }

    function adminEmergencyReduceSelloutPrice(
        uint256 _projectId,
        address _coreContract,
        uint256 _newSelloutPrice,
        SettlementAuctionProjectConfig
            storage _settlementAuctionProjectConfigMapping,
        MaxInvocationsLib.MaxInvocationsProjectConfig
            storage _maxInvocationsProjectConfigMapping,
        DAExpLib.DAProjectConfig storage _DAProjectConfigMapping
    ) internal {
        // CHECKS
        require(
            !_settlementAuctionProjectConfigMapping.auctionRevenuesCollected,
            "Only before revenues collected"
        );

        // refresh max invocations, updating any local values that are
        // illogical with respect to the current core contract state, and
        // ensuring that local hasMaxBeenInvoked is accurate.
        MaxInvocationsLib.refreshMaxInvocations(
            _projectId,
            _coreContract,
            _maxInvocationsProjectConfigMapping
        );
        require(
            _newSelloutPrice >= _DAProjectConfigMapping.basePrice,
            "Only gte base price"
        );
        // require max invocations has been reached
        require(
            _maxInvocationsProjectConfigMapping.maxHasBeenInvoked,
            "Auction must be complete"
        );
        // @dev no need to check that auction max invocations has been reached,
        // because if it was, the sellout price will be zero, and the following
        // check will fail.
        require(
            _newSelloutPrice <
                _settlementAuctionProjectConfigMapping.latestPurchasePrice,
            "May only reduce sellout price"
        );
        // ensure _newSelloutPrice is non-zero
        // @dev this is a redundant check since minter doesn't allow base price
        // of zero, but is included in case that logic changes in the future.
        // @dev no coverage else branch of following line because redundant
        require(_newSelloutPrice > 0, "Only sellout prices > 0");
        // EFFECTS
        _settlementAuctionProjectConfigMapping
            .latestPurchasePrice = _newSelloutPrice;
    }

    function getArtistAndAdminRevenues(
        uint256 _projectId,
        address _coreContract,
        SettlementAuctionProjectConfig
            storage _settlementAuctionProjectConfigMapping,
        MaxInvocationsLib.MaxInvocationsProjectConfig
            storage _maxInvocationsProjectConfigMapping,
        DAExpLib.DAProjectConfig storage _DAProjectConfigMapping
    ) internal returns (uint256) {
        // require revenues to not have already been collected
        require(
            !_settlementAuctionProjectConfigMapping.auctionRevenuesCollected,
            "Revenues already collected"
        );
        // refresh max invocations, updating any local values that are
        // illogical with respect to the current core contract state, and
        // ensuring that local hasMaxBeenInvoked is accurate.
        MaxInvocationsLib.refreshMaxInvocations(
            _projectId,
            _coreContract,
            _maxInvocationsProjectConfigMapping
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
            _settlementAuctionProjectConfigMapping: _settlementAuctionProjectConfigMapping,
            _maxInvocationsProjectConfigMapping: _maxInvocationsProjectConfigMapping,
            _DAProjectConfigMapping: _DAProjectConfigMapping
        });
        // if the price is not base price, require that the auction have
        // reached max invocations. This prevents premature withdrawl
        // before final auction price is possible to know.
        if (_price != _DAProjectConfigMapping.basePrice) {
            // @dev we can trust maxHasBeenInvoked, since we just
            // refreshed it above with _refreshMaxInvocations, preventing any
            // false negatives
            require(
                _maxInvocationsProjectConfigMapping.maxHasBeenInvoked,
                "Active auction not yet sold out"
            );
        } else {
            uint256 basePrice = _DAProjectConfigMapping.basePrice;
            // base price of zero indicates no sales, since base price of zero
            // is not allowed when configuring an auction.
            require(basePrice > 0, "Only latestPurchasePrice > 0");
            // if the price is base price, the auction is valid and may be claimed
            // update the latest purchase price to the base price, to ensure
            // the base price is used for all future settlement calculations
            _settlementAuctionProjectConfigMapping
                .latestPurchasePrice = basePrice;
        }
        // EFFECTS
        _settlementAuctionProjectConfigMapping.auctionRevenuesCollected = true;
        // calculate the artist and admin revenues
        uint256 netRevenues = _settlementAuctionProjectConfigMapping
            .numSettleableInvocations * _price;
        return netRevenues;
    }

    function getProjectExcessSettlementFunds(
        SettlementAuctionProjectConfig
            storage _settlementAuctionProjectConfigMapping,
        Receipt storage _receiptMapping
    )
        internal
        view
        returns (uint256 excessSettlementFunds, uint256 requiredAmountPosted)
    {
        uint256 numPurchased = _receiptMapping.numPurchased;
        require(numPurchased > 0, "No purchases made by this address");

        // require that a user has purchased at least one token on this project

        uint256 currentSettledTokenPrice = _settlementAuctionProjectConfigMapping
                .latestPurchasePrice;

        // calculate the excess settlement funds amount
        // implicit overflow/underflow checks in solidity ^0.8
        requiredAmountPosted = numPurchased * currentSettledTokenPrice;
        excessSettlementFunds =
            _receiptMapping.netPosted -
            requiredAmountPosted;
        return (excessSettlementFunds, requiredAmountPosted);
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
    function projectMaxHasBeenInvokedSafe(
        uint256 _projectId,
        address _coreContract,
        MaxInvocationsLib.MaxInvocationsProjectConfig
            storage _maxInvocationsProjectConfigMapping
    ) internal view returns (bool) {
        uint256 coreInvocations;
        uint256 coreMaxInvocations;
        (coreInvocations, coreMaxInvocations) = MaxInvocationsLib
            .coreContractInvocationData(_projectId, _coreContract);

        uint256 localMaxInvocations = _maxInvocationsProjectConfigMapping
            .maxInvocations;
        // value is locally defined, and could be out of date.
        // only possible illogical state is if local max invocations is
        // greater than core contract's max invocations, in which case
        // we should use the core contract's max invocations
        if (localMaxInvocations > coreMaxInvocations) {
            // local max invocations is stale and illogical, defer to core
            // contract's max invocations since it is the limiting factor
            return (coreMaxInvocations == coreInvocations);
        }
        // local max invocations is limiting, so check core invocations against
        // local max invocations
        return (coreInvocations >= localMaxInvocations);
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
     * @param _settlementAuctionProjectConfigMapping SettlementAuctionProjectConfig
     * struct for the project.
     * @param _maxInvocationsProjectConfigMapping MaxInvocationsProjectConfig
     * struct for the project.
     * @param _DAProjectConfigMapping DAProjectConfig struct for the project.
     * @return uint256 current price of token in Wei, accurate if minter max
     * invocations are up to date
     * @dev This method calculates price decay using a linear interpolation
     * of exponential decay based on the artist-provided half-life for price
     * decay, `_priceDecayHalfLifeSeconds`.
     */
    function getPriceUnsafe(
        SettlementAuctionProjectConfig
            storage _settlementAuctionProjectConfigMapping,
        MaxInvocationsLib.MaxInvocationsProjectConfig
            storage _maxInvocationsProjectConfigMapping,
        DAExpLib.DAProjectConfig storage _DAProjectConfigMapping
    ) internal view returns (uint256) {
        // return latest purchase price if:
        // - minter is aware of a sold-out auction (without updating max
        // invocation value)
        // - auction revenues have been collected, at which point the latest
        // purchase price will never change again
        if (
            _maxInvocationsProjectConfigMapping.maxHasBeenInvoked ||
            _settlementAuctionProjectConfigMapping.auctionRevenuesCollected
        ) {
            return _settlementAuctionProjectConfigMapping.latestPurchasePrice;
        }
        // otherwise calculate price based on current block timestamp and
        // auction configuration
        // @dev this will revert if auction has not yet started or auction is
        // unconfigured, which is relied upon for security.
        return
            DAExpLib.getPriceExp({_DAProjectConfig: _DAProjectConfigMapping});
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
        SettlementAuctionProjectConfig
            storage _settlementAuctionProjectConfigMapping,
        MaxInvocationsLib.MaxInvocationsProjectConfig
            storage _maxInvocationsProjectConfigMapping,
        DAExpLib.DAProjectConfig storage _DAProjectConfigMapping
    ) internal view returns (uint256 tokenPriceInWei) {
        // accurately check if project has sold out
        if (
            projectMaxHasBeenInvokedSafe({
                _projectId: _projectId,
                _coreContract: _coreContract,
                _maxInvocationsProjectConfigMapping: _maxInvocationsProjectConfigMapping
            })
        ) {
            // max invocations have been reached, return the latest purchased
            // price
            tokenPriceInWei = _settlementAuctionProjectConfigMapping
                .latestPurchasePrice;
        } else {
            // if not sold out, return the current price via getPriceUnsafe
            tokenPriceInWei = getPriceUnsafe({
                _settlementAuctionProjectConfigMapping: _settlementAuctionProjectConfigMapping,
                _maxInvocationsProjectConfigMapping: _maxInvocationsProjectConfigMapping,
                _DAProjectConfigMapping: _DAProjectConfigMapping
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
