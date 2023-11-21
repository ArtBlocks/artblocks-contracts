// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.19;

// Created By: Art Blocks Inc.

import "./interfaces/v0.8.x/IAdminACLV0.sol";
import "./interfaces/v0.8.x/IDependencyRegistryCompatibleV0.sol";
import "./interfaces/v0.8.x/IDependencyRegistryV0.sol";

import "@openzeppelin-4.7/contracts/utils/Strings.sol";
import "@openzeppelin-4.7/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin-4.8/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin-4.8/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin-4.5/contracts/utils/math/SafeCast.sol";

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
    using Strings for uint256;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeCast for uint24;

    uint8 constant AT_CHARACTER_CODE = uint8(bytes1("@")); // 0x40

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
        string referenceWebsite;
        // mapping from script index to address storing script in bytecode
        mapping(uint256 => address) scriptBytecodeAddresses;
        uint24 additionalCDNCount;
        uint24 additionalRepositoryCount;
        uint24 scriptCount;
    }

    // dependency types, i.e. "type@version"
    EnumerableSet.Bytes32Set private _dependencyTypes;
    // mapping from dependencyTypes to Dependency, which stores the properties of each dependency
    mapping(bytes32 => Dependency) dependencyDetails;
    // source code license types, MIT, GPL, etc.
    EnumerableSet.Bytes32Set private _licenseTypes;

    // set of supported core ArtBlocks contracts
    EnumerableSet.AddressSet private _supportedCoreContracts;
    mapping(address => mapping(uint256 => bytes32)) projectDependencyTypeOverrides;

    function _onlyNonZeroAddress(address _address) internal pure {
        require(_address != address(0), "Must input non-zero address");
    }

    function _onlyNonEmptyString(string memory _string) internal pure {
        require(bytes(_string).length != 0, "Must input non-empty string");
    }

    function _onlyAdminACL(bytes4 _selector) internal {
        require(
            adminACLAllowed(msg.sender, address(this), _selector),
            "Only Admin ACL allowed"
        );
    }

    function _onlySupportedCoreContract(
        address _coreContractAddress
    ) internal view {
        require(
            _supportedCoreContracts.contains(_coreContractAddress),
            "Core contract not supported"
        );
    }

    function _onlyExistingDependencyType(
        bytes32 _dependencyType
    ) internal view {
        require(
            _dependencyTypes.contains(_dependencyType),
            "Dependency type does not exist"
        );
    }

    function _onlyInRangeIndex(uint256 _index, uint256 _length) internal pure {
        require(_index < _length, "Index out of range");
    }

    function _onlyExistingLicenseType(bytes32 _licenseType) internal view {
        require(
            _licenseTypes.contains(_licenseType),
            "License type does not exist"
        );
    }

    /**
     * @notice Initializes contract.
     * @param _adminACLContract Address of admin access control contract, to be
     * set as contract owner.
     */
    function initialize(address _adminACLContract) public initializer {
        __Ownable_init();
        // set AdminACL management contract as owner
        _transferOwnership(_adminACLContract);
    }

    /**
     * @notice Adds a new license type that can be used by dependencies.
     */
    function addLicenseType(bytes32 _licenseType) external {
        _onlyAdminACL(this.addLicenseType.selector);
        // @dev the add function returns false if set already contains value
        require(_licenseTypes.add(_licenseType), "License type already exists");
        require(
            _licenseType != bytes32(""),
            "License type cannot be empty string"
        );
        emit LicenseTypeAdded(_licenseType);
    }

    /**
     * @notice Adds a new dependency.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     * @param _licenseType License type for dependency, must be a registered license type.
     * @param _preferredCDN Preferred CDN for dependency.
     * @param _preferredRepository Preferred repository for dependency.
     */
    function addDependency(
        bytes32 _dependencyType,
        bytes32 _licenseType,
        string memory _preferredCDN,
        string memory _preferredRepository,
        string memory _referenceWebsite
    ) external {
        _onlyAdminACL(this.addDependency.selector);
        _onlyExistingLicenseType(_licenseType);
        require(
            _dependencyType.containsExactCharacterQty(
                AT_CHARACTER_CODE,
                uint8(1)
            ),
            "must contain exactly one @"
        );
        require(
            // @dev the add function returns false if set already contains value
            _dependencyTypes.add(_dependencyType),
            "Dependency type already exists"
        );

        Dependency storage dependency = dependencyDetails[_dependencyType];
        dependency.licenseType = _licenseType;
        dependency.preferredCDN = _preferredCDN;
        dependency.preferredRepository = _preferredRepository;
        dependency.referenceWebsite = _referenceWebsite;

        emit DependencyAdded(
            _dependencyType,
            _licenseType,
            _preferredCDN,
            _preferredRepository,
            _referenceWebsite
        );
    }

    /**
     * @notice Removes a dependency.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     */
    function removeDependency(bytes32 _dependencyType) external {
        _onlyAdminACL(this.removeDependency.selector);
        _onlyExistingDependencyType(_dependencyType);
        Dependency storage dependency = dependencyDetails[_dependencyType];
        require(
            dependency.additionalCDNCount == 0 &&
                dependency.additionalRepositoryCount == 0 &&
                dependency.scriptCount == 0,
            "Cannot remove dependency with additional CDNs, repositories, or scripts"
        );

        _dependencyTypes.remove(_dependencyType);
        delete dependencyDetails[_dependencyType];

        emit DependencyRemoved(_dependencyType);
    }

    /**
     * @notice Adds a script to dependency `_dependencyType`, by way of
     *         providing a string to write to bytecode storage.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     * @param _script Script to be added. Required to be a non-empty string,
     *                but no further validation is performed.
     */
    function addDependencyScript(
        bytes32 _dependencyType,
        string memory _script
    ) external {
        _onlyAdminACL(this.addDependencyScript.selector);
        _onlyNonEmptyString(_script);
        _onlyExistingDependencyType(_dependencyType);
        Dependency storage dependency = dependencyDetails[_dependencyType];
        // store script in contract bytecode
        dependency.scriptBytecodeAddresses[dependency.scriptCount] = _script
            .writeToBytecode();
        dependency.scriptCount = dependency.scriptCount + 1;

        emit DependencyScriptUpdated(_dependencyType);
    }

    /**
     * @notice Updates script for dependencyType `_dependencyType` at script `_index`,
     *         by way of providing a string to write to bytecode storage.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     * @param _index The index of a given script, relative to the overall `scriptCount`.
     * @param _script The updated script value. Required to be a non-empty
     *                string, but no further validation is performed.
     */
    function updateDependencyScript(
        bytes32 _dependencyType,
        uint256 _index,
        string memory _script
    ) external {
        _onlyAdminACL(this.updateDependencyScript.selector);
        _onlyNonEmptyString(_script);
        _onlyExistingDependencyType(_dependencyType);
        Dependency storage dependency = dependencyDetails[_dependencyType];
        _onlyInRangeIndex({_index: _index, _length: dependency.scriptCount});
        // store script in contract bytecode, replacing reference address from
        // the contract that no longer exists with the newly created one
        dependency.scriptBytecodeAddresses[_index] = _script.writeToBytecode();

        emit DependencyScriptUpdated(_dependencyType);
    }

    /**
     * @notice Adds a script to dependency `_dependencyType`, by way of
     *         providing an already written chunk of bytecode storage.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     * @param _scriptPointer Address of script to be added. Required to be a non-zero address,
     *                       but no further validation is performed.
     */
    function addDependencyScriptPointer(
        bytes32 _dependencyType,
        address _scriptPointer
    ) external {
        _onlyAdminACL(this.addDependencyScriptPointer.selector);
        _onlyNonZeroAddress(_scriptPointer);
        _onlyExistingDependencyType(_dependencyType);
        Dependency storage dependency = dependencyDetails[_dependencyType];
        // store script in contract bytecode
        dependency.scriptBytecodeAddresses[
            dependency.scriptCount
        ] = _scriptPointer;
        dependency.scriptCount = dependency.scriptCount + 1;

        emit DependencyScriptUpdated(_dependencyType);
    }

    /**
     * @notice Updates script for dependencyType `_dependencyType` at script `_index`,
     *         by way of providing an already written chunk of bytecode storage.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     * @param _index The index of a given script, relative to the overall `scriptCount`.
     * @param _scriptPointer The updated script pointer (address of bytecode storage).
     *                       Required to be a non-zero address, but no further validation is performed.
     */
    function updateDependencyScriptPointer(
        bytes32 _dependencyType,
        uint256 _index,
        address _scriptPointer
    ) external {
        _onlyAdminACL(this.updateDependencyScriptPointer.selector);
        _onlyNonZeroAddress(_scriptPointer);
        _onlyExistingDependencyType(_dependencyType);
        Dependency storage dependency = dependencyDetails[_dependencyType];
        _onlyInRangeIndex({_index: _index, _length: dependency.scriptCount});
        dependency.scriptBytecodeAddresses[_index] = _scriptPointer;

        emit DependencyScriptUpdated(_dependencyType);
    }

    /**
     * @notice Removes last script from dependency `_dependencyType`.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     */
    function removeDependencyLastScript(bytes32 _dependencyType) external {
        _onlyAdminACL(this.removeDependencyLastScript.selector);
        _onlyExistingDependencyType(_dependencyType);
        Dependency storage dependency = dependencyDetails[_dependencyType];
        require(dependency.scriptCount > 0, "there are no scripts to remove");
        // delete reference to old storage contract address
        delete dependency.scriptBytecodeAddresses[dependency.scriptCount - 1];
        unchecked {
            dependency.scriptCount = dependency.scriptCount - 1;
        }

        emit DependencyScriptUpdated(_dependencyType);
    }

    /**
     * @notice Updates preferred CDN for dependency `_dependencyType`.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     * @param _preferredCDN URL for preferred CDN.
     */
    function updateDependencyPreferredCDN(
        bytes32 _dependencyType,
        string memory _preferredCDN
    ) external {
        _onlyAdminACL(this.updateDependencyPreferredCDN.selector);
        _onlyExistingDependencyType(_dependencyType);
        dependencyDetails[_dependencyType].preferredCDN = _preferredCDN;

        emit DependencyPreferredCDNUpdated(_dependencyType, _preferredCDN);
    }

    /**
     * @notice Updates preferred repository for dependency `_dependencyType`.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     * @param _preferredRepository URL for preferred repository.
     */
    function updateDependencyPreferredRepository(
        bytes32 _dependencyType,
        string memory _preferredRepository
    ) external {
        _onlyAdminACL(this.updateDependencyPreferredRepository.selector);
        _onlyExistingDependencyType(_dependencyType);
        dependencyDetails[_dependencyType]
            .preferredRepository = _preferredRepository;

        emit DependencyPreferredRepositoryUpdated(
            _dependencyType,
            _preferredRepository
        );
    }

    /**
     * @notice Updates project website for dependency `_dependencyType`.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     * @param _referenceWebsite URL for project website.
     */
    function updateDependencyReferenceWebsite(
        bytes32 _dependencyType,
        string memory _referenceWebsite
    ) external {
        _onlyAdminACL(this.updateDependencyReferenceWebsite.selector);
        _onlyExistingDependencyType(_dependencyType);
        dependencyDetails[_dependencyType].referenceWebsite = _referenceWebsite;

        emit DependencyReferenceWebsiteUpdated(
            _dependencyType,
            _referenceWebsite
        );
    }

    /**
     * @notice Adds a new CDN url to `_dependencyType`.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     * @param _additionalCDN CDN URL to be added. Required to be a non-empty string,
     *                       but no further validation is performed.
     */
    function addDependencyAdditionalCDN(
        bytes32 _dependencyType,
        string memory _additionalCDN
    ) external {
        _onlyAdminACL(this.addDependencyAdditionalCDN.selector);
        _onlyNonEmptyString(_additionalCDN);
        _onlyExistingDependencyType(_dependencyType);
        Dependency storage dependency = dependencyDetails[_dependencyType];

        uint256 additionalCDNCount = uint256(dependency.additionalCDNCount);
        dependency.additionalCDNs[additionalCDNCount] = _additionalCDN;
        dependency.additionalCDNCount = uint24(additionalCDNCount + 1);

        emit DependencyAdditionalCDNUpdated(
            _dependencyType,
            _additionalCDN,
            additionalCDNCount
        );
    }

    /**
     * @notice Removes additional CDN for dependency `_dependencyId` at index `_index`.
     * Removal is done by swapping the element to be removed with the last element in the array, then deleting this last element.
     * Assets with indices higher than `_index` can have their indices adjusted as a result of this operation.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     * @param _index The index of an additional CDN, relative to the overall `additionalCDNCount`.
     */
    function removeDependencyAdditionalCDN(
        bytes32 _dependencyType,
        uint256 _index
    ) external {
        _onlyAdminACL(this.removeDependencyAdditionalCDN.selector);
        _onlyExistingDependencyType(_dependencyType);
        Dependency storage dependency = dependencyDetails[_dependencyType];

        uint256 additionalCDNCount = dependency.additionalCDNCount;
        _onlyInRangeIndex({_index: _index, _length: additionalCDNCount});

        uint256 lastElementIndex = additionalCDNCount - 1;

        dependency.additionalCDNs[_index] = dependency.additionalCDNs[
            lastElementIndex
        ];
        delete dependency.additionalCDNs[lastElementIndex];

        dependency.additionalCDNCount = uint24(lastElementIndex);

        emit DependencyAdditionalCDNRemoved(_dependencyType, _index);
    }

    /**
     * @notice Updates additional CDN for dependency `_dependencyType` at `_index`.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     * @param _index The index of an additional CDN, relative to the overall `additionalCDNCount`.
     * @param _additionalCDN New CDN URL.
     */
    function updateDependencyAdditionalCDN(
        bytes32 _dependencyType,
        uint256 _index,
        string memory _additionalCDN
    ) external {
        _onlyAdminACL(this.updateDependencyAdditionalCDN.selector);
        _onlyNonEmptyString(_additionalCDN);
        _onlyExistingDependencyType(_dependencyType);
        Dependency storage dependency = dependencyDetails[_dependencyType];
        _onlyInRangeIndex({
            _index: _index,
            _length: dependency.additionalCDNCount
        });

        dependency.additionalCDNs[_index] = _additionalCDN;

        emit DependencyAdditionalCDNUpdated(
            _dependencyType,
            _additionalCDN,
            _index
        );
    }

    /**
     * @notice Adds a new repository URL to dependency `_dependencyType`.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     * @param _additionalRepository Repository URL to be added. Required to be a non-empty string,
     * but no further validation is performed.
     */
    function addDependencyAdditionalRepository(
        bytes32 _dependencyType,
        string memory _additionalRepository
    ) external {
        _onlyAdminACL(this.addDependencyAdditionalRepository.selector);
        _onlyNonEmptyString(_additionalRepository);
        _onlyExistingDependencyType(_dependencyType);
        Dependency storage dependency = dependencyDetails[_dependencyType];
        uint256 additionalRepositoryCount = uint256(
            dependency.additionalRepositoryCount
        );
        dependency.additionalRepositories[
            additionalRepositoryCount
        ] = _additionalRepository;
        dependency.additionalRepositoryCount = uint24(
            additionalRepositoryCount + 1
        );

        emit DependencyAdditionalRepositoryUpdated(
            _dependencyType,
            _additionalRepository,
            additionalRepositoryCount
        );
    }

    /**
     * @notice Removes additional repository for depenency `_dependencyId` at index `_index`.
     * Removal is done by swapping the element to be removed with the last element in the array, then deleting this last element.
     * Assets with indices higher than `_index` can have their indices adjusted as a result of this operation.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     * @param _index The index of an additional repository, relative to the overall `additionalRepositoryCount`.
     */
    function removeDependencyAdditionalRepository(
        bytes32 _dependencyType,
        uint256 _index
    ) external {
        _onlyAdminACL(this.removeDependencyAdditionalRepository.selector);
        _onlyExistingDependencyType(_dependencyType);
        Dependency storage dependency = dependencyDetails[_dependencyType];
        uint256 additionalRepositoryCount = dependency
            .additionalRepositoryCount;
        _onlyInRangeIndex({_index: _index, _length: additionalRepositoryCount});

        uint256 lastElementIndex = additionalRepositoryCount - 1;

        dependency.additionalRepositories[_index] = dependencyDetails[
            _dependencyType
        ].additionalRepositories[lastElementIndex];
        delete dependency.additionalRepositories[lastElementIndex];

        dependency.additionalRepositoryCount = uint24(lastElementIndex);

        emit DependencyAdditionalRepositoryRemoved(_dependencyType, _index);
    }

    /**
     * @notice Updates additional repository for dependency `_dependencyType` at `_index`.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     * @param _index The index of an additional repository, relative to the overall `additionalRepositoryCount`.
     * @param _additionalRepository New Repository URL.
     */
    function updateDependencyAdditionalRepository(
        bytes32 _dependencyType,
        uint256 _index,
        string memory _additionalRepository
    ) external {
        _onlyAdminACL(this.updateDependencyAdditionalRepository.selector);
        _onlyNonEmptyString(_additionalRepository);
        _onlyExistingDependencyType(_dependencyType);
        Dependency storage dependency = dependencyDetails[_dependencyType];
        _onlyInRangeIndex({
            _index: _index,
            _length: dependency.additionalRepositoryCount
        });

        dependency.additionalRepositories[_index] = _additionalRepository;

        emit DependencyAdditionalRepositoryUpdated(
            _dependencyType,
            _additionalRepository,
            _index
        );
    }

    /**
     * @notice Adds a new core contract to the list of supported core contracts.
     * @param _contractAddress Address of the core contract to be added.
     */
    function addSupportedCoreContract(address _contractAddress) external {
        _onlyAdminACL(this.addSupportedCoreContract.selector);
        _onlyNonZeroAddress(_contractAddress);
        require(
            // @dev the add function returns false if set already contains value
            _supportedCoreContracts.add(_contractAddress),
            "Contract already supported"
        );
        emit SupportedCoreContractAdded(_contractAddress);
    }

    /**
     * @notice Removes a core contract from the list of supported core contracts.
     * @param _contractAddress Address of the core contract to be removed.
     */
    function removeSupportedCoreContract(address _contractAddress) external {
        _onlyAdminACL(this.removeSupportedCoreContract.selector);
        require(
            // @dev the remove function returns false if set does not contain value
            _supportedCoreContracts.remove(_contractAddress),
            "Core contract already removed or not in set"
        );
        emit SupportedCoreContractRemoved(_contractAddress);
    }

    /**
     * @notice Overrides the script type and version that
     * would be returned by the core contract (`_contractAddress`)
     * for a given project  (`projectId`) with the given dependency
     * type (`_dependencyType`).
     * @param _contractAddress Core contract address.
     * @param _projectId Project to override script type and version for.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     */
    function addProjectDependencyTypeOverride(
        address _contractAddress,
        uint256 _projectId,
        bytes32 _dependencyType
    ) external {
        _onlyAdminACL(this.addProjectDependencyTypeOverride.selector);
        _onlyExistingDependencyType(_dependencyType);
        _onlySupportedCoreContract(_contractAddress);
        projectDependencyTypeOverrides[_contractAddress][
            _projectId
        ] = _dependencyType;

        emit ProjectDependencyTypeOverrideAdded(
            _contractAddress,
            _projectId,
            _dependencyType
        );
    }

    /**
     * @notice Removes the script type and version override for a given
     * project (`projectId`) on a given core contract (`_contractAddress`).
     * @param _contractAddress Core contract address.
     * @param _projectId Project to remove override for.
     */
    function removeProjectDependencyTypeOverride(
        address _contractAddress,
        uint256 _projectId
    ) external {
        _onlyAdminACL(this.removeProjectDependencyTypeOverride.selector);
        require(
            projectDependencyTypeOverrides[_contractAddress][_projectId] !=
                bytes32(""),
            "No override set for project"
        );

        delete projectDependencyTypeOverrides[_contractAddress][_projectId];

        emit ProjectDependencyTypeOverrideRemoved(_contractAddress, _projectId);
    }

    /**
     * @notice Returns a list of registered dependency types.
     * @return List of registered dependency types.
     * @dev This is only intended to be called outside of block
     * execution where there is no gas limit.
     */
    function getDependencyTypes() external view returns (string[] memory) {
        uint256 numDependencyTypes = _dependencyTypes.length();
        string[] memory dependencyTypes = new string[](numDependencyTypes);

        for (uint256 i; i < numDependencyTypes; ) {
            dependencyTypes[i] = _dependencyTypes.at(i).toString();
            unchecked {
                ++i;
            }
        }
        return dependencyTypes;
    }

    /**
     * @notice Returns number of registered dependency types
     * @return Number of registered dependencies.
     */
    function getDependencyTypeCount() external view returns (uint256) {
        return _dependencyTypes.length();
    }

    /**
     * @notice Returns registered dependency type at index `_index`.
     * @return Registered dependency at `_index`, relative to the overall length of the dependency type set.
     */
    function getDependencyType(
        uint256 _index
    ) external view returns (string memory) {
        _onlyInRangeIndex({_index: _index, _length: _dependencyTypes.length()});
        return _dependencyTypes.at(_index).toString();
    }

    /**
     * @notice Returns number of registered license types
     * @return Number of registered license types.
     * @dev This is only intended to be called outside of block
     * execution where there is no gas limit.
     */
    function getLicenseTypes() external view returns (string[] memory) {
        uint256 numLicenseTypes = _licenseTypes.length();
        string[] memory licenseTypes = new string[](numLicenseTypes);

        for (uint256 i; i < numLicenseTypes; ) {
            licenseTypes[i] = _licenseTypes.at(i).toString();
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
        return _licenseTypes.length();
    }

    /**
     * @notice Returns registered license type at index `_index`.
     * @return Registered license type at `_index`, relative to the overall length of the license type set.
     */
    function getLicenseType(
        uint256 _index
    ) external view returns (string memory) {
        _onlyInRangeIndex({_index: _index, _length: _licenseTypes.length()});
        return _licenseTypes.at(_index).toString();
    }

    /**
     * @notice Returns details for a given dependency type `_dependencyType`.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     * @return typeAndVersion String representation of `_dependencyType`.
     *                        (e.g. "p5js(atSymbol)1.0.0")
     * @return licenseType License type for dependency
     * @return preferredCDN Preferred CDN URL for dependency
     * @return additionalCDNCount Count of additional CDN URLs for dependency
     * @return preferredRepository Preferred repository URL for dependency
     * @return additionalRepositoryCount Count of additional repository URLs for dependency
     * @return referenceWebsite Project website URL for dependency
     * @return availableOnChain Whether dependency is available on chain
     * @return scriptCount Count of on-chain scripts for dependency
     */
    function getDependencyDetails(
        bytes32 _dependencyType
    )
        external
        view
        returns (
            string memory typeAndVersion,
            string memory licenseType,
            string memory preferredCDN,
            uint24 additionalCDNCount,
            string memory preferredRepository,
            uint24 additionalRepositoryCount,
            string memory referenceWebsite,
            bool availableOnChain,
            uint24 scriptCount
        )
    {
        Dependency storage dependency = dependencyDetails[_dependencyType];

        return (
            _dependencyType.toString(),
            dependency.licenseType.toString(),
            dependency.preferredCDN,
            dependency.additionalCDNCount,
            dependency.preferredRepository,
            dependency.additionalRepositoryCount,
            dependency.referenceWebsite,
            dependency.scriptCount > 0,
            dependency.scriptCount
        );
    }

    /**
     * @notice Returns the count of supported core contracts
     * @return Number of supported core contracts.
     */
    function getSupportedCoreContractCount() external view returns (uint256) {
        return _supportedCoreContracts.length();
    }

    /**
     * @notice Returns the address of the supported core contract at index `_index`.
     * @param _index Index of the core contract to be returned, relative to the overall
     *               list of supported core contracts.
     * @return address of the core contract.
     */
    function getSupportedCoreContract(
        uint256 _index
    ) external view returns (address) {
        _onlyInRangeIndex({
            _index: _index,
            _length: _supportedCoreContracts.length()
        });
        return _supportedCoreContracts.at(_index);
    }

    /**
     * @notice Returns whether the given contract address is a supported core contract.
     * @param coreContractAddress Address of the core contract to be queried.
     * @return True if the given contract address is a supported core contract.
     */
    function isSupportedCoreContract(
        address coreContractAddress
    ) external view returns (bool) {
        return _supportedCoreContracts.contains(coreContractAddress);
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
        uint256 supportedCoreContractCount = _supportedCoreContracts.length();
        address[] memory supportedCoreContracts = new address[](
            supportedCoreContractCount
        );

        for (uint256 i; i < supportedCoreContractCount; ) {
            supportedCoreContracts[i] = _supportedCoreContracts.at(i);
            unchecked {
                ++i;
            }
        }

        return supportedCoreContracts;
    }

    /**
     * @notice Returns the additional CDN URL at index `_index` for dependency `_dependencyType`.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     * @param _index The index of an additional CDN, relative to the overall `additionalCDNCount`.
     */
    function getDependencyAdditionalCDN(
        bytes32 _dependencyType,
        uint256 _index
    ) external view returns (string memory) {
        Dependency storage dependency = dependencyDetails[_dependencyType];
        _onlyInRangeIndex({
            _index: _index,
            _length: dependency.additionalCDNCount
        });
        return dependency.additionalCDNs[_index];
    }

    /**
     * @notice Returns the additional repository URL at index `_index` for dependency `_dependencyType`.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     * @param _index The index of an additional repository, relative to the overall `additionalRepositoryCount`.
     */
    function getDependencyAdditionalRepository(
        bytes32 _dependencyType,
        uint256 _index
    ) external view returns (string memory) {
        Dependency storage dependency = dependencyDetails[_dependencyType];
        _onlyInRangeIndex({
            _index: _index,
            _length: dependency.additionalRepositoryCount
        });
        return dependency.additionalRepositories[_index];
    }

    /**
     * @notice Returns the count of scripts for dependency `_dependencyType`.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     */
    function getDependencyScriptCount(
        bytes32 _dependencyType
    ) external view returns (uint256) {
        return dependencyDetails[_dependencyType].scriptCount;
    }

    /**
     * @notice Returns address with bytecode containing script for
     *         dependency `_dependencyTypes` at script index `_index`.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     * @param _index The index of a given script, relative to the overall `scriptCount`.
     * @return The address of the bytecode storage for the script at the given index, if it can be determined.
     */
    function getDependencyScriptBytecodeAddress(
        bytes32 _dependencyType,
        uint256 _index
    ) external view returns (address) {
        Dependency storage dependency = dependencyDetails[_dependencyType];
        _onlyInRangeIndex({_index: _index, _length: dependency.scriptCount});
        return dependency.scriptBytecodeAddresses[_index];
    }

    /**
     * @notice Returns the storage library version for
     *         dependency `_dependencyTypes` at script index `_index`.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     * @param _index The index of a given script, relative to the overall `scriptCount`.
     * @return The storage library version for the script at the given index, if it can be determined.
     * @dev Note that we only expect this to be determinable if the script was written using a version
     *      of the Art Blocks `BytecodeStorage` library, and in other cases the fallback will be the
     *      unknown version string, as defined by the `BytecodeStorage` UNKNOWN_VERSION_STRING – this
     *      is inclusive of the in the case of `SSTORE2` written data blobs, which are an unknown version
     *      that can be fallback-read optimistically.
     */
    function getDependencyScriptBytecodeStorageVersion(
        bytes32 _dependencyType,
        uint256 _index
    ) external view returns (bytes32) {
        Dependency storage dependency = dependencyDetails[_dependencyType];
        _onlyInRangeIndex({_index: _index, _length: dependency.scriptCount});
        return
            BytecodeStorageReader.getLibraryVersionForBytecode(
                dependencyDetails[_dependencyType].scriptBytecodeAddresses[
                    _index
                ]
            );
    }

    /**
     * @notice Returns script for dependency `_dependencyType` at script index `_index`.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     * @param _index The index of a given script, relative to the overall `scriptCount`.
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
        bytes32 _dependencyType,
        uint256 _index
    ) external view returns (string memory) {
        Dependency storage dependency = dependencyDetails[_dependencyType];
        _onlyInRangeIndex({_index: _index, _length: dependency.scriptCount});

        address scriptAddress = dependency.scriptBytecodeAddresses[_index];
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
     * @notice Returns the dependency type for a given project (`projectId`)
     * on a given core contract (`_contractAddress`). If no override is set,
     * the core contract is called to retrieve the script type and version as
     * dependency type. For any contract earlier than v3, that does not have
     * an override set, this will revert.
     * @param _contractAddress Core contract address.
     * @param _projectId Project to return dependency type for.
     * @return dependencyType Identifier for the dependency (i.e. "type@version") used by project.
     */
    function getDependencyTypeForProject(
        address _contractAddress,
        uint256 _projectId
    ) external view returns (string memory) {
        _onlySupportedCoreContract(_contractAddress);
        bytes32 dependencyType = projectDependencyTypeOverrides[
            _contractAddress
        ][_projectId];
        if (dependencyType != bytes32(0)) {
            return dependencyType.toString();
        }

        try
            IDependencyRegistryCompatibleV0(_contractAddress)
                .projectScriptDetails(_projectId)
        returns (string memory scriptTypeAndVersion, string memory, uint256) {
            return scriptTypeAndVersion;
        } catch {
            revert(
                "Contract does not implement projectScriptDetails and has no override set."
            );
        }
    }

    /**
     * @notice Convenience function that returns whether `_sender` is allowed
     * to call function with selector `_selector` on contract `_contract`, as
     * determined by this contract's current Admin ACL contract. Expected use
     * cases include minter contracts checking if caller is allowed to call
     * admin-gated functions on minter contracts.
     * @param _sender Address of the sender calling function with selector
     * `_selector` on contract `_contract`.
     * @param _contract Address of the contract being called by `_sender`.
     * @param _selector Function selector of the function being called by
     * `_sender`.
     * @return bool Whether `_sender` is allowed to call function with selector
     * `_selector` on contract `_contract`.
     * @dev assumes the Admin ACL contract is the owner of this contract, which
     * is expected to always be true.
     * @dev adminACLContract is expected to either be null address (if owner
     * has renounced ownership), or conform to IAdminACLV0 interface. Check for
     * null address first to avoid revert when admin has renounced ownership.
     */
    function adminACLAllowed(
        address _sender,
        address _contract,
        bytes4 _selector
    ) public returns (bool) {
        return
            owner() != address(0) &&
            adminACLContract.allowed(_sender, _contract, _selector);
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
     * @notice Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     * @param newOwner New owner.
     * @dev owner role was called `admin` prior to V3 core contract.
     * @dev Overrides and wraps OpenZeppelin's _transferOwnership function to
     * also update adminACLContract for improved introspection.
     */
    function _transferOwnership(address newOwner) internal override {
        OwnableUpgradeable._transferOwnership(newOwner);
        adminACLContract = IAdminACLV0(newOwner);
    }
}
