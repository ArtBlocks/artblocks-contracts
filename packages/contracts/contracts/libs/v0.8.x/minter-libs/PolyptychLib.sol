// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../../../interfaces/v0.8.x/IMinterBaseV0.sol";
import "../../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import "../../../interfaces/v0.8.x/IGenArt721CoreContractV3.sol";
import "../../../interfaces/v0.8.x/IGenArt721CoreContractV3_Engine.sol";

import "@openzeppelin-4.7/contracts/token/ERC20/IERC20.sol";

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Split Funds Library
 * @notice This library is designed for the Art Blocks platform. It splits
 * Ether (ETH) and ERC20 token funds among stakeholders, such as sender
 * (if refund is applicable), providers, artists, and artists' additional
 * payees.
 * @author Art Blocks Inc.
 */

library PolyptychLib {
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
        _polyptychProjectConfig.polyptychPanelId++;
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
}
