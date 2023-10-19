// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import "../../../interfaces/v0.8.x/IGenArt721CoreContractExposesHashSeed.sol";
import "../../../interfaces/v0.8.x/IGenArt721CoreContractV3WithSharedRandomizer.sol";
import "../../../interfaces/v0.8.x/ISharedRandomizerV0.sol";

import {GenericMinterEventsLib} from "./GenericMinterEventsLib.sol";

import "@openzeppelin-4.7/contracts/token/ERC20/IERC20.sol";

pragma solidity ^0.8.0;

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
        // panelId => hashSeed => panelIsMinted
        mapping(uint256 => mapping(bytes12 => bool)) polyptychPanelHashSeedIsMinted;
    }

    // Diamond storage pattern is used in this library
    struct PolyptychLibStorage {
        mapping(address coreContract => mapping(uint256 projectId => PolyptychProjectConfig)) polyptychProjectConfigs;
    }

    /**
     * @notice Increments the minter to the next polyptych panel of a given project
     * @param _projectId Project ID to increment panel ID for
     * @param _coreContract Core contract address that _projectId is on
     */
    function incrementPolyptychProjectPanelId(
        uint256 _projectId,
        address _coreContract
    ) internal {
        PolyptychProjectConfig
            storage _polyptychProjectConfig = getPolyptychProjectConfig(
                _projectId,
                _coreContract
            );
        // increment panel ID
        ++_polyptychProjectConfig.polyptychPanelId;

        // index the update
        emit GenericMinterEventsLib.ConfigValueSet(
            _projectId,
            _coreContract,
            PolyptychLib.POLYPTYCH_PANEL_ID,
            _polyptychProjectConfig.polyptychPanelId
        );
    }

    /**
     * Validate the polyptych-related effects after a purchase on a polyptych
     * minter.
     * Verifies that the token hash seed is non-zero, and also enforces that
     * the hash seed can only be used up to one time per panel.
     * @param _projectId Project ID to validate
     * @param _coreContract Core contract address to validate
     * @param _tokenHashSeed token hash seed
     */
    function validatePolyptychEffects(
        uint256 _projectId,
        address _coreContract,
        bytes12 _tokenHashSeed
    ) internal {
        PolyptychProjectConfig
            storage polyptychProjectConfig = getPolyptychProjectConfig(
                _projectId,
                _coreContract
            );
        // ensure non-zero hash seed
        require(_tokenHashSeed != bytes12(0), "Only non-zero hash seeds");
        // verify that the hash seed has not been used on the current panel
        uint256 _panelId = polyptychProjectConfig.polyptychPanelId;
        require(
            !polyptychProjectConfig.polyptychPanelHashSeedIsMinted[_panelId][
                _tokenHashSeed
            ],
            "Panel already minted"
        );
        // mark hash seed as used for the current panel
        polyptychProjectConfig.polyptychPanelHashSeedIsMinted[_panelId][
            _tokenHashSeed
        ] = true;
    }

    /**
     * @notice Sets the polyptych token hash seed on shared randomizer for a
     * token ID on a core contract.
     * @dev This function assumes the core contract is configured to use a
     * shared randomizer that supports polyptych minting.
     * @param _coreContract Core contract address
     * @param _tokenId Token ID to set hash seed for
     * @param _hashSeed Hash seed to set
     */
    function setPolyptychHashSeed(
        address _coreContract,
        uint256 _tokenId,
        bytes12 _hashSeed
    ) internal {
        IGenArt721CoreContractV3WithSharedRandomizer(_coreContract)
            .randomizerContract()
            .preSetHashSeed({
                _coreContract: _coreContract,
                _tokenId: _tokenId,
                _hashSeed: _hashSeed
            });
    }

    /**
     * Validates that token hash seed is assigned to the token ID `_tokenId` on
     * the core contract `_coreContract`.
     * Reverts if hash seed is not assigned to the token ID.
     * @param _coreContract Core contract address
     * @param _tokenId Token ID to validate
     * @param _targetHashSeed target hash seed of `_tokenId` on `_coreContract`
     */
    function validateAssignedHashSeed(
        address _coreContract,
        uint256 _tokenId,
        bytes12 _targetHashSeed
    ) internal view {
        bytes12 _assignedHashSeed = getTokenHashSeed(_coreContract, _tokenId);
        require(
            _assignedHashSeed == _targetHashSeed,
            "Unexpected token hash seed"
        );
    }

    /**
     * Gets token hash seed from core contract.
     * Note that this function assumes the core contract conforms to
     * `IGenArt721CoreContractExposesHashSeed`, which early versions of V3
     * core contracts do not. If a contract does not conform to this interface,
     * this function will revert.
     * @param _coreContract Core contract address
     * @param _tokenId Token ID to query hash seed for
     */
    function getTokenHashSeed(
        address _coreContract,
        uint256 _tokenId
    ) internal view returns (bytes12) {
        return
            IGenArt721CoreContractExposesHashSeed(_coreContract)
                .tokenIdToHashSeed(_tokenId);
    }

    /**
     * Gets the current polyptych panel ID from polyptych project config.
     * Polyptych panel ID is an incremented value that is used to track the
     * current panel of a polyptych project.
     * @param _projectId Project ID to query
     * @param _coreContract Core contract address to query
     */
    function getPolyptychPanelId(
        uint256 _projectId,
        address _coreContract
    ) internal view returns (uint256) {
        PolyptychProjectConfig
            storage polyptychProjectConfig = getPolyptychProjectConfig({
                _projectId: _projectId,
                _coreContract: _coreContract
            });
        return polyptychProjectConfig.polyptychPanelId;
    }

    /**
     * Gets if a polyptych panel has already been minted for a given panel ID
     * and hash seed.
     * @param _projectId Project ID to query
     * @param _coreContract Core contract address to query
     * @param _panelId Polyptych panel ID to query
     * @param _hashSeed Hash seed of panel to query
     */
    function getPolyptychPanelHashSeedIsMinted(
        uint256 _projectId,
        address _coreContract,
        uint256 _panelId,
        bytes12 _hashSeed
    ) internal view returns (bool) {
        PolyptychProjectConfig
            storage polyptychProjectConfig = getPolyptychProjectConfig(
                _projectId,
                _coreContract
            );
        return
            polyptychProjectConfig.polyptychPanelHashSeedIsMinted[_panelId][
                _hashSeed
            ];
    }

    /**
     * Loads the PolyptychProjectConfig for a given project and core
     * contract.
     * @param _projectId Project Id to get config for
     * @param _coreContract Core contract address to get config for
     */
    function getPolyptychProjectConfig(
        uint256 _projectId,
        address _coreContract
    ) internal view returns (PolyptychProjectConfig storage) {
        return s().polyptychProjectConfigs[_coreContract][_projectId];
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
