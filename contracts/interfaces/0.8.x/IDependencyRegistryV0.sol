// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
pragma solidity ^0.8.17;

interface IDependencyRegistryV0 {
    event SupportedCoreContractAdded(address indexed _coreContractAddress);

    event SupportedCoreContractRemoved(address indexed _coreContractAddress);

    event ProjectDependencyTypeOverrideAdded(
        address indexed _coreContractAddress,
        uint256 indexed _projectId,
        bytes32 _dependencyTypeId
    );

    event ProjectDependencyTypeOverrideRemoved(
        address indexed _coreContractAddress,
        uint256 indexed _projectId
    );

    event DependencyAdded(
        bytes32 indexed _dependencyTypeId,
        string _preferredCDN,
        string _preferredRepository,
        string _referenceWebsite
    );

    event DependencyRemoved(bytes32 indexed _dependencyTypeId);

    event DependencyReferenceWebsiteUpdated(
        bytes32 indexed _dependencyTypeId,
        string _referenceWebsite
    );

    event DependencyPreferredCDNUpdated(
        bytes32 indexed _dependencyTypeId,
        string _preferredCDN
    );

    event DependencyPreferredRepositoryUpdated(
        bytes32 indexed _dependencyTypeId,
        string _preferredRepository
    );

    event DependencyAdditionalCDNUpdated(
        bytes32 indexed _dependencyTypeId,
        string _additionalCDN,
        uint256 _additionalCDNIndex
    );

    event DependencyAdditionalCDNRemoved(
        bytes32 indexed _dependencyTypeId,
        uint256 indexed _additionalCDNIndex
    );

    event DependencyAdditionalRepositoryUpdated(
        bytes32 indexed _dependencyTypeId,
        string _additionalRepository,
        uint256 _additionalRepositoryIndex
    );

    event DependencyAdditionalRepositoryRemoved(
        bytes32 indexed _dependencyTypeId,
        uint256 indexed _additionalRepositoryIndex
    );

    event DependencyScriptUpdated(bytes32 indexed _dependencyTypeId);

    /**
     * @notice Returns the count of scripts for dependency `_dependencyType`.
     * @param _dependencyType Dependency type to be queried.
     */
    function getDependencyScriptCount(bytes32 _dependencyType)
        external
        view
        returns (uint256);

    /**
     * @notice Returns address with bytecode containing script for
     * dependency type `_dependencyTypeIds` at script index `_index`.
     */
    function getDependencyScriptBytecodeAddressAtIndex(
        bytes32 _dependencyTypeId,
        uint256 _index
    ) external view returns (address);

    /**
     * @notice Returns script for dependency type `_dependencyTypeId` at script index `_index`.
     * @param _dependencyTypeId Dependency type to be queried.
     * @param _index Index of script to be queried.
     */
    function getDependencyScriptAtIndex(
        bytes32 _dependencyTypeId,
        uint256 _index
    ) external view returns (string memory);
}
