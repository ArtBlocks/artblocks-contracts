// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.19;

// Created By: Art Blocks Inc.

import "./interfaces/v0.8.x/IAdminACLV0.sol";
import "./interfaces/v0.8.x/IDependencyRegistryCompatibleV0.sol";
import "./interfaces/v0.8.x/IDependencyRegistryV0.sol";
import "./interfaces/v0.8.x/ICoreRegistryV1.sol";

import "@openzeppelin-4.7/contracts/utils/Strings.sol";
import "@openzeppelin-4.7/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin-4.8/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin-4.8/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin-4.5/contracts/utils/math/SafeCast.sol";

import "./libs/v0.8.x/DependencyRegistryStorageLib.sol";
import "./libs/v0.8.x/BytecodeStorageV1.sol";
import "./libs/v0.8.x/Bytes32Strings.sol";

/**
 * @title Art Blocks Dependency Registry, V0.
 * @author Art Blocks Inc.
 * @notice Privileged Roles and Ownership:
 * Permissions managed by ACL contract. If/when we ever call
 * renounceOwnership() this will become a frozen, immutable registry
 * as no upgrades will be possible.
 * This contract is intended to be an auxiliary reference registry
 * to our non-upgradeable and immutable ERC-721 conforming core contracts,
 * and has been made upgradeable as we expect its required functionality in
 * relation to the Art Blocks ecosystem to evolve over time.
 */
