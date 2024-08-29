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
     * @notice Default min mint fee, in wei, was updated to be the
     * provided value.
     * @param defaultMinMintFee Default min mint fee, in wei
     */
    event DefaultMinMintFeeUpdated(uint256 defaultMinMintFee);

    // position of MinPrice Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant MIN_PRICE_LIB_STORAGE_POSITION =
        keccak256("minpricelib.storage");

    // Diamond storage pattern is used in this library
    struct MinPriceLibStorage {
        uint256 defaultMinMintFee;
    }

    /**
     * @notice Update the default minimum mint fee for the minter, and emit
     * an event.
     * @param newDefaultMinMintFee New default minimum mint fee, in wei
     */
    function _updateDefaultMinMintFee(uint256 newDefaultMinMintFee) internal {
        MinPriceLibStorage storage minPriceLibStorage_ = s();
        minPriceLibStorage_.defaultMinMintFee = newDefaultMinMintFee;
        emit DefaultMinMintFeeUpdated(newDefaultMinMintFee);
    }

    /**
     * @notice Loads the default min mint fee from storage.
     */
    function getDefaultMinMintFee()
        internal
        view
        returns (uint256 defaultMinMintFee)
    {
        return s().defaultMinMintFee;
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
