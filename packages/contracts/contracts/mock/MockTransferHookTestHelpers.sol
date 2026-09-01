// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.22;

import {ITransferHook} from "../interfaces/v0.8.x/ITransferHook.sol";

import {IERC721} from "@openzeppelin-5.0/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin-5.0/contracts/token/ERC721/IERC721Receiver.sol";

/**
 * @title Mock ERC-721 receiver that forwards the token it receives.
 * @notice Used to verify that a V3 core releases its transfer hook reentrancy
 * guard before invoking `onERC721Received`, so that escrow/wrapper contracts
 * which forward on receipt continue to work.
 */
contract MockForwardingERC721Receiver is IERC721Receiver {
    address public forwardTo;

    /**
     * @param _forwardTo Address to forward received tokens to. If
     * `address(0)`, received tokens are kept.
     */
    function setForwardTo(address _forwardTo) external {
        forwardTo = _forwardTo;
    }

    function onERC721Received(
        address /* operator */,
        address /* from */,
        uint256 tokenId,
        bytes calldata /* data */
    ) external returns (bytes4) {
        if (forwardTo != address(0)) {
            // @dev msg.sender is the core contract performing the safe transfer
            IERC721(msg.sender).transferFrom(address(this), forwardTo, tokenId);
        }
        return IERC721Receiver.onERC721Received.selector;
    }
}

/**
 * @title Mock batch transferrer.
 * @notice Performs multiple sequential (not nested) transfers in a single
 * transaction. Used to verify that the transfer hook reentrancy guard is
 * per-call rather than per-transaction, so marketplace batch flows are
 * unaffected.
 */
contract MockBatchTransferrer {
    function batchTransfer(
        address coreContract,
        address from,
        address to,
        uint256[] calldata tokenIds
    ) external {
        uint256 length = tokenIds.length;
        for (uint256 i; i < length; i++) {
            IERC721(coreContract).transferFrom(from, to, tokenIds[i]);
        }
    }
}

/**
 * @title Mock core that invokes a transfer hook with arbitrary inputs.
 * @notice Covers the one caller `AbstractTransferHook` cannot reject: a
 * contract that passes its own address as `coreContract`. Its answer to
 * `projectTransferHookConfig` is settable, so both a caller that has not
 * configured the hook and one that claims it has can be simulated.
 */
contract MockSpoofingCore {
    address public configuredHook;

    function setConfiguredHook(address hook) external {
        configuredHook = hook;
    }

    function projectTransferHookConfig(
        uint256 /* projectId */
    ) external view returns (address hook, bool locked) {
        return (configuredHook, false);
    }

    function callHook(
        address hook,
        uint256 tokenId,
        address from,
        address to,
        address operator
    ) external {
        ITransferHook(hook).onTokenTransfer({
            coreContract: address(this),
            tokenId: tokenId,
            from: from,
            to: to,
            operator: operator
        });
    }
}