contract DependencyRegistryV0 is
    Initializable,
    OwnableUpgradeable,
    IDependencyRegistryV0
{
    using BytecodeStorageWriter for string;
    using Bytes32Strings for bytes32;
    using Bytes32Strings for string;
    using Strings for uint256;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeCast for uint24;

    uint8 constant AT_CHARACTER_CODE = uint8(bytes1("@")); // 0x40

    function _onlyNonZeroAddress(address address_) internal pure {
        require(address_ != address(0), "Must input non-zero address");
    }

    function _onlyNonEmptyString(string memory string_) internal pure {
        require(bytes(string_).length != 0, "Must input non-empty string");
    }

    function _onlyAdminACL(bytes4 selector) internal {
        require(
            adminACLAllowed({
                sender: msg.sender,
                contract_: address(this),
                selector: selector
            }),
            "Only Admin ACL allowed"
        );
    }

    function _onlySupportedCoreContract(
        address coreContractAddress
    ) internal view {
        require(
            ICoreRegistryV1(
                DependencyRegistryStorageLib.s().coreRegistryContract
            ).isRegisteredContract(coreContractAddress),
            "Core contract not supported"
        );
    }

    function _onlyExistingDependency(
        bytes32 dependencyNameAndVersion
    ) internal view {
        require(
            DependencyRegistryStorageLib.s().dependencyNameVersionIds.contains(
                dependencyNameAndVersion
            ),
            "Dependency does not exist"
        );
    }

    function _onlyInRangeIndex(uint256 index, uint256 length) internal pure {
        require(index < length, "Index out of range");
    }

    function _onlyExistingLicenseType(bytes32 licenseType) internal view {
        require(
            DependencyRegistryStorageLib.s().licenseTypes.contains(licenseType),
            "License type does not exist"
        );
    }

    function _onlyBytes32String(string memory input) internal pure {
        require(bytes(input).length <= 32, "String too long");
    }

    /**
     * @notice Initializes contract.
     * @param adminACLContract_ Address of admin access control contract, to be
     * set as contract owner.
     */
    function initialize(address adminACLContract_) public initializer {
        __Ownable_init();

        // set AdminACL management contract as owner
        _transferOwnership(adminACLContract_);
    }

    /**
     * @notice Updates the core registry address.
     * @param _coreRegistryAddress Address of core registry contract.
     */
    function updateCoreRegistryAddress(address _coreRegistryAddress) external {
        _onlyAdminACL(this.updateCoreRegistryAddress.selector);
        _onlyNonZeroAddress(_coreRegistryAddress);
        DependencyRegistryStorageLib.s().coreRegistryContract = ICoreRegistryV1(
            _coreRegistryAddress
        );
    }

    /**
     * @notice Adds a new license type that can be used by dependencies.
     * @param licenseType License type to be added.
     */
    function addLicenseType(bytes32 licenseType) external {
        _onlyAdminACL(this.addLicenseType.selector);
        require(
            licenseType != bytes32(""),
            "License type cannot be empty string"
        );

        // @dev the add function returns false if set already contains value
        require(
            DependencyRegistryStorageLib.s().licenseTypes.add(licenseType),
            "License type already exists"
        );
        emit LicenseTypeAdded(licenseType);
    }

    /**
     * @notice Adds a new dependency.
     * @param dependencyNameAndVersion A unique identifier for the dependency, composed of its name and version in the format "name@version".
     * @param licenseType License type for dependency, must be a registered license type.
     * @param preferredCDN Preferred CDN for dependency.
     * @param preferredRepository Preferred repository for dependency.
     */
    function addDependency(
        bytes32 dependencyNameAndVersion,
        bytes32 licenseType,
        string memory preferredCDN,
        string memory preferredRepository,
        string memory dependencyWebsite
    ) external {
        _onlyAdminACL(this.addDependency.selector);
        _onlyExistingLicenseType(licenseType);
        require(
            dependencyNameAndVersion.containsExactCharacterQty(
                AT_CHARACTER_CODE,
                uint8(1)
            ),
            "must contain exactly one @"
        );

        DependencyRegistryStorageLib.Storage
            storage ds = DependencyRegistryStorageLib.s();

        require(
            // @dev the add function returns false if set already contains value
            ds.dependencyNameVersionIds.add(dependencyNameAndVersion),
            "Dependency already exists"
        );

        DependencyRegistryStorageLib.Dependency storage dependency = ds
            .dependencyRecords[dependencyNameAndVersion];
        dependency.licenseType = licenseType;
        dependency.preferredCDN = preferredCDN;
        dependency.preferredRepository = preferredRepository;
        dependency.website = dependencyWebsite;

        emit DependencyAdded(
            dependencyNameAndVersion,
            licenseType,
            preferredCDN,
            preferredRepository,
            dependencyWebsite
        );
    }

    /**
     * @notice Removes a dependency.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     */
    function removeDependency(bytes32 dependencyNameAndVersion) external {
        _onlyAdminACL(this.removeDependency.selector);
        _onlyExistingDependency(dependencyNameAndVersion);

        DependencyRegistryStorageLib.Storage
            storage ds = DependencyRegistryStorageLib.s();

        DependencyRegistryStorageLib.Dependency storage dependency = ds
            .dependencyRecords[dependencyNameAndVersion];

        require(
            dependency.additionalCDNCount == 0 &&
                dependency.additionalRepositoryCount == 0 &&
                dependency.scriptCount == 0,
            "Cannot remove dependency with additional CDNs, repositories, or scripts"
        );

        ds.dependencyNameVersionIds.remove(dependencyNameAndVersion);
        // @dev all of the arrays in the dependency struct are required to be empty
        // before this function can be called, so we don't need to delete them here
        delete ds.dependencyRecords[dependencyNameAndVersion];

        emit DependencyRemoved(dependencyNameAndVersion);
    }

    /**
     * @notice Adds a script to dependency `dependencyNameAndVersion`, by way of
     *         providing a string to write to bytecode storage.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     * @param script Script to be added. Required to be a non-empty string,
     *                but no further validation is performed.
     */
    function addDependencyScript(
        bytes32 dependencyNameAndVersion,
        string memory script
    ) external {
        _onlyAdminACL(this.addDependencyScript.selector);
        _onlyNonEmptyString(script);
        _onlyExistingDependency(dependencyNameAndVersion);

        DependencyRegistryStorageLib.Dependency
            storage dependency = DependencyRegistryStorageLib
                .s()
                .dependencyRecords[dependencyNameAndVersion];
        // store script in contract bytecode
        dependency.scriptBytecodeAddresses[dependency.scriptCount] = script
            .writeToBytecode();
        dependency.scriptCount = dependency.scriptCount + 1;

        emit DependencyScriptUpdated(dependencyNameAndVersion);
    }

    /**
     * @notice Updates script for dependencyType `dependencyNameAndVersion` at script `index`,
     *         by way of providing a string to write to bytecode storage.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     * @param index The index of a given script, relative to the overall `scriptCount`.
     * @param script The updated script value. Required to be a non-empty
     *                string, but no further validation is performed.
     */
    function updateDependencyScript(
        bytes32 dependencyNameAndVersion,
        uint256 index,
        string memory script
    ) external {
        _onlyAdminACL(this.updateDependencyScript.selector);
        _onlyNonEmptyString(script);
        _onlyExistingDependency(dependencyNameAndVersion);

        DependencyRegistryStorageLib.Dependency
            storage dependency = DependencyRegistryStorageLib
                .s()
                .dependencyRecords[dependencyNameAndVersion];
        _onlyInRangeIndex({index: index, length: dependency.scriptCount});
        // store script in contract bytecode, replacing reference address from
        // the contract that no longer exists with the newly created one
        dependency.scriptBytecodeAddresses[index] = script.writeToBytecode();

        emit DependencyScriptUpdated(dependencyNameAndVersion);
    }

    /**
     * @notice Adds a script to dependency `dependencyNameAndVersion`, by way of
     *         providing an already written chunk of bytecode storage.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     * @param scriptPointer Address of script to be added. Required to be a non-zero address,
     *                       but no further validation is performed.
     */
    function addDependencyScriptPointer(
        bytes32 dependencyNameAndVersion,
        address scriptPointer
    ) external {
        _onlyAdminACL(this.addDependencyScriptPointer.selector);
        _onlyNonZeroAddress(scriptPointer);
        _onlyExistingDependency(dependencyNameAndVersion);

        DependencyRegistryStorageLib.Dependency
            storage dependency = DependencyRegistryStorageLib
                .s()
                .dependencyRecords[dependencyNameAndVersion];
        // store script in contract bytecode
        dependency.scriptBytecodeAddresses[
            dependency.scriptCount
        ] = scriptPointer;
        dependency.scriptCount = dependency.scriptCount + 1;

        emit DependencyScriptUpdated(dependencyNameAndVersion);
    }

    /**
     * @notice Updates script for dependency id `dependencyNameAndVersion` at script `index`,
     *         by way of providing an already written chunk of bytecode storage.
     * @param dependencyNameAndVersion Name of dependency (i.e. "name@version") used to identify dependency.
     * @param index The index of a given script, relative to the overall `scriptCount`.
     * @param scriptPointer The updated script pointer (address of bytecode storage).
     *                       Required to be a non-zero address, but no further validation is performed.
     */
    function updateDependencyScriptPointer(
        bytes32 dependencyNameAndVersion,
        uint256 index,
        address scriptPointer
    ) external {
        _onlyAdminACL(this.updateDependencyScriptPointer.selector);
        _onlyNonZeroAddress(scriptPointer);
        _onlyExistingDependency(dependencyNameAndVersion);

        DependencyRegistryStorageLib.Dependency
            storage dependency = DependencyRegistryStorageLib
                .s()
                .dependencyRecords[dependencyNameAndVersion];
        _onlyInRangeIndex({index: index, length: dependency.scriptCount});
        dependency.scriptBytecodeAddresses[index] = scriptPointer;

        emit DependencyScriptUpdated(dependencyNameAndVersion);
    }

    /**
     * @notice Removes last script from dependency `dependencyNameAndVersion`.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     */
    function removeDependencyLastScript(
        bytes32 dependencyNameAndVersion
    ) external {
        _onlyAdminACL(this.removeDependencyLastScript.selector);
        _onlyExistingDependency(dependencyNameAndVersion);

        DependencyRegistryStorageLib.Dependency
            storage dependency = DependencyRegistryStorageLib
                .s()
                .dependencyRecords[dependencyNameAndVersion];
        require(dependency.scriptCount > 0, "there are no scripts to remove");
        // delete reference to old storage contract address
        delete dependency.scriptBytecodeAddresses[dependency.scriptCount - 1];
        unchecked {
            dependency.scriptCount = dependency.scriptCount - 1;
        }

        emit DependencyScriptUpdated(dependencyNameAndVersion);
    }

    /**
     * @notice Updates preferred CDN for dependency `dependencyNameAndVersion`.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     * @param preferredCDN URL for preferred CDN.
     */
    function updateDependencyPreferredCDN(
        bytes32 dependencyNameAndVersion,
        string memory preferredCDN
    ) external {
        _onlyAdminACL(this.updateDependencyPreferredCDN.selector);
        _onlyExistingDependency(dependencyNameAndVersion);

        DependencyRegistryStorageLib
            .s()
            .dependencyRecords[dependencyNameAndVersion]
            .preferredCDN = preferredCDN;

        emit DependencyPreferredCDNUpdated(
            dependencyNameAndVersion,
            preferredCDN
        );
    }

    /**
     * @notice Updates preferred repository for dependency `dependencyNameAndVersion`.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     * @param preferredRepository URL for preferred repository.
     */
    function updateDependencyPreferredRepository(
        bytes32 dependencyNameAndVersion,
        string memory preferredRepository
    ) external {
        _onlyAdminACL(this.updateDependencyPreferredRepository.selector);
        _onlyExistingDependency(dependencyNameAndVersion);

        DependencyRegistryStorageLib
            .s()
            .dependencyRecords[dependencyNameAndVersion]
            .preferredRepository = preferredRepository;

        emit DependencyPreferredRepositoryUpdated(
            dependencyNameAndVersion,
            preferredRepository
        );
    }

    /**
     * @notice Updates project website for dependency `dependencyNameAndVersion`.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     * @param dependencyWebsite URL for project website.
     */
    function updateDependencyWebsite(
        bytes32 dependencyNameAndVersion,
        string memory dependencyWebsite
    ) external {
        _onlyAdminACL(this.updateDependencyWebsite.selector);
        _onlyExistingDependency(dependencyNameAndVersion);

        DependencyRegistryStorageLib
            .s()
            .dependencyRecords[dependencyNameAndVersion]
            .website = dependencyWebsite;

        emit DependencyWebsiteUpdated(
            dependencyNameAndVersion,
            dependencyWebsite
        );
    }

    /**
     * @notice Adds a new CDN url to `dependencyNameAndVersion`.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     * @param additionalCDN CDN URL to be added. Required to be a non-empty string,
     *                       but no further validation is performed.
     */
    function addDependencyAdditionalCDN(
        bytes32 dependencyNameAndVersion,
        string memory additionalCDN
    ) external {
        _onlyAdminACL(this.addDependencyAdditionalCDN.selector);
        _onlyNonEmptyString(additionalCDN);
        _onlyExistingDependency(dependencyNameAndVersion);

        DependencyRegistryStorageLib.Dependency
            storage dependency = DependencyRegistryStorageLib
                .s()
                .dependencyRecords[dependencyNameAndVersion];

        uint256 additionalCDNCount = uint256(dependency.additionalCDNCount);
        dependency.additionalCDNs[additionalCDNCount] = additionalCDN;
        dependency.additionalCDNCount = uint24(additionalCDNCount + 1);

        emit DependencyAdditionalCDNUpdated(
            dependencyNameAndVersion,
            additionalCDN,
            additionalCDNCount
        );
    }

    /**
     * @notice Removes additional CDN for dependency `_dependencyId` at index `index`.
     * Removal is done by swapping the element to be removed with the last element in the array, then deleting this last element.
     * Assets with indices higher than `index` can have their indices adjusted as a result of this operation.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     * @param index The index of an additional CDN, relative to the overall `additionalCDNCount`.
     */
    function removeDependencyAdditionalCDN(
        bytes32 dependencyNameAndVersion,
        uint256 index
    ) external {
        _onlyAdminACL(this.removeDependencyAdditionalCDN.selector);
        _onlyExistingDependency(dependencyNameAndVersion);

        DependencyRegistryStorageLib.Dependency
            storage dependency = DependencyRegistryStorageLib
                .s()
                .dependencyRecords[dependencyNameAndVersion];

        uint256 additionalCDNCount = dependency.additionalCDNCount;
        _onlyInRangeIndex({index: index, length: additionalCDNCount});

        uint256 lastElementIndex = additionalCDNCount - 1;

        dependency.additionalCDNs[index] = dependency.additionalCDNs[
            lastElementIndex
        ];
        delete dependency.additionalCDNs[lastElementIndex];

        dependency.additionalCDNCount = uint24(lastElementIndex);

        emit DependencyAdditionalCDNRemoved(dependencyNameAndVersion, index);
    }

    /**
     * @notice Updates additional CDN for dependency `dependencyNameAndVersion` at `index`.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     * @param index The index of an additional CDN, relative to the overall `additionalCDNCount`.
     * @param additionalCDN New CDN URL.
     */
    function updateDependencyAdditionalCDN(
        bytes32 dependencyNameAndVersion,
        uint256 index,
        string memory additionalCDN
    ) external {
        _onlyAdminACL(this.updateDependencyAdditionalCDN.selector);
        _onlyNonEmptyString(additionalCDN);
        _onlyExistingDependency(dependencyNameAndVersion);

        DependencyRegistryStorageLib.Dependency
            storage dependency = DependencyRegistryStorageLib
                .s()
                .dependencyRecords[dependencyNameAndVersion];
        _onlyInRangeIndex({
            index: index,
            length: dependency.additionalCDNCount
        });

        dependency.additionalCDNs[index] = additionalCDN;

        emit DependencyAdditionalCDNUpdated(
            dependencyNameAndVersion,
            additionalCDN,
            index
        );
    }

    /**
     * @notice Adds a new repository URL to dependency `dependencyNameAndVersion`.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     * @param additionalRepository Repository URL to be added. Required to be a non-empty string,
     * but no further validation is performed.
     */
    function addDependencyAdditionalRepository(
        bytes32 dependencyNameAndVersion,
        string memory additionalRepository
    ) external {
        _onlyAdminACL(this.addDependencyAdditionalRepository.selector);
        _onlyNonEmptyString(additionalRepository);
        _onlyExistingDependency(dependencyNameAndVersion);

        DependencyRegistryStorageLib.Dependency
            storage dependency = DependencyRegistryStorageLib
                .s()
                .dependencyRecords[dependencyNameAndVersion];
        uint256 additionalRepositoryCount = uint256(
            dependency.additionalRepositoryCount
        );
        dependency.additionalRepositories[
            additionalRepositoryCount
        ] = additionalRepository;
        dependency.additionalRepositoryCount = uint24(
            additionalRepositoryCount + 1
        );

        emit DependencyAdditionalRepositoryUpdated(
            dependencyNameAndVersion,
            additionalRepository,
            additionalRepositoryCount
        );
    }

    /**
     * @notice Removes additional repository for depenency `_dependencyId` at index `index`.
     * Removal is done by swapping the element to be removed with the last element in the array, then deleting this last element.
     * Assets with indices higher than `index` can have their indices adjusted as a result of this operation.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     * @param index The index of an additional repository, relative to the overall `additionalRepositoryCount`.
     */
    function removeDependencyAdditionalRepository(
        bytes32 dependencyNameAndVersion,
        uint256 index
    ) external {
        _onlyAdminACL(this.removeDependencyAdditionalRepository.selector);
        _onlyExistingDependency(dependencyNameAndVersion);

        DependencyRegistryStorageLib.Storage
            storage ds = DependencyRegistryStorageLib.s();

        DependencyRegistryStorageLib.Dependency storage dependency = ds
            .dependencyRecords[dependencyNameAndVersion];
        uint256 additionalRepositoryCount = dependency
            .additionalRepositoryCount;
        _onlyInRangeIndex({index: index, length: additionalRepositoryCount});

        uint256 lastElementIndex = additionalRepositoryCount - 1;

        dependency.additionalRepositories[index] = ds
            .dependencyRecords[dependencyNameAndVersion]
            .additionalRepositories[lastElementIndex];
        delete dependency.additionalRepositories[lastElementIndex];

        dependency.additionalRepositoryCount = uint24(lastElementIndex);

        emit DependencyAdditionalRepositoryRemoved(
            dependencyNameAndVersion,
            index
        );
    }

    /**
     * @notice Updates additional repository for dependency `dependencyNameAndVersion` at `index`.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     * @param index The index of an additional repository, relative to the overall `additionalRepositoryCount`.
     * @param additionalRepository New Repository URL.
     */
    function updateDependencyAdditionalRepository(
        bytes32 dependencyNameAndVersion,
        uint256 index,
        string memory additionalRepository
    ) external {
        _onlyAdminACL(this.updateDependencyAdditionalRepository.selector);
        _onlyNonEmptyString(additionalRepository);
        _onlyExistingDependency(dependencyNameAndVersion);

        DependencyRegistryStorageLib.Dependency
            storage dependency = DependencyRegistryStorageLib
                .s()
                .dependencyRecords[dependencyNameAndVersion];
        _onlyInRangeIndex({
            index: index,
            length: dependency.additionalRepositoryCount
        });

        dependency.additionalRepositories[index] = additionalRepository;

        emit DependencyAdditionalRepositoryUpdated(
            dependencyNameAndVersion,
            additionalRepository,
            index
        );
    }

    /**
     * @notice These functions were removed in an upgrade, registering and unregistering
     * contracts are handled by the core registry.
     */
    // /**
    //  * @notice Adds a new core contract to the list of supported core contracts.
    //  * @param contractAddress Address of the core contract to be added.
    //  */
    // function addSupportedCoreContract(address contractAddress) external {
    //     _onlyAdminACL(this.addSupportedCoreContract.selector);
    //     _onlyNonZeroAddress(contractAddress);

    //     require(
    //         // @dev the add function returns false if set already contains value
    //         DependencyRegistryStorageLib.s().supportedCoreContracts.add(
    //             contractAddress
    //         ),
    //         "Contract already supported"
    //     );
    //     emit SupportedCoreContractAdded(contractAddress);
    // }

    // /**
    //  * @notice Removes a core contract from the list of supported core contracts.
    //  * @param contractAddress Address of the core contract to be removed.
    //  */
    // function removeSupportedCoreContract(address contractAddress) external {
    //     _onlyAdminACL(this.removeSupportedCoreContract.selector);
    //     require(
    //         // @dev the remove function returns false if set does not contain value
    //         DependencyRegistryStorageLib.s().supportedCoreContracts.remove(
    //             contractAddress
    //         ),
    //         "Core contract already removed or not in set"
    //     );
    //     emit SupportedCoreContractRemoved(contractAddress);
    // }

    /**
     * @notice Overrides the script type and version that
     * would be returned by the core contract (`_contractAddress`)
     * for a given project  (`projectId`) with the given dependency
     * name and version (`dependencyNameAndVersion`).
     * @param contractAddress Core contract address.
     * @param projectId Project to override script type and version for.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "type`@`version") used to identify dependency.
     */
    function addProjectDependencyOverride(
        address contractAddress,
        uint256 projectId,
        bytes32 dependencyNameAndVersion
    ) external {
        _onlyAdminACL(this.addProjectDependencyOverride.selector);
        _onlyExistingDependency(dependencyNameAndVersion);
        _onlySupportedCoreContract(contractAddress);

        DependencyRegistryStorageLib.s().projectDependencyOverrides[
            contractAddress
        ][projectId] = dependencyNameAndVersion;

        emit ProjectDependencyOverrideAdded(
            contractAddress,
            projectId,
            dependencyNameAndVersion
        );
    }

    /**
     * @notice Removes the script type and version override for a given
     * project (`projectId`) on a given core contract (`_contractAddress`).
     * @param contractAddress Core contract address.
     * @param projectId Project to remove override for.
     */
    function removeProjectDependencyOverride(
        address contractAddress,
        uint256 projectId
    ) external {
        _onlyAdminACL(this.removeProjectDependencyOverride.selector);

        DependencyRegistryStorageLib.Storage
            storage ds = DependencyRegistryStorageLib.s();

        require(
            ds.projectDependencyOverrides[contractAddress][projectId] !=
                bytes32(""),
            "No override set for project"
        );

        delete ds.projectDependencyOverrides[contractAddress][projectId];

        emit ProjectDependencyOverrideRemoved(contractAddress, projectId);
    }

    /**
     * @notice Returns an array of strings representing all registered dependencies in the contract.
     * Each string is a combination of the dependency's name and version
     * @dev This function is designed to be called outside of block execution where there is no gas limit,
     * as it may consume a large amount of gas when there are many registered dependencies.
     * @return A string array where each element is a registered dependency in the format "name@version".
     */
    function getDependencyNamesAndVersions()
        external
        view
        returns (string[] memory)
    {
        DependencyRegistryStorageLib.Storage
            storage ds = DependencyRegistryStorageLib.s();

        uint256 numDependencies = ds.dependencyNameVersionIds.length();
        string[] memory dependencyTypes = new string[](numDependencies);

        for (uint256 i = 0; i < numDependencies; i++) {
            dependencyTypes[i] = ds.dependencyNameVersionIds.at(i).toString();
        }
        return dependencyTypes;
    }

    /**
     * @notice Returns number of registered dependencies
     * @return Number of registered dependencies.
     */
    function getDependencyCount() external view returns (uint256) {
        return
            DependencyRegistryStorageLib.s().dependencyNameVersionIds.length();
    }

    /**
     * @notice Returns registered depenedency name and version at index `index`.
     * @return Registered dependency at `index`, relative to the overall length of the dependency type set.
     */
    function getDependencyNameAndVersion(
        uint256 index
    ) external view returns (string memory) {
        DependencyRegistryStorageLib.Storage
            storage ds = DependencyRegistryStorageLib.s();

        _onlyInRangeIndex({
            index: index,
            length: ds.dependencyNameVersionIds.length()
        });
        return ds.dependencyNameVersionIds.at(index).toString();
    }

    /**
     * @notice Returns array of registered license types
     * @return Array of registered license types.
     * @dev This is only intended to be called outside of block
     * execution where there is no gas limit.
     */
    function getLicenseTypes() external view returns (string[] memory) {
        DependencyRegistryStorageLib.Storage
            storage ds = DependencyRegistryStorageLib.s();

        uint256 numLicenseTypes = ds.licenseTypes.length();
        string[] memory licenseTypes = new string[](numLicenseTypes);

        for (uint256 i; i < numLicenseTypes; ) {
            licenseTypes[i] = ds.licenseTypes.at(i).toString();
            unchecked {
                ++i;
            }
        }
        return licenseTypes;
    }

    /**
     * @notice Returns number of registered license types
     * @return Number of registered license types.
     */
    function getLicenseTypeCount() external view returns (uint256) {
        return DependencyRegistryStorageLib.s().licenseTypes.length();
    }

    /**
     * @notice Returns registered license type at index `index`.
     * @return Registered license type at `index`, relative to the overall length of the license type set.
     */
    function getLicenseType(
        uint256 index
    ) external view returns (string memory) {
        DependencyRegistryStorageLib.Storage
            storage ds = DependencyRegistryStorageLib.s();

        _onlyInRangeIndex({index: index, length: ds.licenseTypes.length()});
        return ds.licenseTypes.at(index).toString();
    }

    /**
     * @notice Adds a full license text to license `licenseType`, by way of
     *         providing a string to write to bytecode storage.
     * @param licenseType Name of license type (e.g. "MIT") used to identify license.
     * @param text Text to be added. Required to be a non-empty string,
     *                but no further validation is performed.
     */
    function addLicenseText(bytes32 licenseType, string memory text) external {
        _onlyAdminACL(this.addLicenseText.selector);
        _onlyNonEmptyString(text);
        _onlyExistingLicenseType(licenseType);

        DependencyRegistryStorageLib.License
            storage licenseEntry = DependencyRegistryStorageLib.s().allLicenses[
                licenseType
            ];
        // store license chunk in contract bytecode
        licenseEntry.licenseBytecodeAddresses[
            licenseEntry.licenseChunkCount
        ] = text.writeToBytecode();
        licenseEntry.licenseChunkCount = licenseEntry.licenseChunkCount + 1;

        emit LicenseTextUpdated(licenseType);
    }

    /**
     * @notice Updates the license text for license `licenseType` at index `_index`,
     *         by way of providing a string to write to bytecode storage.
     * @param licenseType Name of license type (e.g. "MIT") used to identify license.
     * @param index The index of a given license text chunk, relative to the overall `licenseChunkCount`.
     * @param text The updated license text value. Required to be a non-empty
     *                string, but no further validation is performed.
     */
    function updateLicenseText(
        bytes32 licenseType,
        uint256 index,
        string memory text
    ) external {
        _onlyAdminACL(this.updateLicenseText.selector);
        _onlyNonEmptyString(text);
        _onlyExistingLicenseType(licenseType);

        DependencyRegistryStorageLib.License
            storage licenseEntry = DependencyRegistryStorageLib.s().allLicenses[
                licenseType
            ];
        _onlyInRangeIndex({
            index: index,
            length: licenseEntry.licenseChunkCount
        });
        // store license text chunk in contract bytecode, replacing reference address from
        // the contract that is no longer referenced with the newly created one
        licenseEntry.licenseBytecodeAddresses[index] = text.writeToBytecode();

        emit LicenseTextUpdated(licenseType);
    }

    /**
     * @notice Removes the last license text chunk from license `licenseType`.
     * @param licenseType Name of license type (e.g. "MIT") used to identify license.
     */
    function removeLicenseLastText(bytes32 licenseType) external {
        _onlyAdminACL(this.removeLicenseLastText.selector);
        _onlyExistingLicenseType(licenseType);

        DependencyRegistryStorageLib.License
            storage licenseEntry = DependencyRegistryStorageLib.s().allLicenses[
                licenseType
            ];
        uint24 licenseChunkCount = licenseEntry.licenseChunkCount;
        require(licenseChunkCount > 0, "There is no license text to remove");
        // delete reference to old storage contract address
        delete licenseEntry.licenseBytecodeAddresses[licenseChunkCount - 1];
        unchecked {
            licenseEntry.licenseChunkCount = licenseChunkCount - 1;
        }

        emit LicenseTextUpdated(licenseType);
    }

    /**
     * @notice Returns license text for license `licenseType` at script index `index`.
     * @param licenseType Name of license type (e.g. "MIT") used to identify license.
     * @param index The index of a given script, relative to the overall `licenseChunkCount`.
     * @return A string containing the license text content at the given script chunk index for a given license.
     * @dev This method attempts to introspectively determine which library version of
     *      `BytecodeStorage` was used to write the stored script string that is being
     *      read back, in order to use the proper read approach. If the version is
     *      non-determinate, a fall-back to reading using the assumption that the bytes
     *      were written with `SSTORE2` is used.
     *      Also note that in this `SSTORE2` fallback handling, the approach of casting bytes to string
     *      can cause failure (e.g. unexpected continuation byte).
     */
    function getLicenseText(
        bytes32 licenseType,
        uint256 index
    ) external view returns (string memory) {
        DependencyRegistryStorageLib.License
            storage licenseEntry = DependencyRegistryStorageLib.s().allLicenses[
                licenseType
            ];
        _onlyInRangeIndex({
            index: index,
            length: licenseEntry.licenseChunkCount
        });

        address licenseAddress = licenseEntry.licenseBytecodeAddresses[index];
        bytes32 storageVersion = BytecodeStorageReader
            .getLibraryVersionForBytecode(licenseAddress);
        if (storageVersion == BytecodeStorageReader.UNKNOWN_VERSION_STRING) {
            return
                string(
                    BytecodeStorageReader.readBytesFromSSTORE2Bytecode(
                        licenseAddress
                    )
                );
        } else {
            return BytecodeStorageReader.readFromBytecode(licenseAddress);
        }
    }

    /**
     * @notice Returns the count of license chunks for license `licenseType`.
     * @param licenseType Name of license type (e.g. "MIT") used to identify dependency.
     */
    function getLicenseTextChunkCount(
        bytes32 licenseType
    ) external view returns (uint256) {
        return
            DependencyRegistryStorageLib
                .s()
                .allLicenses[licenseType]
                .licenseChunkCount;
    }

    /**
     * @notice Returns details for a given dependency type `dependencyNameAndVersion` input as string.
     * Reverts if input string does not fit within 32 bytes.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     * @return nameAndVersion String representation of `dependencyNameAndVersion`.
     *                        (e.g. "p5js(atSymbol)1.0.0")
     * @return licenseType License type for dependency
     * @return preferredCDN Preferred CDN URL for dependency
     * @return additionalCDNCount Count of additional CDN URLs for dependency
     * @return preferredRepository Preferred repository URL for dependency
     * @return additionalRepositoryCount Count of additional repository URLs for dependency
     * @return dependencyWebsite Project website URL for dependency
     * @return availableOnChain Whether dependency is available on chain
     * @return scriptCount Count of on-chain scripts for dependency
     */
    function getDependencyDetailsFromString(
        string memory dependencyNameAndVersion
    )
        external
        view
        returns (
            string memory nameAndVersion,
            string memory licenseType,
            string memory preferredCDN,
            uint24 additionalCDNCount,
            string memory preferredRepository,
            uint24 additionalRepositoryCount,
            string memory dependencyWebsite,
            bool availableOnChain,
            uint24 scriptCount
        )
    {
        _onlyBytes32String(dependencyNameAndVersion);
        return getDependencyDetails(dependencyNameAndVersion.stringToBytes32());
    }

    /**
     * @notice Returns the count of supported core contracts
     * @return Number of supported core contracts.
     */
    function getSupportedCoreContractCount() external view returns (uint256) {
        return
            ICoreRegistryV1(
                DependencyRegistryStorageLib.s().coreRegistryContract
            ).getNumRegisteredContracts();
    }

    /**
     * @notice Returns the address of the supported core contract at index `index`.
     * @param index Index of the core contract to be returned, relative to the overall
     *               list of supported core contracts.
     * @return address of the core contract.
     */
    function getSupportedCoreContract(
        uint256 index
    ) external view returns (address) {
        return
            ICoreRegistryV1(
                DependencyRegistryStorageLib.s().coreRegistryContract
            ).getRegisteredContractAt(index);
    }

    /**
     * @notice Returns whether the given contract address is a supported core contract.
     * @param coreContractAddress Address of the core contract to be queried.
     * @return True if the given contract address is a supported core contract.
     */
    function isSupportedCoreContract(
        address coreContractAddress
    ) external view returns (bool) {
        return
            ICoreRegistryV1(
                DependencyRegistryStorageLib.s().coreRegistryContract
            ).isRegisteredContract(coreContractAddress);
    }

    /**
     * @notice Returns a list of supported core contracts.
     * @return List of supported core contracts.
     * @dev This is only intended to be called outside of block
     * execution where there is no gas limit.
     */
    function getSupportedCoreContracts()
        external
        view
        returns (address[] memory)
    {
        return
            ICoreRegistryV1(
                DependencyRegistryStorageLib.s().coreRegistryContract
            ).getAllRegisteredContracts();
    }

    /**
     * @notice Returns the additional CDN URL at index `index` for dependency `dependencyNameAndVersion`.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     * @param index The index of an additional CDN, relative to the overall `additionalCDNCount`.
     */
    function getDependencyAdditionalCDN(
        bytes32 dependencyNameAndVersion,
        uint256 index
    ) external view returns (string memory) {
        DependencyRegistryStorageLib.Dependency
            storage dependency = DependencyRegistryStorageLib
                .s()
                .dependencyRecords[dependencyNameAndVersion];
        _onlyInRangeIndex({
            index: index,
            length: dependency.additionalCDNCount
        });
        return dependency.additionalCDNs[index];
    }

    /**
     * @notice Returns the additional repository URL at index `index` for dependency `dependencyNameAndVersion`.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     * @param index The index of an additional repository, relative to the overall `additionalRepositoryCount`.
     */
    function getDependencyAdditionalRepository(
        bytes32 dependencyNameAndVersion,
        uint256 index
    ) external view returns (string memory) {
        DependencyRegistryStorageLib.Dependency
            storage dependency = DependencyRegistryStorageLib
                .s()
                .dependencyRecords[dependencyNameAndVersion];
        _onlyInRangeIndex({
            index: index,
            length: dependency.additionalRepositoryCount
        });
        return dependency.additionalRepositories[index];
    }

    /**
     * @notice Returns the count of scripts for dependency `dependencyNameAndVersion`.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     */
    function getDependencyScriptCount(
        bytes32 dependencyNameAndVersion
    ) external view returns (uint256) {
        return
            DependencyRegistryStorageLib
                .s()
                .dependencyRecords[dependencyNameAndVersion]
                .scriptCount;
    }

    /**
     * @notice Returns address with bytecode containing script for
     *         dependency `_dependencyTypes` at script index `index`.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     * @param index The index of a given script, relative to the overall `scriptCount`.
     * @return The address of the bytecode storage for the script at the given index, if it can be determined.
     */
    function getDependencyScriptBytecodeAddress(
        bytes32 dependencyNameAndVersion,
        uint256 index
    ) external view returns (address) {
        DependencyRegistryStorageLib.Dependency
            storage dependency = DependencyRegistryStorageLib
                .s()
                .dependencyRecords[dependencyNameAndVersion];
        _onlyInRangeIndex({index: index, length: dependency.scriptCount});
        return dependency.scriptBytecodeAddresses[index];
    }

    /**
     * @notice Returns the storage library version for
     *         dependency `_dependencyTypes` at script index `index`.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     * @param index The index of a given script, relative to the overall `scriptCount`.
     * @return The storage library version for the script at the given index, if it can be determined.
     * @dev Note that we only expect this to be determinable if the script was written using a version
     *      of the Art Blocks `BytecodeStorage` library, and in other cases the fallback will be the
     *      unknown version string, as defined by the `BytecodeStorage` UNKNOWN_VERSION_STRING – this
     *      is inclusive of the in the case of `SSTORE2` written data blobs, which are an unknown version
     *      that can be fallback-read optimistically.
     */
    function getDependencyScriptBytecodeStorageVersion(
        bytes32 dependencyNameAndVersion,
        uint256 index
    ) external view returns (bytes32) {
        DependencyRegistryStorageLib.Dependency
            storage dependency = DependencyRegistryStorageLib
                .s()
                .dependencyRecords[dependencyNameAndVersion];
        _onlyInRangeIndex({index: index, length: dependency.scriptCount});
        return
            BytecodeStorageReader.getLibraryVersionForBytecode(
                dependency.scriptBytecodeAddresses[index]
            );
    }

    /**
     * @notice Returns script for dependency `dependencyNameAndVersion` at script index `index`.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     * @param index The index of a given script, relative to the overall `scriptCount`.
     * @return A string containing the script content at the given script chunk index for a given dependency.
     * @dev This method attempts to introspectively determine which library version of
     *      `BytecodeStorage` was used to write the stored script string that is being
     *      read back, in order to use the proper read approach. If the version is
     *      non-determinate, a fall-back to reading using the assumption that the bytes
     *      were written with `SSTORE2` is used.
     *      Also note that in this `SSTORE2` fallback handling, the approach of casting bytes to string
     *      can cause failure (e.g. unexpected continuation byte).
     */
    function getDependencyScript(
        bytes32 dependencyNameAndVersion,
        uint256 index
    ) external view returns (string memory) {
        DependencyRegistryStorageLib.Dependency
            storage dependency = DependencyRegistryStorageLib
                .s()
                .dependencyRecords[dependencyNameAndVersion];
        _onlyInRangeIndex({index: index, length: dependency.scriptCount});

        address scriptAddress = dependency.scriptBytecodeAddresses[index];
        bytes32 storageVersion = BytecodeStorageReader
            .getLibraryVersionForBytecode(scriptAddress);

        if (storageVersion == BytecodeStorageReader.UNKNOWN_VERSION_STRING) {
            return
                string(
                    BytecodeStorageReader.readBytesFromSSTORE2Bytecode(
                        scriptAddress
                    )
                );
        } else {
            return BytecodeStorageReader.readFromBytecode(scriptAddress);
        }
    }

    /**
     * @notice Returns the dependency name and version for a given project (`projectId`)
     * on a given core contract (`_contractAddress`). If no override is set,
     * the core contract is called to retrieve the script type and version as
     * dependency type. For any contract earlier than v3, that does not have
     * an override set, this will revert.
     * @param contractAddress Core contract address.
     * @param projectId Project to return dependency type for.
     * @return dependencyType Identifier for the dependency (i.e. "name@version") used by project.
     */
    function getDependencyNameAndVersionForProject(
        address contractAddress,
        uint256 projectId
    ) external view returns (string memory) {
        _onlySupportedCoreContract(contractAddress);

        bytes32 dependencyNameAndVersion = DependencyRegistryStorageLib
            .s()
            .projectDependencyOverrides[contractAddress][projectId];
        if (dependencyNameAndVersion != bytes32(0)) {
            return dependencyNameAndVersion.toString();
        }

        try
            IDependencyRegistryCompatibleV0(contractAddress)
                .projectScriptDetails(projectId)
        returns (string memory scriptTypeAndVersion, string memory, uint256) {
            return scriptTypeAndVersion;
        } catch {
            revert(
                "Contract does not implement projectScriptDetails and has no override set."
            );
        }
    }

    /**
     * @notice utility function to convert from string to bytes32.
     * Useful when a human is calling functions that take bytes32 as input.
     * Reverts if input string does not fit within 32 bytes.
     * @param input String to convert to bytes32.
     * @return bytes32 representation of input.
     */
    function stringToBytes32(
        string memory input
    ) external pure returns (bytes32) {
        _onlyBytes32String(input);
        return input.stringToBytes32();
    }

    /**
     * @notice Convenience function that returns whether `_sender` is allowed
     * to call function with selector `_selector` on contract `_contract`, as
     * determined by this contract's current Admin ACL contract. Expected use
     * cases include minter contracts checking if caller is allowed to call
     * admin-gated functions on minter contracts.
     * @param sender Address of the sender calling function with selector
     * `selector` on contract `contract_`.
     * @param contract_ Address of the contract being called by `sender`.
     * @param selector Function selector of the function being called by
     * `sender`.
     * @return bool Whether `sender` is allowed to call function with selector
     * `selector` on contract `contract_`.
     * @dev assumes the Admin ACL contract is the owner of this contract, which
     * is expected to always be true.
     * @dev adminACLContract is expected to either be null address (if owner
     * has renounced ownership), or conform to IAdminACLV0 interface. Check for
     * null address first to avoid revert when admin has renounced ownership.
     */
    function adminACLAllowed(
        address sender,
        address contract_,
        bytes4 selector
    ) public returns (bool) {
        return
            owner() != address(0) &&
            DependencyRegistryStorageLib.s().adminACLContract.allowed(
                sender,
                contract_,
                selector
            );
    }

    /**
     * @notice Returns details for a given dependency type `dependencyNameAndVersion`.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     * @return nameAndVersion String representation of `dependencyNameAndVersion`.
     *                        (e.g. "p5js(atSymbol)1.0.0")
     * @return licenseType License type for dependency
     * @return preferredCDN Preferred CDN URL for dependency
     * @return additionalCDNCount Count of additional CDN URLs for dependency
     * @return preferredRepository Preferred repository URL for dependency
     * @return additionalRepositoryCount Count of additional repository URLs for dependency
     * @return dependencyWebsite Project website URL for dependency
     * @return availableOnChain Whether dependency is available on chain
     * @return scriptCount Count of on-chain scripts for dependency
     */
    function getDependencyDetails(
        bytes32 dependencyNameAndVersion
    )
        public
        view
        returns (
            string memory nameAndVersion,
            string memory licenseType,
            string memory preferredCDN,
            uint24 additionalCDNCount,
            string memory preferredRepository,
            uint24 additionalRepositoryCount,
            string memory dependencyWebsite,
            bool availableOnChain,
            uint24 scriptCount
        )
    {
        DependencyRegistryStorageLib.Dependency
            storage dependency = DependencyRegistryStorageLib
                .s()
                .dependencyRecords[dependencyNameAndVersion];

        return (
            dependencyNameAndVersion.toString(),
            dependency.licenseType.toString(),
            dependency.preferredCDN,
            dependency.additionalCDNCount,
            dependency.preferredRepository,
            dependency.additionalRepositoryCount,
            dependency.website,
            dependency.scriptCount > 0,
            dependency.scriptCount
        );
    }

    /**
     * @notice Returns contract owner. Set to deployer's address by default on
     * contract deployment.
     * @return address Address of contract owner.
     * @dev ref: https://docs.openzeppelin.com/contracts/4.x/api/access#Ownable
     * @dev owner role was called `admin` prior to V3 core contract
     */
    function owner()
        public
        view
        override(OwnableUpgradeable)
        returns (address)
    {
        return OwnableUpgradeable.owner();
    }

    /**
     * @notice This function returns the address of the admin ACL contract.
     * @return address Address of the admin ACL contract.
     */
    function adminACLContract() public view returns (address) {
        return address(DependencyRegistryStorageLib.s().adminACLContract);
    }

    /**
     * @notice Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     * @param newOwner New owner.
     * @dev owner role was called `admin` prior to V3 core contract.
     * @dev Overrides and wraps OpenZeppelin's _transferOwnership function to
     * also update adminACLContract for improved introspection.
     */
    function _transferOwnership(address newOwner) internal override {
        OwnableUpgradeable._transferOwnership(newOwner);
        DependencyRegistryStorageLib.s().adminACLContract = IAdminACLV0(
            newOwner
        );
    }
}
