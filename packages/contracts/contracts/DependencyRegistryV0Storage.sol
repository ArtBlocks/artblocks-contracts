// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Created By: Art Blocks Inc.

import "./interfaces/v0.8.x/IAdminACLV0.sol";
import "@openzeppelin-4.7/contracts/utils/structs/EnumerableSet.sol";

/**
 @notice - Storage abstraction for DependencyRegistryV0 contract
 @dev - Upgradeability Rules:
        DO NOT change existing variable names or types
        DO NOT change order of variables
        DO NOT remove any variables
        ONLY add new variables at the end
        Constant values CAN be modified on upgrade
*/
contract DependencyRegistryV0Storage {
    /// admin ACL contract
    IAdminACLV0 public adminACLContract;

    struct Dependency {
        bytes32 licenseType;
        string preferredCDN;
        // mapping from additional CDN index to CDN URLr
        mapping(uint256 => string) additionalCDNs;
        string preferredRepository;
        // mapping from additional repository index to repository URL
        mapping(uint256 => string) additionalRepositories;
        string website;
        // mapping from script index to address storing script in bytecode
        mapping(uint256 => address) scriptBytecodeAddresses;
        uint24 additionalCDNCount;
        uint24 additionalRepositoryCount;
        uint24 scriptCount;
    }

    // dependency ID's are bytes32 of the format "name@version"
    EnumerableSet.Bytes32Set internal _dependencyNameVersionIds;
    // mapping from dependencyNameAndVersion to Dependency, which stores the properties of each dependency
    mapping(bytes32 dependencyNameAndVersion => Dependency) dependencyRecords;
    // source code license types, MIT, GPL, etc.
    EnumerableSet.Bytes32Set internal _licenseTypes;

    // Set of addresses for the core contracts that are supported by the DependencyRegistry.
    // Each address represents a unique core contract in the Art Blocks ecosystem.
    EnumerableSet.AddressSet internal _supportedCoreContracts;

    // Mapping that allows for the overriding of project dependencies.
    // The first key is the address of the core contract, the second key is the project ID,
    // and the value is the bytes32 representation of the dependency name and version (i.e. name@version).
    // This allows for specific projects to use different versions of dependencies than what's stored on the core contract.
    mapping(address coreContract => mapping(uint256 projectId => bytes32 dependencyNameAndVersion)) projectDependencyOverrides;
}
