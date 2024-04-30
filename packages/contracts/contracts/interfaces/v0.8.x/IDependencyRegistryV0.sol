// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
pragma solidity ^0.8.19;

interface IDependencyRegistryV0 {
    event SupportedCoreContractAdded(address indexed coreContractAddress);

    event SupportedCoreContractRemoved(address indexed coreContractAddress);

    event ProjectDependencyOverrideAdded(
        address indexed coreContractAddress,
        uint256 indexed projectId,
        bytes32 dependencyNameAndVersion
    );

    event ProjectDependencyOverrideRemoved(
        address indexed coreContractAddress,
        uint256 indexed projectId
    );

    event LicenseTypeAdded(bytes32 indexed licenseType);

    event LicenseTextUpdated(bytes32 indexed licenseType);

    event DependencyAdded(
        bytes32 indexed dependencyNameAndVersion,
        bytes32 indexed licenseType,
        string preferredCDN,
        string preferredRepository,
        string website
    );

    event DependencyRemoved(bytes32 indexed dependencyNameAndVersion);

    event DependencyWebsiteUpdated(
        bytes32 indexed dependencyNameAndVersion,
        string website
    );

    event DependencyPreferredCDNUpdated(
        bytes32 indexed dependencyNameAndVersion,
        string preferredCDN
    );

    event DependencyPreferredRepositoryUpdated(
        bytes32 indexed dependencyNameAndVersion,
        string preferredRepository
    );

    event DependencyAdditionalCDNUpdated(
        bytes32 indexed dependencyNameAndVersion,
        string additionalCDN,
        uint256 additionalCDNIndex
    );

    event DependencyAdditionalCDNRemoved(
        bytes32 indexed dependencyNameAndVersion,
        uint256 indexed additionalCDNIndex
    );

    event DependencyAdditionalRepositoryUpdated(
        bytes32 indexed dependencyNameAndVersion,
        string additionalRepository,
        uint256 additionalRepositoryIndex
    );

    event DependencyAdditionalRepositoryRemoved(
        bytes32 indexed dependencyNameAndVersion,
        uint256 indexed additionalRepositoryIndex
    );

    event DependencyScriptUpdated(bytes32 indexed dependencyNameAndVersion);

    /**
     * @notice Returns the count of scripts for dependency `dependencyNameAndVersion`.
     * @param dependencyNameAndVersion Dependency type to be queried.
     */
    function getDependencyScriptCount(
        bytes32 dependencyNameAndVersion
    ) external view returns (uint256);

    /**
     * @notice Returns address with bytecode containing script for
     * dependency type `dependencyNameAndVersions` at script index `index`.
     */
    function getDependencyScriptBytecodeAddress(
        bytes32 dependencyNameAndVersion,
        uint256 index
    ) external view returns (address);

    /**
     * @notice Returns script for dependency type `dependencyNameAndVersion` at script index `index`.
     * @param dependencyNameAndVersion Dependency type to be queried.
     * @param index Index of script to be queried.
     */
    function getDependencyScript(
        bytes32 dependencyNameAndVersion,
        uint256 index
    ) external view returns (string memory);
}
