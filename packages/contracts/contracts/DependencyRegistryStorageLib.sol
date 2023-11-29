// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/v0.8.x/IAdminACLV0.sol";
import "@openzeppelin-4.7/contracts/utils/structs/EnumerableSet.sol";

library DependencyRegistryStorageLib {
    bytes32 constant DIAMOND_STORAGE_POSITION =
        keccak256("dependencyregistrystoragelib.storage");

    struct License {
        // mapping from license index to address storing script in bytecode
        mapping(uint256 => address) licenseBytecodeAddresses;
        uint24 licenseChunkCount;
    }

    struct Dependency {
        bytes32 licenseType;
        string preferredCDN;
        // mapping from additional CDN index to CDN URL
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

    struct Storage {
        IAdminACLV0 adminACLContract;
        // dependency ID's are bytes32 of the format "name@version"
        EnumerableSet.Bytes32Set dependencyNameVersionIds;
        // source code license types, MIT, GPL, etc.
        EnumerableSet.Bytes32Set licenseTypes;
        // mapping from dependencyNameAndVersion to Dependency, which stores the properties of each dependency
        mapping(bytes32 => Dependency) dependencyRecords;
        // mapping from licenseTypes to License, which stores the properties of each license
        mapping(bytes32 => License) allLicenses;
        // Set of addresses for the core contracts that are supported by the DependencyRegistry.
        // Each address represents a unique core contract in the Art Blocks ecosystem.
        EnumerableSet.AddressSet supportedCoreContracts;
        // Mapping that allows for the overriding of project dependencies.
        // The first key is the address of the core contract, the second key is the project ID,
        // and the value is the bytes32 representation of the dependency name and version (i.e. name@version).
        // This allows for specific projects to use different versions of dependencies than what's stored on the core contract.
        mapping(address => mapping(uint256 => bytes32)) projectDependencyOverrides;
    }

    function s() internal pure returns (Storage storage storageStruct) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly {
            storageStruct.slot := position
        }
    }
}
