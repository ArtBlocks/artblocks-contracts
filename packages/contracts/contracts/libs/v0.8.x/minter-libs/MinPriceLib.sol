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
     * @notice Default mint fee, in wei, was updated to be the
     * provided value.
     * @param defaultMintFee Default mint fee, in wei
     */
    event DefaultMintFeeUpdated(uint256 defaultMintFee);

    // position of MinPrice Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant MIN_PRICE_LIB_STORAGE_POSITION =
        keccak256("minpricelib.storage");

    // Diamond storage pattern is used in this library
    struct MinPriceLibStorage {
        uint256 defaultMintFee;
    }

    function _updateDefaultMintFee(uint256 newDefaultMintFee) internal {
        MinPriceLibStorage storage minPriceLibStorage_ = s();
        minPriceLibStorage_.defaultMintFee = newDefaultMintFee;
        emit DefaultMintFeeUpdated(newDefaultMintFee);
    }

    /**
     * @notice Loads the default mint fee from storage.
     */
    function getDefaultMintFee()
        internal
        view
        returns (uint256 defaultMintFee)
    {
        return s().defaultMintFee;
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
