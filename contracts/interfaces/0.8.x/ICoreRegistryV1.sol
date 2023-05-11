// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
pragma solidity ^0.8.0;

import "./IEngineRegistryV0.sol";

interface ICoreRegistryV1 is IEngineRegistryV0 {
    function registerContracts(
        address[] calldata _contractAddresses,
        bytes32[] calldata _coreVersions,
        bytes32[] calldata _coreTypes
    ) external;

    function unregisterContracts(
        address[] calldata _contractAddresses
    ) external;

    function getNumRegisteredContracts() external view returns (uint256);

    function getRegisteredContractAt(
        uint256 _index
    ) external view returns (address);

    function isRegisteredContract(
        address _contractAddress
    ) external view returns (bool isRegistered);
}
