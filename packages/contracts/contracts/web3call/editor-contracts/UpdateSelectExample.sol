// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IPMPV0} from "../../interfaces/v0.8.x/IPMPV0.sol";

/**
 * @title UpdateSelectExample
 * @author Art Blocks Inc.
 * @notice This is an open example of how a contract can be used to update a project's PMPs.
 */
contract UpdateSelectExample {
    IPMPV0 public constant PMP =
        IPMPV0(0x59e6F582C4671d5aBDB0F1787Fa9bEE347BB5667);
    address public constant CORE_CONTRACT =
        0x4A6d2e4A18E194317025d7a995C705AAB58d3485;

    function setTokenToCanyonSunset(uint256 tokenId) external {
        _configureTokenParams(tokenId, 0);
    }

    function setTokenToNeonCarnival(uint256 tokenId) external {
        _configureTokenParams(tokenId, 1);
    }

    function setTokenToTropicalSurf(uint256 tokenId) external {
        _configureTokenParams(tokenId, 2);
    }

    function setTokenToTuscanMarket(uint256 tokenId) external {
        _configureTokenParams(tokenId, 3);
    }

    function setTokenToRetroWave(uint256 tokenId) external {
        _configureTokenParams(tokenId, 4);
    }

    function setTokenToSeasideGarden(uint256 tokenId) external {
        _configureTokenParams(tokenId, 5);
    }

    function setTokenToVelvetFog(uint256 tokenId) external {
        _configureTokenParams(tokenId, 6);
    }

    // helper function to configure a token's PMPs on the specific project
    function _configureTokenParams(
        uint256 tokenId,
        uint256 optionIndex
    ) internal {
        IPMPV0.PMPInput[] memory pmpInputs = new IPMPV0.PMPInput[](1);
        pmpInputs[0] = IPMPV0.PMPInput({
            key: "Palette",
            configuredParamType: IPMPV0.ParamType.Select,
            configuredValue: bytes32(uint256(optionIndex)),
            configuringArtistString: false,
            configuredValueString: ""
        });
        PMP.configureTokenParams({
            coreContract: CORE_CONTRACT,
            tokenId: tokenId,
            pmpInputs: pmpInputs
        });
    }
}
