// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IGenArt721CoreContractV3_Base} from "../../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import {IGenArt721CoreContractExposesHashSeed} from "../../../interfaces/v0.8.x/IGenArt721CoreContractExposesHashSeed.sol";
import {IGenArt721CoreContractV3WithSharedRandomizer} from "../../../interfaces/v0.8.x/IGenArt721CoreContractV3WithSharedRandomizer.sol";
import {ISharedRandomizerV0} from "../../../interfaces/v0.8.x/ISharedRandomizerV0.sol";

import {GenericMinterEventsLib} from "./GenericMinterEventsLib.sol";

import {IERC20} from "@openzeppelin-4.7/contracts/token/ERC20/IERC20.sol";

/**
 * @title Art Blocks Polyptych Minter Library
 * @notice This library is designed for the Art Blocks platform. It includes
 * structs and functions to help configure Polyptych minters.
 * @author Art Blocks Inc.
 */

library PolyptychLib {
    bytes32 constant POLYPTYCH_PANEL_ID = "polyptychPanelId";

    // position of Polyptych Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant POLYPTYCH_LIB_STORAGE_POSITION =
        keccak256("polyptychlib.storage");

    struct PolyptychProjectConfig {
        // @dev uint24 provides sufficient qty of panels, and could be packed
        // in the future if other values are added to this struct.
        uint24 polyptychPanelId;
        // Stores whether a panel with an ID has been minted for a given token hash seed
        mapping(uint256 panelId => mapping(bytes12 hashSeed => bool panelIsMinted)) polyptychPanelHashSeedIsMinted;
    }

    // Diamond storage pattern is used in this library
    struct PolyptychLibStorage {
        mapping(address coreContract => mapping(uint256 projectId => PolyptychProjectConfig)) polyptychProjectConfigs;
    }

    /**
     * @notice Increments the minter to the next polyptych panel of a given project
     * @param projectId Project ID to increment panel ID for
     * @param coreContract Core contract address that _projectId is on
     */
    function incrementPolyptychProjectPanelId(
        uint256 projectId,
        address coreContract
    ) internal {
        PolyptychProjectConfig
            storage polyptychProjectConfig = getPolyptychProjectConfig(
                projectId,
                coreContract
            );
        // increment panel ID
        ++polyptychProjectConfig.polyptychPanelId;

        // index the update
        emit GenericMinterEventsLib.ConfigValueSet(
            projectId,
            coreContract,
            PolyptychLib.POLYPTYCH_PANEL_ID,
            polyptychProjectConfig.polyptychPanelId
        );
    }

    /**
     * Validate the polyptych-related effects after a purchase on a polyptych
     * minter.
     * Verifies that the token hash seed is non-zero, and also enforces that
     * the hash seed can only be used up to one time per panel.
     * @param projectId Project ID to validate
     * @param coreContract Core contract address to validate
     * @param tokenHashSeed token hash seed
     */
    function validatePolyptychEffects(
        uint256 projectId,
        address coreContract,
        bytes12 tokenHashSeed
    ) internal {
        PolyptychProjectConfig
            storage polyptychProjectConfig = getPolyptychProjectConfig(
                projectId,
                coreContract
            );
        // ensure non-zero hash seed
        require(tokenHashSeed != bytes12(0), "Only non-zero hash seeds");
        // verify that the hash seed has not been used on the current panel
        uint256 panelId = polyptychProjectConfig.polyptychPanelId;
        require(
            !polyptychProjectConfig.polyptychPanelHashSeedIsMinted[panelId][
                tokenHashSeed
            ],
            "Panel already minted"
        );
        // mark hash seed as used for the current panel
        polyptychProjectConfig.polyptychPanelHashSeedIsMinted[panelId][
            tokenHashSeed
        ] = true;
    }

    /**
     * @notice Sets the polyptych token hash seed on shared randomizer for a
     * token ID on a core contract.
     * @dev This function assumes the core contract is configured to use a
     * shared randomizer that supports polyptych minting.
     * @param coreContract Core contract address
     * @param tokenId Token ID to set hash seed for
     * @param hashSeed Hash seed to set
     */
    function setPolyptychHashSeed(
        address coreContract,
        uint256 tokenId,
        bytes12 hashSeed
    ) internal {
        IGenArt721CoreContractV3WithSharedRandomizer(coreContract)
            .randomizerContract()
            .preSetHashSeed({
                coreContract: coreContract,
                tokenId: tokenId,
                hashSeed: hashSeed
            });
    }

    /**
     * Validates that token hash seed is assigned to the token ID `tokenId` on
     * the core contract `coreContract`.
     * Reverts if hash seed is not assigned to the token ID.
     * @param coreContract Core contract address
     * @param tokenId Token ID to validate
     * @param targetHashSeed target hash seed of `tokenId` on `coreContract`
     */
    function validateAssignedHashSeed(
        address coreContract,
        uint256 tokenId,
        bytes12 targetHashSeed
    ) internal view {
        bytes12 assignedHashSeed = getTokenHashSeed(coreContract, tokenId);
        require(
            assignedHashSeed == targetHashSeed,
            "Unexpected token hash seed"
        );
    }

    /**
     * Gets token hash seed from core contract.
     * Note that this function assumes the core contract conforms to
     * `IGenArt721CoreContractExposesHashSeed`, which early versions of V3
     * core contracts do not. If a contract does not conform to this interface,
     * this function will revert.
     * @param coreContract Core contract address
     * @param tokenId Token ID to query hash seed for
     */
    function getTokenHashSeed(
        address coreContract,
        uint256 tokenId
    ) internal view returns (bytes12) {
        return
            IGenArt721CoreContractExposesHashSeed(coreContract)
                .tokenIdToHashSeed(tokenId);
    }

    /**
     * Gets the current polyptych panel ID from polyptych project config.
     * Polyptych panel ID is an incremented value that is used to track the
     * current panel of a polyptych project.
     * @param projectId Project ID to query
     * @param coreContract Core contract address to query
     */
    function getPolyptychPanelId(
        uint256 projectId,
        address coreContract
    ) internal view returns (uint256) {
        PolyptychProjectConfig
            storage polyptychProjectConfig = getPolyptychProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        return polyptychProjectConfig.polyptychPanelId;
    }

    /**
     * Gets if a polyptych panel has already been minted for a given panel ID
     * and hash seed.
     * @param projectId Project ID to query
     * @param coreContract Core contract address to query
     * @param panelId Polyptych panel ID to query
     * @param hashSeed Hash seed of panel to query
     */
    function getPolyptychPanelHashSeedIsMinted(
        uint256 projectId,
        address coreContract,
        uint256 panelId,
        bytes12 hashSeed
    ) internal view returns (bool) {
        PolyptychProjectConfig
            storage polyptychProjectConfig = getPolyptychProjectConfig(
                projectId,
                coreContract
            );
        return
            polyptychProjectConfig.polyptychPanelHashSeedIsMinted[panelId][
                hashSeed
            ];
    }

    /**
     * Loads the PolyptychProjectConfig for a given project and core
     * contract.
     * @param projectId Project Id to get config for
     * @param coreContract Core contract address to get config for
     */
    function getPolyptychProjectConfig(
        uint256 projectId,
        address coreContract
    ) internal view returns (PolyptychProjectConfig storage) {
        return s().polyptychProjectConfigs[coreContract][projectId];
    }

    /**
     * @notice Return the storage struct for reading and writing. This library
     * uses a diamond storage pattern when managing storage.
     * @return storageStruct The PolyptychLibStorage struct.
     */
    function s()
        internal
        pure
        returns (PolyptychLibStorage storage storageStruct)
    {
        bytes32 position = POLYPTYCH_LIB_STORAGE_POSITION;
        assembly {
            storageStruct.slot := position
        }
    }
}
