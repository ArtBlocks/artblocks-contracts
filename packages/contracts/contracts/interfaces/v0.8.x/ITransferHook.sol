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
 * Inheriting `AbstractTransferHook` is the recommended way to satisfy both
 * that requirement and the ERC-165 requirement below.
 * @dev A core will not accept a hook unless it ERC-165-advertises this
 * interface. The ERC-165 interface ID is `0x6344b0e2`, which is
 * `type(ITransferHook).interfaceId` — the selector of `onTokenTransfer`
 * alone. Solidity excludes inherited interface functions (here, `IERC165`)
 * from that XOR, so implementers hardcoding the value must use `0x6344b0e2`
 * and not XOR in `IERC165`'s `0x01ffc9a7`.
 */
interface ITransferHook is IERC165 {
    /**
     * @notice Execution logic to be executed after a token's ownership updates.
     * @dev Called after the ERC-721 ownership write. On mint, called after the
     * token hash seed is assigned. Reverting aborts the mint or transfer.
     * @dev The calling core blocks reentrant mints and transfers for the
     * duration of this call, on every project of that core. Implementations
     * must not attempt to mint or transfer on the calling core.
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
