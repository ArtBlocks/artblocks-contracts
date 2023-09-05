// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
pragma solidity ^0.8.19;

interface IDependencyRegistryV0 {
    event SupportedCoreContractAdded(address indexed _coreContractAddress);

    event SupportedCoreContractRemoved(address indexed _coreContractAddress);

    event ProjectDependencyTypeOverrideAdded(
        address indexed _coreContractAddress,
        uint256 indexed _projectId,
        bytes32 _dependencyType
    );

    event ProjectDependencyTypeOverrideRemoved(
        address indexed _coreContractAddress,
        uint256 indexed _projectId
    );

    event LicenseTypeAdded(bytes32 indexed _licenseType);

    event DependencyAdded(
        bytes32 indexed _dependencyType,
        bytes32 indexed _licenseType,
        string _preferredCDN,
        string _preferredRepository,
        string _referenceWebsite
    );

    event DependencyRemoved(bytes32 indexed _dependencyType);

    event DependencyReferenceWebsiteUpdated(
        bytes32 indexed _dependencyType,
        string _referenceWebsite
    );

    event DependencyPreferredCDNUpdated(
        bytes32 indexed _dependencyType,
        string _preferredCDN
    );

    event DependencyPreferredRepositoryUpdated(
        bytes32 indexed _dependencyType,
        string _preferredRepository
    );

    event DependencyAdditionalCDNUpdated(
        bytes32 indexed _dependencyType,
        string _additionalCDN,
        uint256 _additionalCDNIndex
    );

    event DependencyAdditionalCDNRemoved(
        bytes32 indexed _dependencyType,
        uint256 indexed _additionalCDNIndex
    );

    event DependencyAdditionalRepositoryUpdated(
        bytes32 indexed _dependencyType,
        string _additionalRepository,
        uint256 _additionalRepositoryIndex
    );

    event DependencyAdditionalRepositoryRemoved(
        bytes32 indexed _dependencyType,
        uint256 indexed _additionalRepositoryIndex
    );

    event DependencyScriptUpdated(bytes32 indexed _dependencyType);

    /**
     * @notice Returns the count of scripts for dependency `_dependencyType`.
     * @param _dependencyType Dependency type to be queried.
     */
    function getDependencyScriptCount(
        bytes32 _dependencyType
    ) external view returns (uint256);

    /**
     * @notice Returns address with bytecode containing script for
     * dependency type `_dependencyTypes` at script index `_index`.
     */
    function getDependencyScriptBytecodeAddress(
        bytes32 _dependencyType,
        uint256 _index
    ) external view returns (address);

    /**
     * @notice Returns script for dependency type `_dependencyType` at script index `_index`.
     * @param _dependencyType Dependency type to be queried.
     * @param _index Index of script to be queried.
     */
    function getDependencyScript(
        bytes32 _dependencyType,
        uint256 _index
    ) external view returns (string memory);
}
