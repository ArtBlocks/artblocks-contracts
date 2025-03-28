// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.19;

import "../../interfaces/v0.8.x/IAdminACLV0.sol";
import "../../interfaces/v0.8.x/ICoreRegistryV1.sol";
import "../../interfaces/v0.8.x/IUniversalBytecodeStorageReader.sol";
import "@openzeppelin-4.7/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title DependencyRegistryStorageLib
 * @notice This library defines the storage structure used by the Art Blocks platform's DependencyRegistry contract.
 * It uses a diamond storage pattern for efficient storage management.
 * @author Art Blocks Inc.
 */

library DependencyRegistryStorageLib {
    bytes32 constant DIAMOND_STORAGE_POSITION =
        keccak256("dependencyregistrystoragelib.storage");

    /**
     * @notice Struct used to store a license's bytecode addresses and chunk count.
     * Each bytecode address is a contract that stores a chunk of the license's text.
     */
    struct License {
        // mapping from license index to address storing script in bytecode
        mapping(uint256 licenseIndex => address bytecodeAddress) licenseBytecodeAddresses;
        uint24 licenseChunkCount;
    }

    /**
     * @notice Struct used to store a dependency's properties.
     */
    struct Dependency {
        // type of license, MIT, GPL, etc.
        bytes32 licenseType;
        // preferred CDN URL for dependency
        string preferredCDN;
        // mapping from additional CDN index to CDN URL
        mapping(uint256 additionalCDNIndex => string additionalCDNUrl) additionalCDNs;
        // preferred code repository URL for dependency
        string preferredRepository;
        // mapping from additional repository index to repository URL
        mapping(uint256 additionalRepositoryIndex => string additionalRepositoryUrl) additionalRepositories;
        // Website URL for dependency (e.g. https://p5js.org/ for p5)
        string website;
        // mapping from script index to address storing script in bytecode
        mapping(uint256 scriptIndex => address bytecodeAddress) scriptBytecodeAddresses;
        // count of additional CDN urls where the dependency can be found
        uint24 additionalCDNCount;
        // count of additional code repository urls for the dependency
        uint24 additionalRepositoryCount;
        // count of scripts that make up the dependency, if the dependency is available on-chain
        uint24 scriptCount;
    }

    /**
     * @notice Struct used to define the storage layout for the DependencyRegistry contract.
     * It includes mappings for dependencies, licenses, supported core contracts, and project dependency overrides.
     */
    struct Storage {
        // address of the AdminACL contract, which controls access to the DependencyRegistry
        IAdminACLV0 adminACLContract;
        // dependency ID's are bytes32 of the format "name@version"
        EnumerableSet.Bytes32Set dependencyNameVersionIds;
        // source code license types, MIT, GPL, etc.
        EnumerableSet.Bytes32Set licenseTypes;
        // mapping from dependencyNameAndVersion to Dependency, which stores the properties of each dependency
        mapping(bytes32 dependencyNameAndVersion => Dependency dependency) dependencyRecords;
        // mapping from licenseTypes to License, which stores the properties of each license
        mapping(bytes32 licenseType => License license) allLicenses;
        // @dev This set is vestigial and no longer used. It has been replaced by CoreRegistry functionality.
        // Cannot be removed due to storage layout requirements in upgradeable contracts.
        // See https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#modifying-your-contracts
        EnumerableSet.AddressSet DEPRECATED_supportedCoreContracts;
        // Mapping that allows for the overriding of project dependencies.
        // The first key is the address of the core contract, the second key is the project ID,
        // and the value is the bytes32 representation of the dependency name and version (i.e. name@version).
        // This allows for specific projects to use different versions of dependencies than what's stored on the core contract.
        mapping(address coreContractAddress => mapping(uint256 projectId => bytes32 dependencyNameAndVersion) projectToDependencyNameAndVersionMapping) projectDependencyOverrides;
        // address of the CoreRegistry contract
        ICoreRegistryV1 coreRegistryContract;
        // enumerable set of core contract addresses supported by the DependencyRegistry, in addition to the set of core contracts
        // that are supported by the CoreRegistry contract
        // @dev possible there is overlap between the two sets, but not intentionally configured by admin.
        EnumerableSet.AddressSet supportedCoreContractsOverride;
        // address of the UniversalBytecodeStorageReader contract
        IUniversalBytecodeStorageReader universalReader;
    }

    /**
     * @notice Returns the storage struct for reading and writing.
     * This library uses a diamond storage pattern when managing storage.
     * @return storageStruct The Storage struct.
     */
    function s() internal pure returns (Storage storage storageStruct) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly ("memory-safe") {
            storageStruct.slot := position
        }
    }
}
