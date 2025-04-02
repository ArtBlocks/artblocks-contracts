// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IPMPConfigureHook} from "../../interfaces/v0.8.x/IPMPConfigureHook.sol";
import {IWeb3Call} from "../../interfaces/v0.8.x/IWeb3Call.sol";
import {IPMPV0} from "../../interfaces/v0.8.x/IPMPV0.sol";

import {ERC165} from "@openzeppelin-5.0/contracts/utils/introspection/ERC165.sol";
import {IERC165} from "@openzeppelin-5.0/contracts/interfaces/IERC165.sol";

/**
 * @title Abstract Web3Call contract
 * @author Art Blocks Inc.
 * @notice This abstract can be inherited by any contract that wants to implement the Web3Call interface.
 * It indicates support for the IWeb3Call interface via ERC165 interface detection, and ensures that all
 * child contracts implement the required IWeb3Call functions.
 */
abstract contract abstractPMPAugmentHook is IPMPConfigureHook, ERC165 {
    /**
     * @notice Execution logic to be executed when a token's PMP is configured.
     * @dev This hook is executed after the PMP is configured.
     * @param coreContract The address of the core contract that was configured.
     * @param tokenId The tokenId of the token that was configured.
     * @param pmpInput The PMP input that was used to successfully configure the token.
     */
    function onTokenPMPConfigure(
        address coreContract,
        uint256 tokenId,
        IPMPV0.PMPInput calldata pmpInput
    ) external virtual;

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IPMPConfigureHook).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
