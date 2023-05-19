// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "@openzeppelin-4.5/contracts/utils/structs/EnumerableSet.sol";

pragma solidity ^0.8.0;

library TokenHolderLib {
    using EnumerableSet for EnumerableSet.AddressSet;

    uint256 constant ONE_MILLION = 1_000_000;

    function registerNFTAddress(
        EnumerableSet.AddressSet storage _registeredNFTAddresses,
        address _NFTAddress
    ) internal {
        _registeredNFTAddresses.add(_NFTAddress);
    }

    function unregisterNFTAddress(
        EnumerableSet.AddressSet storage _registeredNFTAddresses,
        address _NFTAddress
    ) internal {
        _registeredNFTAddresses.remove(_NFTAddress);
    }

    function allowHoldersOfProjects(
        mapping(address => mapping(uint256 => mapping(address => mapping(uint256 => bool))))
            storage allowedProjectHoldersMapping,
        uint256 _projectId,
        address _coreContract,
        EnumerableSet.AddressSet storage _registeredNFTAddresses,
        address[] memory _ownedNFTAddresses,
        uint256[] memory _ownedNFTProjectIds
    ) internal {
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
            allowedProjectHoldersMapping[_coreContract][_projectId][
                _ownedNFTAddresses[i]
            ][_ownedNFTProjectIds[i]] = true;
        }
    }

    function removeHoldersOfProjects(
        mapping(address => mapping(uint256 => mapping(address => mapping(uint256 => bool))))
            storage allowedProjectHoldersMapping,
        uint256 _projectId,
        address _coreContract,
        EnumerableSet.AddressSet storage _registeredNFTAddresses,
        address[] memory _ownedNFTAddresses,
        uint256[] memory _ownedNFTProjectIds
    ) internal {
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
            allowedProjectHoldersMapping[_coreContract][_projectId][
                _ownedNFTAddresses[i]
            ][_ownedNFTProjectIds[i]] = false;
        }
    }

    function allowRemoveHoldersOfProjects(
        mapping(address => mapping(uint256 => mapping(address => mapping(uint256 => bool))))
            storage allowedProjectHoldersMapping,
        uint256 _projectId,
        address _coreContract,
        EnumerableSet.AddressSet storage _registeredNFTAddresses,
        address[] memory _ownedNFTAddressesAdd,
        uint256[] memory _ownedNFTProjectIdsAdd,
        address[] memory _ownedNFTAddressesRemove,
        uint256[] memory _ownedNFTProjectIdsRemove
    ) internal {
        allowHoldersOfProjects(
            allowedProjectHoldersMapping,
            _projectId,
            _coreContract,
            _registeredNFTAddresses,
            _ownedNFTAddressesAdd,
            _ownedNFTProjectIdsAdd
        );
        removeHoldersOfProjects(
            allowedProjectHoldersMapping,
            _projectId,
            _coreContract,
            _registeredNFTAddresses,
            _ownedNFTAddressesRemove,
            _ownedNFTProjectIdsRemove
        );
    }

    function isAllowlistedNFT(
        mapping(address => mapping(uint256 => mapping(address => mapping(uint256 => bool))))
            storage allowedProjectHoldersMapping,
        uint256 _projectId,
        address _coreContract,
        address _ownedNFTAddress,
        uint256 _ownedNFTTokenId
    ) internal view returns (bool) {
        uint256 ownedNFTProjectId = _ownedNFTTokenId / ONE_MILLION;
        return
            allowedProjectHoldersMapping[_coreContract][_projectId][
                _ownedNFTAddress
            ][ownedNFTProjectId];
    }
}
