// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "@openzeppelin-4.5/contracts/utils/math/SafeCast.sol";

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Merkle Library
 * @notice This library is designed to manage and verify merkle based gating for Art Blocks projects.
 * It provides functionalities such as updating the merkle root of project, verifying an address against a proof,
 * and setting the maximum number of invocations per address for a project.
 * @author Art Blocks Inc.
 */

library DALib {
    using SafeCast for uint256;

    struct DAProjectConfig {
        // @dev max uint64 ~= 1.8e19 sec ~= 570 billion years
        uint64 timestampStart;
        uint64 timestampEnd;
        uint64 priceDecayHalfLifeSeconds;
        uint128 startPrice;
        uint128 basePrice;
    }

    function resetAuctionDetailsExp(
        DAProjectConfig storage _auctionProjectConfigMapping
    ) external {
        _auctionProjectConfigMapping.timestampStart = 0;
        _auctionProjectConfigMapping.priceDecayHalfLifeSeconds = 0;
        _auctionProjectConfigMapping.startPrice = 0;
        _auctionProjectConfigMapping.basePrice = 0;
    }

    function resetAuctionDetailsLin(
        DAProjectConfig storage _auctionProjectConfigMapping
    ) external {
        // reset to initial values
        _auctionProjectConfigMapping.timestampStart = 0;
        _auctionProjectConfigMapping.timestampEnd = 0;
        _auctionProjectConfigMapping.startPrice = 0;
        _auctionProjectConfigMapping.basePrice = 0;
    }

    function setAuctionDetailsLin(
        DAProjectConfig storage _auctionProjectConfigMapping,
        uint64 _auctionTimestampStart,
        uint64 _auctionTimestampEnd,
        uint128 _startPrice,
        uint128 _basePrice
    ) external {
        require(
            block.timestamp < _auctionProjectConfigMapping.timestampStart,
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
        _auctionProjectConfigMapping.timestampStart = _auctionTimestampStart;
        _auctionProjectConfigMapping.timestampEnd = _auctionTimestampEnd;
        _auctionProjectConfigMapping.startPrice = _startPrice;
        _auctionProjectConfigMapping.basePrice = _basePrice;
    }

    function setAuctionDetailsExp(
        DAProjectConfig storage _auctionProjectConfigMapping,
        uint64 _auctionTimestampStart,
        uint64 _priceDecayHalfLifeSeconds,
        uint128 _startPrice,
        uint128 _basePrice
    ) external {
        require(
            block.timestamp < _auctionProjectConfigMapping.timestampStart,
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
        _auctionProjectConfigMapping.timestampStart = _auctionTimestampStart;
        _auctionProjectConfigMapping
            .priceDecayHalfLifeSeconds = _priceDecayHalfLifeSeconds;
        _auctionProjectConfigMapping.startPrice = _startPrice;
        _auctionProjectConfigMapping.basePrice = _basePrice;
    }

    function getPriceLin(
        DAProjectConfig storage _auctionProjectConfigMapping
    ) external view returns (uint256) {
        // move parameters to memory if used more than once
        uint256 _timestampStart = uint256(
            _auctionProjectConfigMapping.timestampStart
        );
        uint256 _timestampEnd = uint256(
            _auctionProjectConfigMapping.timestampEnd
        );
        uint256 _startPrice = _auctionProjectConfigMapping.startPrice;
        uint256 _basePrice = _auctionProjectConfigMapping.basePrice;

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

    function getPriceExp(
        DAProjectConfig storage _auctionProjectConfigMapping
    ) external view returns (uint256) {
        // move parameters to memory if used more than once
        uint256 _timestampStart = uint256(
            _auctionProjectConfigMapping.timestampStart
        );
        uint256 _priceDecayHalfLifeSeconds = uint256(
            _auctionProjectConfigMapping.priceDecayHalfLifeSeconds
        );
        uint256 _basePrice = _auctionProjectConfigMapping.basePrice;

        require(block.timestamp > _timestampStart, "Auction not yet started");
        require(_priceDecayHalfLifeSeconds > 0, "Only configured auctions");
        uint256 decayedPrice = _auctionProjectConfigMapping.startPrice;
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
