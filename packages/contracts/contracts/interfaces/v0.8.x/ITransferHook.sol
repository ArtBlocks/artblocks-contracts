// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IERC165} from "@openzeppelin-5.0/contracts/interfaces/IERC165.sol";

/**
 * @title Transfer hook interface for Art Blocks V3 Engine cores.
 * @author Art Blocks Inc.
 * @notice Invoked by a core after a token's ownership has been updated (mint
 * or transfer). A reverting hook aborts the entire mint or transfer.
 * Implementations MUST authenticate `msg.sender` as the expected core; the
 * core passes `coreContract` for convenience when one hook serves many cores.
 */
interface ITransferHook is IERC165 {
    /**
     * @notice Execution logic to be executed after a token's ownership updates.
     * @dev Called after the ERC-721 ownership write. On mint, called after the
     * token hash seed is assigned. Reverting aborts the mint or transfer.
     * @param coreContract The core contract that performed the ownership update.
     * Also equal to `msg.sender` when called by a conforming core.
     * @param tokenId The token whose ownership changed.
     * @param from Previous owner. `address(0)` on mint.
     * @param to New owner. `address(0)` on burn (cores do not currently burn).
     * @param operator For transfers, the ERC-721 operator (`_msgSender()`).
     * For mint, the `_by` address passed to `mint_Ecf` (the initiating user,
     * not the minter contract).
     */
    function onTokenTransfer(
        address coreContract,
        uint256 tokenId,
        address from,
        address to,
        address operator
    ) external;
}
