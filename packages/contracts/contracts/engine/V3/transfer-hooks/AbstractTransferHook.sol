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
 * contracts implement `_onTokenTransfer` instead of `onTokenTransfer`.
 * ----------------------------------------------------------------------------
 * This contract enforces that `coreContract` is the caller, so children may
 * safely treat the `coreContract` argument as trusted-as-caller. It does NOT,
 * and cannot, know which cores a given hook is willing to serve.
 * ----------------------------------------------------------------------------
 * WARNING: Children MUST still verify that `coreContract` is a core they
 * expect. Without that check, any deployed contract can invoke this hook with
 * arbitrary `tokenId`, `from`, `to`, and `operator` values by calling it from
 * its own address.
 */
abstract contract AbstractTransferHook is ITransferHook, ERC165 {
    /**
     * @notice Thrown when `onTokenTransfer` is called by an address other than
     * the `coreContract` it was passed.
     * @param caller The address that called `onTokenTransfer`.
     * @param coreContract The `coreContract` argument that was passed.
     */
    error TransferHookCallerNotCoreContract(
        address caller,
        address coreContract
    );

    /**
     * @notice Execution logic to be executed after a token's ownership updates.
     * @dev Called after the ERC-721 ownership write. On mint, called after the
     * token hash seed is assigned. Reverting aborts the mint or transfer.
     * @dev Intentionally not `virtual`: the caller check below is a security
     * invariant of this base contract, and children override `_onTokenTransfer`
     * so they cannot remove it by accident.
     */
    function onTokenTransfer(
        address coreContract,
        uint256 tokenId,
        address from,
        address to,
        address operator
    ) external {
        // @dev a conforming core always passes its own address, so this only
        // rejects callers that are spoofing another contract's identity
        if (msg.sender != coreContract) {
            revert TransferHookCallerNotCoreContract({
                caller: msg.sender,
                coreContract: coreContract
            });
        }
        _onTokenTransfer({
            coreContract: coreContract,
            tokenId: tokenId,
            from: from,
            to: to,
            operator: operator
        });
    }

    /**
     * @notice Hook implementation, called only after `coreContract` has been
     * verified to be `msg.sender`.
     * @dev Implementations MUST still verify that `coreContract` is a core
     * this hook is intended to serve.
     * @param coreContract The core contract that performed the ownership
     * update. Guaranteed equal to `msg.sender`.
     * @param tokenId The token whose ownership changed.
     * @param from Previous owner. `address(0)` on mint.
     * @param to New owner.
     * @param operator Transfer operator, or the mint's initiating address.
     */
    function _onTokenTransfer(
        address coreContract,
        uint256 tokenId,
        address from,
        address to,
        address operator
    ) internal virtual;

    /**
     * @notice Indicates support for `ITransferHook` (`0x6344b0e2`), which V3
     * cores require before a hook may be configured.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(ITransferHook).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
