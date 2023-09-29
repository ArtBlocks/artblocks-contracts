// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {DALib} from "./DALib.sol";

/**
 * @title Art Blocks Dutch Auction (exponential price curve) Library
 * @notice This library is designed to implement logic and checks for Art
 * Blocks projects using an exponential Dutch auctionprice curve for minting
 * tokens.
 * @author Art Blocks Inc.
 */

library DAExpLib {
    event SetAuctionDetailsExp(
        uint256 indexed _projectId,
        address indexed _coreContract,
        uint40 _auctionTimestampStart,
        uint40 _priceDecayHalfLifeSeconds,
        uint256 _startPrice,
        uint256 _basePrice
    );
    /// Minimum allowed price decay half life seconds updated.
    event AuctionMinHalfLifeSecondsUpdated(
        uint256 _minimumPriceDecayHalfLifeSeconds
    );

    // position of DA Exp Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant DAE_EXP_LIB_STORAGE_POSITION =
        keccak256("daexplib.storage");

    struct DAProjectConfig {
        // @dev max uint40 ~= 1.1e12 sec ~= 34 thousand years
        uint40 timestampStart;
        uint40 priceDecayHalfLifeSeconds;
        // @dev max uint88 ~= 3e26 Wei = ~300 million ETH, which is well above
        // the expected prices of any NFT mint in the foreseeable future.
        uint88 startPrice;
        uint88 basePrice;
    }

    // Diamond storage pattern is used in this library
    struct DAEXPLibStorage {
        mapping(address coreContract => mapping(uint256 projectId => DAProjectConfig)) holderProjectConfigs;
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
     * @param _projectId The project Id to set auction details for.
     * @param _coreContract The core contract address to set auction details.
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
        uint256 _projectId,
        address _coreContract,
        uint40 _auctionTimestampStart,
        uint40 _priceDecayHalfLifeSeconds,
        uint88 _startPrice,
        uint88 _basePrice,
        bool _allowReconfigureAfterStart
    ) internal {
        DAProjectConfig storage DAProjectConfig_ = getDAProjectConfig(
            _projectId,
            _coreContract
        );
        require(
            DAProjectConfig_.timestampStart == 0 || // uninitialized
                block.timestamp < DAProjectConfig_.timestampStart || // auction not yet started
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
        DAProjectConfig_.timestampStart = _auctionTimestampStart;
        DAProjectConfig_.priceDecayHalfLifeSeconds = _priceDecayHalfLifeSeconds;
        DAProjectConfig_.startPrice = _startPrice;
        DAProjectConfig_.basePrice = _basePrice;

        emit SetAuctionDetailsExp({
            _projectId: _projectId,
            _coreContract: _coreContract,
            _auctionTimestampStart: _auctionTimestampStart,
            _priceDecayHalfLifeSeconds: _priceDecayHalfLifeSeconds,
            _startPrice: _startPrice,
            _basePrice: _basePrice
        });
    }

    function resetAuctionDetails(
        uint256 _projectId,
        address _coreContract
    ) internal {
        DAProjectConfig storage DAProjectConfig_ = getDAProjectConfig(
            _projectId,
            _coreContract
        );

        DAProjectConfig_.timestampStart = 0;
        DAProjectConfig_.priceDecayHalfLifeSeconds = 0;
        DAProjectConfig_.startPrice = 0;
        DAProjectConfig_.basePrice = 0;

        emit DALib.ResetAuctionDetails(_projectId, _coreContract);
    }

    /**
     * @notice Gets price of minting a token given the project's
     * DAProjectConfig.
     * This function reverts if auction has not yet started, or if auction is
     * unconfigured, which is relied upon by certain minter implications for
     * security.
     * @param _projectId Project Id to get price for
     * @param _coreContract Core contract address to get price for
     * @return uint256 current price of token in Wei
     */
    function getPriceExp(
        uint256 _projectId,
        address _coreContract
    ) internal view returns (uint256) {
        DAProjectConfig storage DAProjectConfig_ = getDAProjectConfig(
            _projectId,
            _coreContract
        );
        // move parameters to memory if used more than once
        uint256 _timestampStart = DAProjectConfig_.timestampStart;
        uint256 _priceDecayHalfLifeSeconds = DAProjectConfig_
            .priceDecayHalfLifeSeconds;
        uint256 _basePrice = DAProjectConfig_.basePrice;

        require(block.timestamp > _timestampStart, "Auction not yet started");
        require(_priceDecayHalfLifeSeconds > 0, "Only configured auctions");
        uint256 decayedPrice = DAProjectConfig_.startPrice;
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
     * Loads the DAProjectConfig for a given project and core contract.
     * @param _projectId Project Id to get config for
     * @param _coreContract Core contract address to get config for
     */
    function getDAProjectConfig(
        uint256 _projectId,
        address _coreContract
    ) internal view returns (DAProjectConfig storage) {
        return s().holderProjectConfigs[_coreContract][_projectId];
    }

    /**
     * @notice Return the storage struct for reading and writing. This library
     * uses a diamond storage pattern when managing storage.
     * @return storageStruct The DAEXPLibStorage struct.
     */
    function s() internal pure returns (DAEXPLibStorage storage storageStruct) {
        bytes32 position = DAE_EXP_LIB_STORAGE_POSITION;
        assembly {
            storageStruct.slot := position
        }
    }
}
