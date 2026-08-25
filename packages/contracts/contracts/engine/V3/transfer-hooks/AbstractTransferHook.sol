// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {ITransferHook} from "../../../interfaces/v0.8.x/ITransferHook.sol";

import {ERC165} from "@openzeppelin-5.0/contracts/utils/introspection/ERC165.sol";
import {IERC165} from "@openzeppelin-5.0/contracts/interfaces/IERC165.sol";

/**
 * @title Abstract transfer hook
 * @author Art Blocks Inc.
 * @notice Inherit this to implement `ITransferHook` with ERC-165. Child
 * contracts MUST authenticate `msg.sender` as an expected core; a hook that
 * skips that check can be spoofed by any caller.
 */
abstract contract AbstractTransferHook is ITransferHook, ERC165 {
    /**
     * @notice Execution logic to be executed after a token's ownership updates.
     * @dev Called after the ERC-721 ownership write. On mint, called after the
     * token hash seed is assigned. Reverting aborts the mint or transfer.
     */
    function onTokenTransfer(
        address coreContract,
        uint256 tokenId,
        address from,
        address to,
        address operator
    ) external virtual;

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(ITransferHook).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
