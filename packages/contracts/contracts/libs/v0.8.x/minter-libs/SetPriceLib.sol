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
     * @notice Price per token updated for project `projectId` to
     * `pricePerToken`.
     * @param projectId Project Id price was updated for
     * @param coreContract Core contract address price was updated for
     * @param pricePerToken price per token, no decimals (e.g. in wei for ETH)
     */
    event PricePerTokenUpdated(
        uint256 indexed projectId,
        address indexed coreContract,
        uint256 indexed pricePerToken
    );

    /**
     * @notice Price per token reset (unconfigured) for project `projectId`.
     * @param projectId Project Id price was reset for
     * @param coreContract Core contract address price was reset for
     */
    event PricePerTokenReset(
        uint256 indexed projectId,
        address indexed coreContract
    );

    // position of Set Price Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant SET_PRICE_LIB_STORAGE_POSITION =
        keccak256("setpricelib.storage");

    // project-level variables
    /**
     * Struct used to store a project's currently configured price, and
     * whether or not the price has been configured.
     */
    struct SetPriceProjectConfig {
        // @dev The price is stored with no accounting for decimals. e.g. in
        // wei for ETH.
        uint248 pricePerToken; // 0 if not configured
        bool priceIsConfigured;
    }

    // Diamond storage pattern is used in this library
    struct SetPriceLibStorage {
        mapping(address coreContract => mapping(uint256 projectId => SetPriceProjectConfig)) setPriceProjectConfigs;
    }

    /**
     * @notice Updates the minter's price per token to be `pricePerToken`.
     * @dev Note that it is intentionally supported here that the configured
     * price may be explicitly set to `0`.
     * @param projectId Project Id to update price for
     * @param coreContract Core contract address to update price for
     * @param pricePerToken price per token, no decimals (e.g. in wei for ETH)
     */
    function updatePricePerToken(
        uint256 projectId,
        address coreContract,
        uint256 pricePerToken
    ) internal {
        SetPriceProjectConfig
            storage setPriceProjectConfig = getSetPriceProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        // update storage with new values
        setPriceProjectConfig.pricePerToken = uint248(pricePerToken);
        setPriceProjectConfig.priceIsConfigured = true;

        emit PricePerTokenUpdated({
            projectId: projectId,
            coreContract: coreContract,
            pricePerToken: pricePerToken
        });
    }

    /**
     * @notice Resets the minter's price per token to be unconfigured.
     * @param projectId Project Id to reset price for
     * @param coreContract Core contract address to reset the price for
     */
    function resetPricePerToken(
        uint256 projectId,
        address coreContract
    ) internal {
        // @dev all fields must be deleted, and none of them are a complex type
        // @dev getSetPriceProjectConfig not used, as deletion of storage
        // pointers is not supported
        delete s().setPriceProjectConfigs[coreContract][projectId];

        emit PricePerTokenReset({
            projectId: projectId,
            coreContract: coreContract
        });
    }

    /**
     * @notice Checks that the minter's price per token is configured, and
     * returns the price per token.
     * Reverts if the price is not configured.
     * @param projectId Project Id to check and get price for
     * @param coreContract Core contract address to check and get price for
     * @return pricePerToken price per token, no decimals (e.g. in wei for ETH)
     */
    function preMintChecksAndGetPrice(
        uint256 projectId,
        address coreContract
    ) internal view returns (uint256 pricePerToken) {
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
        return setPriceProjectConfig.pricePerToken;
    }

    /**
     * @notice Loads the SetPriceProjectConfig for a given project and core contract.
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
        assembly ("memory-safe") {
            storageStruct.slot := position
        }
    }
}
