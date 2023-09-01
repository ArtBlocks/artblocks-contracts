// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Dutch Auction (linear price curve) Library
 * @notice This library is designed to implement logic and checks for Art
 * Blocks projects using an exponential Dutch auctionprice curve for minting
 * tokens.
 * @author Art Blocks Inc.
 */

library DALinLib {
    struct DAProjectConfig {
        // @dev max uint40 ~= 1.1e12 sec ~= 34 thousand years
        uint40 timestampStart;
        uint40 timestampEnd;
        // @dev max uint88 ~= 3e26 Wei = ~300 million ETH, which is well above
        // the expected prices of any NFT mint in the foreseeable future.
        uint88 startPrice;
        uint88 basePrice;
    }

    /**
     * @notice Sets auction details for a linear-price auction type.
     * @dev The function sets the auction start timestamp, auction end
     * timestamp, starting, and base prices for a linear-price auction.
     * @dev Minter implementations should ensure that any additional guard-
     * rails are properly checked outside of this function. For example, the
     * minter should check that auction length is greater than the minter's
     * minimum allowable value (if the minter chooses to include that guard-
     * rail).
     * @param _DAProjectConfig The storage reference to the DAProjectConfig
     * struct.
     * @param _auctionTimestampStart The timestamp when the auction will start.
     * @param _auctionTimestampEnd The timestamp when the auction will end.
     * @param _startPrice The starting price of the auction.
     * @param _basePrice The base price of the auction.
     * @param _allowReconfigureAfterStart Bool indicating whether the auction
     * can be reconfigured after it has started. This is sometimes useful for
     * minter implementations that want to allow an artist to reconfigure the
     * auction after it has reached minter-local max invocations, for example.
     */
    function setAuctionDetailsLin(
        DAProjectConfig storage _DAProjectConfig,
        uint40 _auctionTimestampStart,
        uint40 _auctionTimestampEnd,
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
        _DAProjectConfig.timestampEnd = _auctionTimestampEnd;
        _DAProjectConfig.startPrice = _startPrice;
        _DAProjectConfig.basePrice = _basePrice;
    }

    /**
     * @notice Gets price of minting a token given the project's
     * DAProjectConfig.
     * This function reverts if auction has not yet started, or if auction is
     * unconfigured.
     * @return current price of token in Wei
     */
    function getPriceLin(
        DAProjectConfig storage _DAProjectConfig
    ) internal view returns (uint256) {
        // move parameters to memory if used more than once
        uint256 _timestampStart = _DAProjectConfig.timestampStart;
        uint256 _timestampEnd = _DAProjectConfig.timestampEnd;
        uint256 _startPrice = _DAProjectConfig.startPrice;
        uint256 _basePrice = _DAProjectConfig.basePrice;

        require(block.timestamp > _timestampStart, "Auction not yet started");
        if (block.timestamp >= _timestampEnd) {
            require(_timestampEnd > 0, "Only configured auctions");
            return _basePrice;
        }
        uint256 elapsedTime;
        uint256 duration;
        uint256 startToEndDiff;
        unchecked {
            // already checked that block.timestamp > _timestampStart
            elapsedTime = block.timestamp - _timestampStart;
            // _timestampEnd > _timestampStart enforced during assignment
            duration = _timestampEnd - _timestampStart;
            // _startPrice > _basePrice enforced during assignment
            startToEndDiff = _startPrice - _basePrice;
        }
        return _startPrice - ((elapsedTime * startToEndDiff) / duration);
    }
}
