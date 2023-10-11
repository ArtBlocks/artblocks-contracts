// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Set Price Minter Library
 * @notice This library is designed for the Art Blocks platform. It provides a
 * struct and functions that falicitate the configuring of projects that use a
 * fixed-price minting model.
 * @author Art Blocks Inc.
 */

library SetPriceLib {
    /**
     * @notice Price per token in wei updated for project `projectId` to
     * `pricePerTokenInWei`.
     */
    event PricePerTokenInWeiUpdated(
        uint256 indexed projectId,
        address indexed coreContract,
        uint256 indexed pricePerTokenInWei
    );

    // position of Set Price Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant SET_PRICE_LIB_STORAGE_POSITION =
        keccak256("setpricelib.storage");

    // project-level variables
    /**
     * Struct used to store a project's currently configured price in wei, and
     * whether or not the price has been configured.
     */
    struct SetPriceProjectConfig {
        uint248 pricePerTokenInWei; // 0 if not configured
        bool priceIsConfigured;
    }

    // Diamond storage pattern is used in this library
    struct SetPriceLibStorage {
        mapping(address coreContract => mapping(uint256 projectId => SetPriceProjectConfig)) setPriceProjectConfigs;
    }

    /**
     * @notice Updates the minter's price per token in wei to be
     * `pricePerTokenInWei`, in Wei, for the referenced SetPriceProjectConfig
     * struct in storage.
     * @dev Note that it is intentionally supported here that the configured
     * price may be explicitly set to `0`.
     * @param projectId Project Id to update price for
     * @param coreContract Core contract address to update price for
     * @param pricePerTokenInWei price per token in wei.
     */
    function updatePricePerTokenInWei(
        uint256 projectId,
        address coreContract,
        uint256 pricePerTokenInWei
    ) internal {
        SetPriceProjectConfig
            storage setPriceProjectConfig = getSetPriceProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        // update storage with new values
        setPriceProjectConfig.pricePerTokenInWei = uint248(pricePerTokenInWei);
        setPriceProjectConfig.priceIsConfigured = true;

        emit PricePerTokenInWeiUpdated({
            projectId: projectId,
            coreContract: coreContract,
            pricePerTokenInWei: pricePerTokenInWei
        });
    }

    function preMintChecksAndGetPrice(
        uint256 projectId,
        address coreContract
    ) internal view returns (uint256 pricePerTokenInWei) {
        SetPriceProjectConfig
            storage setPriceProjectConfig = getSetPriceProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });

        // require artist to have configured price of token on this minter
        require(
            setPriceProjectConfig.priceIsConfigured,
            "Price not configured"
        );
        return setPriceProjectConfig.pricePerTokenInWei;
    }

    /**
     * Loads the SetPriceProjectConfig for a given project and core contract.
     * @param projectId Project Id to get config for
     * @param coreContract Core contract address to get config for
     */
    function getSetPriceProjectConfig(
        uint256 projectId,
        address coreContract
    ) internal view returns (SetPriceProjectConfig storage) {
        return s().setPriceProjectConfigs[coreContract][projectId];
    }

    /**
     * @notice Return the storage struct for reading and writing. This library
     * uses a diamond storage pattern when managing storage.
     * @return storageStruct The SetPriceLibStorage struct.
     */
    function s()
        internal
        pure
        returns (SetPriceLibStorage storage storageStruct)
    {
        bytes32 position = SET_PRICE_LIB_STORAGE_POSITION;
        assembly {
            storageStruct.slot := position
        }
    }
}
