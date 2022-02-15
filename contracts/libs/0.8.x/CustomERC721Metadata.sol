// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

/**
 * ERC721 base contract without the concept of tokenUri as this is managed by the parent
 */
abstract contract CustomERC721Metadata is ERC165, ERC721Enumerable {
    // Token name
    string private _name;

    // Token symbol
    string private _symbol;

    bytes4 private constant _INTERFACE_ID_ERC721_METADATA = 0x5b5e139f;

    /**
     * @dev Constructor function
     */
    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
    {
        _name = name_;
        _symbol = symbol_;
    }

    /**
     * @dev Implementation of the {IERC165} interface.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC165, ERC721Enumerable)
        returns (bool)
    {
        return
            interfaceId == _INTERFACE_ID_ERC721_METADATA ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @dev Gets the token name
     * @return string representing the token name
     */
    function name() public view override returns (string memory) {
        return _name;
    }

    /**
     * @dev Gets the token symbol
     * @return string representing the token symbol
     */
    function symbol() public view override returns (string memory) {
        return _symbol;
    }
}
