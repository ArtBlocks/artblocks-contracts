// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Min Price Library
 * @notice This library is designed for the Art Blocks platform. It includes
 * events to assist with minters that implement a minimum mint fee.
 * @author Art Blocks Inc.
 */

library MinPriceLib {
    /**
     * @notice Min mint fee, in wei, was updated to be the
     * provided value.
     * @param minMintFee Min mint fee, in wei
     */
    event MinMintFeeUpdated(uint256 minMintFee);

    // position of MinPrice Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant MIN_PRICE_LIB_STORAGE_POSITION =
        keccak256("minpricelib.storage");

    // Diamond storage pattern is used in this library
    struct MinPriceLibStorage {
        uint256 minMintFee;
    }

    /**
     * @notice Update the minimum mint fee for the minter, and emit
     * an event.
     * @param newMinMintFee New minimum mint fee, in wei
     */
    function updateMinMintFee(uint256 newMinMintFee) internal {
        MinPriceLibStorage storage minPriceLibStorage_ = s();
        minPriceLibStorage_.minMintFee = newMinMintFee;
        emit MinMintFeeUpdated(newMinMintFee);
    }

    /**
     * @notice Loads the min mint fee from storage.
     */
    function getMinMintFee() internal view returns (uint256 minMintFee) {
        return s().minMintFee;
    }

    /**
     * @notice Return the storage struct for reading and writing. This library
     * uses a diamond storage pattern when managing storage.
     * @return storageStruct The MinPriceLibStorage struct.
     */
    function s()
        internal
        pure
        returns (MinPriceLibStorage storage storageStruct)
    {
        bytes32 position = MIN_PRICE_LIB_STORAGE_POSITION;
        assembly ("memory-safe") {
            storageStruct.slot := position
        }
    }
}
