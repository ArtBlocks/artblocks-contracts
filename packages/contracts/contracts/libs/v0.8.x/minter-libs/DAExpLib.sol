// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Dutch Auction (exponential price curve) Library
 * @notice This library is designed to implement logic and checks for Art
 * Blocks projects using an exponential Dutch auctionprice curve for minting
 * tokens.
 * @author Art Blocks Inc.
 */

library DAExpLib {
    struct DAProjectConfig {
        // @dev max uint40 ~= 1.1e12 sec ~= 34 thousand years
        uint40 timestampStart;
        uint40 priceDecayHalfLifeSeconds;
        // @dev max uint88 ~= 3e26 Wei = ~300 million ETH, which is well above
        // the expected prices of any NFT mint in the foreseeable future.
        uint88 startPrice;
        uint88 basePrice;
    }

    /**
     * @notice Sets auction details for an exponential-price auction type.
     * @dev The function sets the auction start timestamp, price decay
     * half-life, starting, and base prices for an exponential-price auction.
     * @dev Minter implementations should ensure that any additional guard-
     * rails are properly checked outside of this function. For example, the
     * minter should check that _priceDecayHalfLifeSeconds is greater than the
     * minter's minimum allowable value for price decay half-life (if the
     * minter chooses to include that guard-rail).
     * @param _DAProjectConfig The storage reference to the DAProjectConfig
     * struct.
     * @param _auctionTimestampStart The timestamp when the auction will start.
     * @param _priceDecayHalfLifeSeconds The half-life time for price decay in
     * seconds.
     * @param _startPrice The starting price of the auction.
     * @param _basePrice The base price of the auction.
     * @param _allowReconfigureAfterStart Bool indicating whether the auction
     * can be reconfigured after it has started. This is sometimes useful for
     * minter implementations that want to allow an artist to reconfigure the
     * auction after it has reached minter-local max invocations, for example.
     */
    function setAuctionDetailsExp(
        DAProjectConfig storage _DAProjectConfig,
        uint40 _auctionTimestampStart,
        uint40 _priceDecayHalfLifeSeconds,
        uint88 _startPrice,
        uint88 _basePrice,
        bool _allowReconfigureAfterStart
    ) internal {
        require(
            _DAProjectConfig.timestampStart == 0 || // uninitialized
                block.timestamp < _DAProjectConfig.timestampStart || // auction not yet started
                _allowReconfigureAfterStart, // specifically allowing reconfiguration after start
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

        // EFFECTS
        _DAProjectConfig.timestampStart = _auctionTimestampStart;
        _DAProjectConfig.priceDecayHalfLifeSeconds = _priceDecayHalfLifeSeconds;
        _DAProjectConfig.startPrice = _startPrice;
        _DAProjectConfig.basePrice = _basePrice;
    }

    /**
     * @notice Gets price of minting a token given the project's
     * DAProjectConfig.
     * This function reverts if auction has not yet started, or if auction is
     * unconfigured, which is relied upon by certain minter implications for
     * security.
     * @return uint256 current price of token in Wei
     */
    function getPriceExp(
        DAProjectConfig storage _DAProjectConfig
    ) internal view returns (uint256) {
        // move parameters to memory if used more than once
        uint256 _timestampStart = _DAProjectConfig.timestampStart;
        uint256 _priceDecayHalfLifeSeconds = _DAProjectConfig
            .priceDecayHalfLifeSeconds;
        uint256 _basePrice = _DAProjectConfig.basePrice;

        require(block.timestamp > _timestampStart, "Auction not yet started");
        require(_priceDecayHalfLifeSeconds > 0, "Only configured auctions");
        uint256 decayedPrice = _DAProjectConfig.startPrice;
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
}
