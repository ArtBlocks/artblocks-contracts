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
    /**
     * @notice Auction details set for project `projectId` on core contract
     * `coreContract`.
     * @param projectId Project Id for which auction details were set
     * @param coreContract Core contract address for which auction details were
     * set
     * @param auctionTimestampStart Timestamp when auction will start
     * @param auctionTimestampEnd Timestamp when auction will end
     * @param startPrice Start price of auction
     * @param basePrice Base price of auction (end price)
     */
    event SetAuctionDetailsLin(
        uint256 indexed projectId,
        address indexed coreContract,
        uint40 auctionTimestampStart,
        uint40 auctionTimestampEnd,
        uint256 startPrice,
        uint256 basePrice
    );

    /**
     * @notice Minimum allowed auction length updated to
     * `minimumAuctionLengthSeconds` on the minter.
     * @param minimumAuctionLengthSeconds minimum auction length for new
     * auctions, in seconds
     */
    event AuctionMinimumLengthSecondsUpdated(
        uint256 minimumAuctionLengthSeconds
    );

    // position of DA Lin Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant DAE_LIN_LIB_STORAGE_POSITION =
        keccak256("dalinlib.storage");

    struct DAProjectConfig {
        // @dev max uint40 ~= 1.1e12 sec ~= 34 thousand years
        uint40 timestampStart;
        uint40 timestampEnd;
        // @dev max uint88 ~= 3e26 Wei = ~30 million ETH, which is well above
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
     * @param projectId The project Id to set auction details for.
     * @param coreContract The core contract address to set auction details.
     * @param auctionTimestampStart The timestamp when the auction will start.
     * @param auctionTimestampEnd The timestamp when the auction will end.
     * @param startPrice The starting price of the auction.
     * @param basePrice The base price of the auction.
     * @param allowReconfigureAfterStart Bool indicating whether the auction
     * can be reconfigured after it has started. This is sometimes useful for
     * minter implementations that want to allow an artist to reconfigure the
     * auction after it has reached minter-local max invocations, for example.
     */
    function setAuctionDetailsLin(
        uint256 projectId,
        address coreContract,
        uint40 auctionTimestampStart,
        uint40 auctionTimestampEnd,
        uint88 startPrice,
        uint88 basePrice,
        bool allowReconfigureAfterStart
    ) internal {
        DAProjectConfig storage DAProjectConfig_ = getDAProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        require(
            DAProjectConfig_.timestampStart == 0 || // uninitialized
                block.timestamp < DAProjectConfig_.timestampStart || // auction not yet started
                allowReconfigureAfterStart, // specifically allowing reconfiguration after start
            "No modifications mid-auction"
        );
        require(
            block.timestamp < auctionTimestampStart,
            "Only future auctions"
        );
        require(
            startPrice > basePrice,
            "Auction start price must be greater than auction end price"
        );

        // EFFECTS
        DAProjectConfig_.timestampStart = auctionTimestampStart;
        DAProjectConfig_.timestampEnd = auctionTimestampEnd;
        DAProjectConfig_.startPrice = startPrice;
        DAProjectConfig_.basePrice = basePrice;

        emit SetAuctionDetailsLin({
            projectId: projectId,
            coreContract: coreContract,
            auctionTimestampStart: auctionTimestampStart,
            auctionTimestampEnd: auctionTimestampEnd,
            startPrice: startPrice,
            basePrice: basePrice
        });
    }

    function resetAuctionDetails(
        uint256 projectId,
        address coreContract
    ) internal {
        DAProjectConfig storage DAProjectConfig_ = getDAProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });

        DAProjectConfig_.timestampStart = 0;
        DAProjectConfig_.timestampEnd = 0;
        DAProjectConfig_.startPrice = 0;
        DAProjectConfig_.basePrice = 0;

        emit DALib.ResetAuctionDetails({
            projectId: projectId,
            coreContract: coreContract
        });
    }

    /**
     * @notice Gets price of minting a token given the project's
     * DAProjectConfig.
     * This function reverts if auction has not yet started, or if auction is
     * unconfigured.
     * @param projectId Project Id to get price for
     * @param coreContract Core contract address to get price for
     * @return current price of token in Wei
     */
    function getPriceLin(
        uint256 projectId,
        address coreContract
    ) internal view returns (uint256) {
        DAProjectConfig storage _DAProjectConfig = getDAProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        // move parameters to memory if used more than once
        uint256 timestampStart = _DAProjectConfig.timestampStart;
        uint256 timestampEnd = _DAProjectConfig.timestampEnd;
        uint256 startPrice = _DAProjectConfig.startPrice;
        uint256 basePrice = _DAProjectConfig.basePrice;

        require(block.timestamp > timestampStart, "Auction not yet started");
        if (block.timestamp >= timestampEnd) {
            require(timestampEnd > 0, "Only configured auctions");
            return basePrice;
        }
        uint256 elapsedTime;
        uint256 duration;
        uint256 startToEndDiff;
        unchecked {
            // already checked that block.timestamp > _timestampStart
            elapsedTime = block.timestamp - timestampStart;
            // _timestampEnd > _timestampStart enforced during assignment
            duration = timestampEnd - timestampStart;
            // _startPrice > _basePrice enforced during assignment
            startToEndDiff = startPrice - basePrice;
        }
        return startPrice - ((elapsedTime * startToEndDiff) / duration);
    }

    /**
     * Loads the DAProjectConfig for a given project and core contract.
     * @param projectId Project Id to get config for
     * @param coreContract Core contract address to get config for
     */
    function getDAProjectConfig(
        uint256 projectId,
        address coreContract
    ) internal view returns (DAProjectConfig storage) {
        return s().DAProjectConfigs_[coreContract][projectId];
    }

    /**
     * @notice Return the storage struct for reading and writing. This library
     * uses a diamond storage pattern when managing storage.
     * @return storageStruct The DALinLibStorage struct.
     */
    function s() internal pure returns (DALinLibStorage storage storageStruct) {
        bytes32 position = DAE_LIN_LIB_STORAGE_POSITION;
        assembly ("memory-safe") {
            storageStruct.slot := position
        }
    }
}
