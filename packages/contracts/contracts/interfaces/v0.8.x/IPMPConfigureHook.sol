// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IPMPV0} from "./IPMPV0.sol";

import {IERC165} from "@openzeppelin-5.0/contracts/interfaces/IERC165.sol";

interface IPMPConfigureHook is IERC165 {
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
    ) external;

    // @dev ERC156 function supportsInterface must be implemented and broadcast true for this interfaceId
}
