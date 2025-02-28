// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.22;

import "../interfaces/v0.8.x/IPMPConfigureHook.sol";
import {IPMPV0} from "../interfaces/v0.8.x/IPMPV0.sol";
import "@openzeppelin-5.0/contracts/utils/introspection/ERC165.sol";

/**
 * @title Mock PMP Configure Hook
 * @notice Mock implementation of IPMPConfigureHook for testing purposes
 */
contract MockPMPConfigureHook is IPMPConfigureHook, ERC165 {
    // Event to track when the hook is called
    event TokenPMPConfigured(
        address indexed coreContract,
        uint256 indexed tokenId,
        IPMPV0.PMPInput pmpInput
    );

    // Track last interaction for testing purposes
    address public lastCoreContract;
    uint256 public lastTokenId;
    string public lastPmpKey;
    bytes32 public lastConfiguredValue;
    string public lastConfiguredValueString;
    bool public lastConfiguringArtistString;

    // Support flag - can be set to simulate failure scenarios
    bool public shouldRevert = false;

    /**
     * @notice Sets whether the hook should revert on calls
     * @param _shouldRevert True if the hook should revert when called
     */
    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    /**
     * @notice Implement the hook method that gets called after token PMP configuration
     * @param coreContract The address of the core contract
     * @param tokenId The token ID that was configured
     * @param pmpInput The PMP input that was used for configuration
     */
    function onTokenPMPConfigure(
        address coreContract,
        uint256 tokenId,
        IPMPV0.PMPInput memory pmpInput
    ) external override {
        // Store the information for testing
        lastCoreContract = coreContract;
        lastTokenId = tokenId;
        lastPmpKey = pmpInput.key;
        lastConfiguredValue = pmpInput.configuredValue;
        lastConfiguredValueString = pmpInput.configuredValueString;
        lastConfiguringArtistString = pmpInput.configuringArtistString;

        emit TokenPMPConfigured(coreContract, tokenId, pmpInput);

        // Optionally revert to test error handling
        if (shouldRevert) {
            revert("MockPMPConfigureHook: Intentional revert");
        }
    }

    /**
     * @notice Implement ERC165 interface detection
     * @param interfaceId The interface ID to check
     * @return True if the interface is supported
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IPMPConfigureHook).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
