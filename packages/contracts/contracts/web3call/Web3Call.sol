// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IWeb3Call} from "../interfaces/v0.8.x/IWeb3Call.sol";

import {ERC165} from "@openzeppelin-5.0/contracts/utils/introspection/ERC165.sol";

/**
 * @title Abstract Web3Call contract
 * @author Art Blocks Inc.
 * @notice This abstract can be inherited by any contract that wants to implement the Web3Call interface.
 * It indicates support for the IWeb3Call interface via ERC165 interface detection, and ensures that all
 * child contracts implement the required IWeb3Call functions.
 */
abstract contract Web3Call is IWeb3Call, ERC165 {
    function supportsInterface(
        bytes4 interfaceId
    ) public view override returns (bool) {
        return
            interfaceId == type(IWeb3Call).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
