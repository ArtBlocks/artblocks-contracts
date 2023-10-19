// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {DALib} from "./DALib.sol";

/**
 * @title Art Blocks Dutch Auction (linear price curve) Library
 * @notice This library is designed to implement logic and checks for Art
 * Blocks projects using an linear Dutch auctionprice curve for minting
 * tokens.
 * @author Art Blocks Inc.
 */

library DALinLib {
    event SetAuctionDetailsLin(
        uint256 indexed _projectId,
        address indexed _coreContract,
        uint40 _auctionTimestampStart,
        uint40 _auctionTimestampEnd,
        uint256 _startPrice,
        uint256 _basePrice
    );

    /// Minimum allowed auction length updated
    event AuctionMinimumLengthSecondsUpdated(
        uint256 _minimumAuctionLengthSeconds
    );

    // position of DA Lin Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant DAE_LIN_LIB_STORAGE_POSITION =
        keccak256("dalinlib.storage");

    struct DAProjectConfig {
        // @dev max uint40 ~= 1.1e12 sec ~= 34 thousand years
        uint40 timestampStart;
        uint40 timestampEnd;
        // @dev max uint88 ~= 3e26 Wei = ~300 million ETH, which is well above
        // the expected prices of any NFT mint in the foreseeable future.
        uint88 startPrice;
        uint88 basePrice;
    }

    // Diamond storage pattern is used in this library
    struct DALinLibStorage {
        mapping(address coreContract => mapping(uint256 projectId => DAProjectConfig)) DAProjectConfigs_;
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
     * @param _projectId The project Id to set auction details for.
     * @param _coreContract The core contract address to set auction details.
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
        uint256 _projectId,
        address _coreContract,
        uint40 _auctionTimestampStart,
        uint40 _auctionTimestampEnd,
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
        DAProjectConfig_.timestampEnd = _auctionTimestampEnd;
        DAProjectConfig_.startPrice = _startPrice;
        DAProjectConfig_.basePrice = _basePrice;

        emit SetAuctionDetailsLin({
            _projectId: _projectId,
            _coreContract: _coreContract,
            _auctionTimestampStart: _auctionTimestampStart,
            _auctionTimestampEnd: _auctionTimestampEnd,
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
        DAProjectConfig_.timestampEnd = 0;
        DAProjectConfig_.startPrice = 0;
        DAProjectConfig_.basePrice = 0;

        emit DALib.ResetAuctionDetails(_projectId, _coreContract);
    }

    /**
     * @notice Gets price of minting a token given the project's
     * DAProjectConfig.
     * This function reverts if auction has not yet started, or if auction is
     * unconfigured.
     * @param _projectId Project Id to get price for
     * @param _coreContract Core contract address to get price for
     * @return current price of token in Wei
     */
    function getPriceLin(
        uint256 _projectId,
        address _coreContract
    ) internal view returns (uint256) {
        DAProjectConfig storage _DAProjectConfig = getDAProjectConfig(
            _projectId,
            _coreContract
        );
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

    /**
     * Loads the DAProjectConfig for a given project and core contract.
     * @param _projectId Project Id to get config for
     * @param _coreContract Core contract address to get config for
     */
    function getDAProjectConfig(
        uint256 _projectId,
        address _coreContract
    ) internal view returns (DAProjectConfig storage) {
        return s().DAProjectConfigs_[_coreContract][_projectId];
    }

    /**
     * @notice Return the storage struct for reading and writing. This library
     * uses a diamond storage pattern when managing storage.
     * @return storageStruct The DALinLibStorage struct.
     */
    function s() internal pure returns (DALinLibStorage storage storageStruct) {
        bytes32 position = DAE_LIN_LIB_STORAGE_POSITION;
        assembly {
            storageStruct.slot := position
        }
    }
}
