// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/// @author: manifold.xyz

import "@manifoldxyz/creator-core-solidity/contracts/ERC721Creator.sol";

contract MockERC721Creator is ERC721Creator {
    constructor(
        string memory _name,
        string memory _symbol
    ) ERC721Creator(_name, _symbol) {}
}
