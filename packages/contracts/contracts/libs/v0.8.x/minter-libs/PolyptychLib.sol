// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import "../../../interfaces/v0.8.x/IGenArt721CoreContractExposesHashSeed.sol";
import "../../../interfaces/v0.8.x/ISharedRandomizerV0.sol";

import "@openzeppelin-4.7/contracts/token/ERC20/IERC20.sol";

pragma solidity ^0.8.0;

/**
 * @title Core contract interface for accessing the randomizer from the minter
 * @notice This interface provides the minter with access to the shared
 * randomizer, allowing the token hash seed for a newly-minted token to be
 * assigned by the minter if the artist has enabled the project as a polyptych.
 * Polytptych projects must use the V3 core contract, this polyptych minter,
 * and a shared randomizer - this interface allows the minter to access the
 * randomizer.
 */
interface IGenArt721CoreContractV3WithSharedRandomizer is
    IGenArt721CoreContractV3_Base,
    IGenArt721CoreContractExposesHashSeed
{
    /// current randomizer contract, that we cast as a shared randomizer
    function randomizerContract() external returns (ISharedRandomizerV0);
}

/**
 * @title Art Blocks Split Funds Library
 * @notice This library is designed for the Art Blocks platform. It splits
 * Ether (ETH) and ERC20 token funds among stakeholders, such as sender
 * (if refund is applicable), providers, artists, and artists' additional
 * payees.
 * @author Art Blocks Inc.
 */

library PolyptychLib {
    bytes32 constant POLYPTYCH_PANEL_ID = "polyptychPanelId";

    struct PolyptychProjectConfig {
        // @dev uint24 provides sufficient qty of panels, and could be packed
        // in the future if other values are added to this struct.
        uint24 polyptychPanelId;
        // Stores whether a panel with an ID has been minted for a given token hash seed
        // panelId => hashSeed => panelIsMinted
        mapping(uint256 => mapping(bytes12 => bool)) polyptychPanelHashSeedIsMinted;
    }

    /**
     * @notice Increments the minter to the next polyptych panel of a given project
     * @param _polyptychProjectConfig Project ID to increment to its next polyptych panel
     */
    function incrementPolyptychProjectPanelId(
        PolyptychProjectConfig storage _polyptychProjectConfig
    ) internal {
        ++_polyptychProjectConfig.polyptychPanelId;
    }

    /**
     * Validate the polyptych-related effects after a purchase on a polyptych
     * minter.
     * Verifies that the token hash seed is non-zero, and also enforces that
     * the hash seed can only be used up to one time per panel.
     * @param _polyptychProjectConfig polyptych project config
     * @param _tokenHashSeed token hash seed
     */
    function validatePolyptychEffects(
        PolyptychProjectConfig storage _polyptychProjectConfig,
        bytes12 _tokenHashSeed
    ) internal {
        // ensure non-zero hash seed
        require(_tokenHashSeed != bytes12(0), "Only non-zero hash seeds");
        // verify that the hash seed has not been used on the current panel
        uint256 _panelId = _polyptychProjectConfig.polyptychPanelId;
        require(
            !_polyptychProjectConfig.polyptychPanelHashSeedIsMinted[_panelId][
                _tokenHashSeed
            ],
            "Panel already minted"
        );
        // mark hash seed as used for the current panel
        _polyptychProjectConfig.polyptychPanelHashSeedIsMinted[_panelId][
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
            .setPolyptychHashSeed({
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

    function getTokenHashSeed(
        address _coreContract,
        uint256 _tokenId
    ) internal view returns (bytes12) {
        return
            IGenArt721CoreContractExposesHashSeed(_coreContract)
                .tokenIdToHashSeed(_tokenId);
    }

    function getPolyptychPanelId(
        PolyptychProjectConfig storage _polyptychProjectConfig
    ) internal view returns (uint256) {
        return _polyptychProjectConfig.polyptychPanelId;
    }

    function getPolyptychPanelHashSeedIsMinted(
        PolyptychProjectConfig storage _polyptychProjectConfig,
        uint256 _panelId,
        bytes12 _hashSeed
    ) internal view returns (bool) {
        return
            _polyptychProjectConfig.polyptychPanelHashSeedIsMinted[_panelId][
                _hashSeed
            ];
    }
}
