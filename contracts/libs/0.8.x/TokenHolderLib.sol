// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "@openzeppelin-4.5/contracts/utils/structs/EnumerableSet.sol";

pragma solidity ^0.8.0;

library TokenHolderLib {
    using EnumerableSet for EnumerableSet.AddressSet;

    uint256 constant ONE_MILLION = 1_000_000;

    function isAllowlistedNFT(
        mapping(uint256 => mapping(address => mapping(uint256 => bool)))
            storage allowedProjectHolders,
        uint256 _contractProjectId,
        address _ownedNFTAddress,
        uint256 _ownedNFTTokenId
    ) public view returns (bool) {
        uint256 ownedNFTProjectId = _ownedNFTTokenId / ONE_MILLION;
        return
            allowedProjectHolders[_contractProjectId][_ownedNFTAddress][
                ownedNFTProjectId
            ];
    }

    function registerNFTAddress(
        EnumerableSet.AddressSet storage _registeredNFTAddresses,
        address _NFTAddress
    ) external {
        _registeredNFTAddresses.add(_NFTAddress);
    }

    function unregisterNFTAddress(
        EnumerableSet.AddressSet storage _registeredNFTAddresses,
        address _NFTAddress
    ) external {
        _registeredNFTAddresses.remove(_NFTAddress);
    }

    function allowHoldersOfProjects(
        mapping(uint256 => mapping(address => mapping(uint256 => bool)))
            storage allowedProjectHolders,
        uint256 _contractProjectId,
        address[] memory _ownedNFTAddresses,
        uint256[] memory _ownedNFTProjectIds
    ) external {
        require(
            _ownedNFTAddresses.length == _ownedNFTProjectIds.length,
            "TokenHolderLib: arrays must be same length"
        );
        for (uint256 i = 0; i < _ownedNFTAddresses.length; i++) {
            // ensure registered address
            require(
                _registeredNFTAddresses.contains(_ownedNFTAddresses[i]),
                "TokenHolderLib: address not registered"
            );
            allowedProjectHolders[_contractProjectId][_ownedNFTAddresses[i]][
                _ownedNFTProjectIds[i]
            ] = true;
        }
    }

    function removeHoldersOfProjects(
        mapping(uint256 => mapping(address => mapping(uint256 => bool)))
            storage allowedProjectHolders,
        uint256 _contractProjectId,
        address[] memory _ownedNFTAddresses,
        uint256[] memory _ownedNFTProjectIds
    ) external {
        require(
            _ownedNFTAddresses.length == _ownedNFTProjectIds.length,
            "TokenHolderLib: arrays must be same length"
        );
        for (uint256 i = 0; i < _ownedNFTAddresses.length; i++) {
            // ensure registered address
            require(
                _registeredNFTAddresses.contains(_ownedNFTAddresses[i]),
                "TokenHolderLib: address not registered"
            );
            allowedProjectHolders[_contractProjectId][_ownedNFTAddresses[i]][
                _ownedNFTProjectIds[i]
            ] = false;
        }
    }

    function allowRemoveHoldersOfProjects(
        mapping(uint256 => mapping(address => mapping(uint256 => bool)))
            storage allowedProjectHolders,
        uint256 _contractProjectId,
        address[] memory _ownedNFTAddressesAdd,
        uint256[] memory _ownedNFTProjectIdsAdd,
        address[] memory _ownedNFTAddressesRemove,
        uint256[] memory _ownedNFTProjectIdsRemove
    ) external {
        allowedProjectHolders(
            _contractProjectId,
            _ownedNFTAddressesAdd,
            _ownedNFTProjectIdsAdd
        );
        removeHoldersOfProjects(
            _contractProjectId,
            _ownedNFTAddressesRemove,
            _ownedNFTProjectIdsRemove
        );
    }

    function isAllowlistedNFT(
        mapping(uint256 => mapping(address => mapping(uint256 => bool)))
            storage allowedProjectHolders,
        uint256 _contractProjectId,
        address _ownedNFTAddress,
        uint256 _ownedNFTTokenId
    ) public view returns (bool) {
        uint256 ownedNFTProjectId = _ownedNFTTokenId / ONE_MILLION;
        return
            allowedProjectHolders[_contractProjectId][_ownedNFTAddress][
                ownedNFTProjectId
            ];
    }
}
