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
        uint64 timestampStart;
        uint64 timestampEnd;
        uint256 startPrice;
        uint256 basePrice;
        uint64 priceDecayHalfLifeSeconds;
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
        uint256 _auctionTimestampStart,
        uint256 _auctionTimestampEnd,
        uint256 _startPrice,
        uint256 _basePrice,
        uint256 _minimumAuctionLengthSeconds
    ) external {
        require(
            _auctionProjectConfigMapping.timestampStart == 0 ||
                block.timestamp < _auctionProjectConfigMapping.timestampStart,
            "No modifications mid-auction"
        );
        require(
            block.timestamp < _auctionTimestampStart,
            "Only future auctions"
        );
        require(
            _auctionTimestampEnd > _auctionTimestampStart,
            "Auction end must be greater than auction start"
        );
        require(
            _auctionTimestampEnd >=
                _auctionTimestampStart + _minimumAuctionLengthSeconds,
            "Auction length must be at least minimumAuctionLengthSeconds"
        );
        require(
            _startPrice > _basePrice,
            "Auction start price must be greater than auction end price"
        );
        // EFFECTS
        _auctionProjectConfigMapping.timestampStart = _auctionTimestampStart
            .toUint64();
        _auctionProjectConfigMapping.timestampEnd = _auctionTimestampEnd
            .toUint64();
        _auctionProjectConfigMapping.startPrice = _startPrice;
        _auctionProjectConfigMapping.basePrice = _basePrice;
    }

    function setAuctionDetailsExp(
        DAProjectConfig storage _auctionProjectConfigMapping,
        uint256 _auctionTimestampStart,
        uint256 _priceDecayHalfLifeSeconds,
        uint256 _startPrice,
        uint256 _basePrice,
        uint256 _minimumPriceDecayHalfLifeSeconds
    ) external {
        require(
            _auctionProjectConfigMapping.timestampStart == 0 ||
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
        require(
            (_auctionProjectConfigMapping.priceDecayHalfLifeSeconds >=
                _minimumPriceDecayHalfLifeSeconds),
            "Price decay half life must be greater than min allowable value"
        );
        // EFFECTS
        _auctionProjectConfigMapping.timestampStart = _auctionTimestampStart
            .toUint64();
        _auctionProjectConfigMapping
            .priceDecayHalfLifeSeconds = _priceDecayHalfLifeSeconds.toUint64();
        _auctionProjectConfigMapping.startPrice = _startPrice;
        _auctionProjectConfigMapping.basePrice = _basePrice;
    }
}
