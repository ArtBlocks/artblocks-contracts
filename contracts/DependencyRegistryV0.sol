// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.17;

// Created By: Art Blocks Inc.

import "./interfaces/0.8.x/IAdminACLV0.sol";
import "./interfaces/0.8.x/IDependencyRegistryCompatibleV0.sol";
import "./interfaces/0.8.x/IDependencyRegistryV0.sol";

import "@openzeppelin-4.7/contracts/utils/Strings.sol";
import "@openzeppelin-4.7/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin-4.8/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin-4.8/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin-4.5/contracts/utils/math/SafeCast.sol";

import "./libs/0.8.x/BytecodeStorage.sol";
import "./libs/0.8.x/Bytes32Strings.sol";

/**
 * @title Art Blocks Dependency Registry, V0.
 * @author Art Blocks Inc.
 * @notice Privileged Roles and Ownership:
 * Permissions managed by ACL contract. If/when we ever call
 * renounceOwnership() this will becom a frozen, immutable registry
 * as no upgrades will be possible.
 * This contract This contract is intended to be an auxiliary reference registry
 * to our non-upgradeable and immutable ERC-721 conforming core contracts,
 * and has been made upgradeable as we expect its required functionality in
 * relation to the Art Blocks ecosystem to evolve over time.
 */
contract DependencyRegistryV0 is
    Initializable,
    OwnableUpgradeable,
    IDependencyRegistryV0
{
    using BytecodeStorage for string;
    using BytecodeStorage for address;
    using Bytes32Strings for bytes32;
    using Strings for uint256;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeCast for uint24;

    uint8 constant AT_CHARACTER_CODE = uint8(bytes1("@")); // 0x40

    /// admin ACL contract
    IAdminACLV0 public adminACLContract;

    struct Dependency {
        string preferredCDN;
        mapping(uint256 => string) additionalCDNs;
        string preferredRepository;
        mapping(uint256 => string) additionalRepositories;
        string referenceWebsite;
        // mapping from script index to address storing script in bytecode
        mapping(uint256 => address) scriptBytecodeAddresses;
        uint24 additionalCDNCount;
        uint24 additionalRepositoryCount;
        uint24 scriptCount;
    }

    EnumerableSet.Bytes32Set private _dependencyTypes;
    mapping(bytes32 => Dependency) dependencyDetails;

    EnumerableSet.AddressSet private _supportedCoreContracts;
    mapping(address => mapping(uint256 => bytes32)) projectDependencyTypeOverrides;

    modifier onlyNonZeroAddress(address _address) {
        require(_address != address(0), "Must input non-zero address");
        _;
    }

    modifier onlyNonEmptyString(string memory _string) {
        require(bytes(_string).length != 0, "Must input non-empty string");
        _;
    }

    modifier onlyAdminACL(bytes4 _selector) {
        require(
            adminACLAllowed(msg.sender, address(this), _selector),
            "Only Admin ACL allowed"
        );
        _;
    }

    modifier onlySupportedCoreContract(address _coreContractAddress) {
        require(
            _supportedCoreContracts.contains(_coreContractAddress),
            "Core contract not supported"
        );
        _;
    }

    modifier onlyExistingDependencyType(bytes32 _dependencyType) {
        require(
            _dependencyTypes.contains(_dependencyType),
            "Dependency type does not exist"
        );
        _;
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
     * @notice Adds a new dependency.
     * @param _dependencyType Name of dependency type (i.e. "type@version") used to identify dependency.
     * @param _preferredCDN Preferred CDN for dependency.
     * @param _preferredRepository Preferred repository for dependency.
     */
    function addDependency(
        bytes32 _dependencyType,
        string memory _preferredCDN,
        string memory _preferredRepository,
        string memory _referenceWebsite
    ) external onlyAdminACL(this.addDependency.selector) {
        require(
            !_dependencyTypes.contains(_dependencyType),
            "Dependency type already exists"
        );
        require(
            _dependencyType.containsExactCharacterQty(
                AT_CHARACTER_CODE,
                uint8(1)
            ),
            "must contain exactly one @"
        );

        _dependencyTypes.add(_dependencyType);
        Dependency storage dependencyType = dependencyDetails[_dependencyType];
        dependencyType.preferredCDN = _preferredCDN;
        dependencyType.preferredRepository = _preferredRepository;
        dependencyType.referenceWebsite = _referenceWebsite;

        emit DependencyAdded(
            _dependencyType,
            _preferredCDN,
            _preferredRepository,
            _referenceWebsite
        );
    }

    /**
     * @notice Removes a dependency.
     * @param _dependencyType Name of dependency type (i.e. "type@version")
     */
    function removeDependency(bytes32 _dependencyType)
        external
        onlyAdminACL(this.removeDependency.selector)
        onlyExistingDependencyType(_dependencyType)
    {
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
     * @notice Adds a script to dependency `_dependencyType`.
     * @param _dependencyType dependency to be updated.
     * @param _script Script to be added. Required to be a non-empty string,
     * but no further validation is performed.
     */
    function addDependencyScript(bytes32 _dependencyType, string memory _script)
        external
        onlyAdminACL(this.addDependencyScript.selector)
        onlyNonEmptyString(_script)
        onlyExistingDependencyType(_dependencyType)
    {
        Dependency storage dependency = dependencyDetails[_dependencyType];
        // store script in contract bytecode
        dependency.scriptBytecodeAddresses[dependency.scriptCount] = _script
            .writeToBytecode();
        dependency.scriptCount = dependency.scriptCount + 1;

        emit DependencyScriptUpdated(_dependencyType);
    }

    /**
     * @notice Updates script for dependencyType `_dependencyType` at script ID `_scriptId`.
     * @param _dependencyType dependency to be updated.
     * @param _scriptId Script ID to be updated.
     * @param _script The updated script value. Required to be a non-empty
     * string, but no further validation is performed.
     */
    function updateDependencyScript(
        bytes32 _dependencyType,
        uint256 _scriptId,
        string memory _script
    )
        external
        onlyAdminACL(this.updateDependencyScript.selector)
        onlyNonEmptyString(_script)
        onlyExistingDependencyType(_dependencyType)
    {
        Dependency storage dependencyType = dependencyDetails[_dependencyType];
        require(
            _scriptId < dependencyType.scriptCount,
            "scriptId out of range"
        );
        // purge old contract bytecode contract from the blockchain state
        // note: Although this does reduce usage of Ethereum state, it does not
        // reduce the gas costs of removal transactions. We believe this is the
        // best behavior at the time of writing, and do not expect this to
        // result in any breaking changes in the future. All current proposals
        // to change the self-destruct opcode are backwards compatible, but may
        // result in not removing the bytecode from the blockchain state. This
        // implementation is compatible with that architecture, as it does not
        // rely on the bytecode being removed from the blockchain state.
        dependencyType.scriptBytecodeAddresses[_scriptId].purgeBytecode();
        // store script in contract bytecode, replacing reference address from
        // the contract that no longer exists with the newly created one
        dependencyType.scriptBytecodeAddresses[_scriptId] = _script
            .writeToBytecode();

        emit DependencyScriptUpdated(_dependencyType);
    }

    /**
     * @notice Removes last script from dependency `_dependencyType`.
     * @param _dependencyType dependency to be updated.
     */
    function removeDependencyLastScript(bytes32 _dependencyType)
        external
        onlyAdminACL(this.removeDependencyLastScript.selector)
        onlyExistingDependencyType(_dependencyType)
    {
        Dependency storage dependency = dependencyDetails[_dependencyType];
        require(dependency.scriptCount > 0, "there are no scripts to remove");
        // purge old contract bytecode contract from the blockchain state
        // note: Although this does reduce usage of Ethereum state, it does not
        // reduce the gas costs of removal transactions. We believe this is the
        // best behavior at the time of writing, and do not expect this to
        // result in any breaking changes in the future. All current proposals
        // to change the self-destruct opcode are backwards compatible, but may
        // result in not removing the bytecode from the blockchain state. This
        // implementation is compatible with that architecture, as it does not
        // rely on the bytecode being removed from the blockchain state.
        dependency
            .scriptBytecodeAddresses[dependency.scriptCount - 1]
            .purgeBytecode();
        // delete reference to contract address that no longer exists
        delete dependency.scriptBytecodeAddresses[dependency.scriptCount - 1];
        unchecked {
            dependency.scriptCount = dependency.scriptCount - 1;
        }

        emit DependencyScriptUpdated(_dependencyType);
    }

    /**
     * @notice Updates preferred CDN for dependency `_dependencyType`.
     * @param _dependencyType dependency to be updated.
     * @param _preferredCDN URL for preferred CDN.
     */
    function updateDependencyPreferredCDN(
        bytes32 _dependencyType,
        string memory _preferredCDN
    )
        external
        onlyAdminACL(this.updateDependencyPreferredCDN.selector)
        onlyExistingDependencyType(_dependencyType)
    {
        dependencyDetails[_dependencyType].preferredCDN = _preferredCDN;

        emit DependencyPreferredCDNUpdated(_dependencyType, _preferredCDN);
    }

    /**
     * @notice Updates preferred repository for dependency `_dependencyType`.
     * @param _dependencyType dependency to be updated.
     * @param _preferredRepository URL for preferred repository.
     */
    function updateDependencyPreferredRepository(
        bytes32 _dependencyType,
        string memory _preferredRepository
    )
        external
        onlyAdminACL(this.updateDependencyPreferredRepository.selector)
        onlyExistingDependencyType(_dependencyType)
    {
        dependencyDetails[_dependencyType]
            .preferredRepository = _preferredRepository;

        emit DependencyPreferredRepositoryUpdated(
            _dependencyType,
            _preferredRepository
        );
    }

    /**
     * @notice Updates project website for dependency `_dependencyType`.
     * @param _dependencyType dependency to be updated.
     * @param _referenceWebsite URL for project website.
     */
    function updateDependencyReferenceWebsite(
        bytes32 _dependencyType,
        string memory _referenceWebsite
    )
        external
        onlyAdminACL(this.updateDependencyReferenceWebsite.selector)
        onlyExistingDependencyType(_dependencyType)
    {
        dependencyDetails[_dependencyType].referenceWebsite = _referenceWebsite;

        emit DependencyReferenceWebsiteUpdated(
            _dependencyType,
            _referenceWebsite
        );
    }

    /**
     * @notice Adds a new CDN url to `_dependencyType`.
     * @param _dependencyType dependency to be updated.
     * @param _additionalCDN CDN URL to be added. Required to be a non-empty string,
     * but no further validation is performed.
     */
    function addDependencyAdditionalCDN(
        bytes32 _dependencyType,
        string memory _additionalCDN
    )
        external
        onlyAdminACL(this.addDependencyAdditionalCDN.selector)
        onlyNonEmptyString(_additionalCDN)
        onlyExistingDependencyType(_dependencyType)
    {
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
     * @param _dependencyType dependency to be updated.
     * @param _index Additional CDN index
     */
    function removeDependencyAdditionalCDNAtIndex(
        bytes32 _dependencyType,
        uint256 _index
    )
        external
        onlyAdminACL(this.removeDependencyAdditionalCDNAtIndex.selector)
        onlyExistingDependencyType(_dependencyType)
    {
        Dependency storage dependency = dependencyDetails[_dependencyType];

        uint256 additionalCDNCount = dependency.additionalCDNCount;
        require(_index < additionalCDNCount, "Asset index out of range");

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
     * @param _dependencyType dependency to be updated.
     * @param _index Additional CDN index.
     * @param _additionalCDN New CDN URL.
     */
    function updateDependencyAdditionalCDNAtIndex(
        bytes32 _dependencyType,
        uint256 _index,
        string memory _additionalCDN
    )
        external
        onlyAdminACL(this.updateDependencyAdditionalCDNAtIndex.selector)
        onlyNonEmptyString(_additionalCDN)
        onlyExistingDependencyType(_dependencyType)
    {
        Dependency storage dependency = dependencyDetails[_dependencyType];
        uint24 additionalCDNCount = dependency.additionalCDNCount;
        require(_index < additionalCDNCount, "Asset index out of range");

        dependency.additionalCDNs[_index] = _additionalCDN;

        emit DependencyAdditionalCDNUpdated(
            _dependencyType,
            _additionalCDN,
            _index
        );
    }

    /**
     * @notice Adds a new repository URL to dependency `_dependencyType`.
     * @param _dependencyType dependency to be updated.
     * @param _additionalRepository Repository URL to be added. Required to be a non-empty string,
     * but no further validation is performed.
     */
    function addDependencyAdditionalRepository(
        bytes32 _dependencyType,
        string memory _additionalRepository
    )
        external
        onlyAdminACL(this.addDependencyAdditionalRepository.selector)
        onlyNonEmptyString(_additionalRepository)
        onlyExistingDependencyType(_dependencyType)
    {
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
     * @param _dependencyType dependency to be updated.
     * @param _index Additional repository index.
     */
    function removeDependencyAdditionalRepositoryAtIndex(
        bytes32 _dependencyType,
        uint256 _index
    )
        external
        onlyAdminACL(this.removeDependencyAdditionalRepositoryAtIndex.selector)
        onlyExistingDependencyType(_dependencyType)
    {
        Dependency storage dependency = dependencyDetails[_dependencyType];
        uint256 additionalRepositoryCount = uint256(
            dependency.additionalRepositoryCount
        );
        require(_index < additionalRepositoryCount, "Asset index out of range");

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
     * @param _dependencyType dependency to be updated.
     * @param _index Additional repository index.
     * @param _additionalRepository New Repository URL.
     */
    function updateDependencyAdditionalRepositoryAtIndex(
        bytes32 _dependencyType,
        uint256 _index,
        string memory _additionalRepository
    )
        external
        onlyAdminACL(this.updateDependencyAdditionalRepositoryAtIndex.selector)
        onlyNonEmptyString(_additionalRepository)
        onlyExistingDependencyType(_dependencyType)
    {
        Dependency storage dependency = dependencyDetails[_dependencyType];
        uint24 additionalRepositoryCount = dependency.additionalRepositoryCount;
        require(_index < additionalRepositoryCount, "Asset index out of range");

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
    function addSupportedCoreContract(address _contractAddress)
        external
        onlyAdminACL(this.addSupportedCoreContract.selector)
        onlyNonZeroAddress(_contractAddress)
    {
        require(
            !_supportedCoreContracts.contains(_contractAddress),
            "Contract already supported"
        );

        _supportedCoreContracts.add(_contractAddress);

        emit SupportedCoreContractAdded(_contractAddress);
    }

    /**
     * @notice Removes a core contract from the list of supported core contracts.
     * @param _contractAddress Address of the core contract to be removed.
     */
    function removeSupportedCoreContract(address _contractAddress)
        external
        onlyAdminACL(this.removeSupportedCoreContract.selector)
        onlySupportedCoreContract(_contractAddress)
    {
        _supportedCoreContracts.remove(_contractAddress);

        emit SupportedCoreContractRemoved(_contractAddress);
    }

    /**
     * @notice Overrides the script type and version that
     * would be returned by the core contract (`_contractAddress`)
     * for a given project  (`projectId`) with the given dependency
     * type (`_dependencyType`).
     * @param _contractAddress Core contract address.
     * @param _projectId Project to override script type and version for.
     * @param _dependencyType Dependency type to return for project.
     */
    function addProjectDependencyTypeOverride(
        address _contractAddress,
        uint256 _projectId,
        bytes32 _dependencyType
    )
        external
        onlyAdminACL(this.addProjectDependencyTypeOverride.selector)
        onlyExistingDependencyType(_dependencyType)
        onlySupportedCoreContract(_contractAddress)
    {
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
    ) external onlyAdminACL(this.removeProjectDependencyTypeOverride.selector) {
        require(
            projectDependencyTypeOverrides[_contractAddress][_projectId] !=
                bytes32(""),
            "No override set for project"
        );

        delete projectDependencyTypeOverrides[_contractAddress][_projectId];

        emit ProjectDependencyTypeOverrideRemoved(_contractAddress, _projectId);
    }

    /**
     * @notice Returns a list of registered depenency types.
     * @return List of registered depenency types.
     * @dev This is only intended to be called outside of block
     * execution where there is no gas limit.
     */
    function getDependencyTypes() external view returns (string[] memory) {
        string[] memory dependencyTypes = new string[](
            _dependencyTypes.length()
        );
        uint256 numDependencyTypes = _dependencyTypes.length();

        for (uint256 i = 0; i < numDependencyTypes; i++) {
            dependencyTypes[i] = _dependencyTypes.at(i).toString();
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
     * @notice Returns registered depenedency type at index `_index`.
     * @return Registered dependency at `_index`.
     */
    function getDependencyTypeAtIndex(uint256 _index)
        external
        view
        returns (string memory)
    {
        require(_dependencyTypes.length() > _index, "Index out of range");
        return _dependencyTypes.at(_index).toString();
    }

    /**
     * @notice Returns details for depedency type `_dependencyType`.
     * @param _dependencyType Dependency type to be queried.
     * @return typeAndVersion String representation of `_dependencyType`.
     * (e.g. "p5js(atSymbol)1.0.0")
     * @return preferredCDN Preferred CDN URL for dependency
     * @return additionalCDNCount Count of additional CDN URLs for dependency
     * @return preferredRepository Preferred repository URL for dependency
     * @return additionalRepositoryCount Count of additional repository URLs for dependency
     * @return referenceWebsite Project website URL for dependency
     * @return availableOnChain Whether dependency is available on chain
     * @return scriptCount Count of on-chain scripts for dependency
     */
    function getDependencyDetails(bytes32 _dependencyType)
        external
        view
        returns (
            string memory typeAndVersion,
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
     * @param _index Index of the core contract to be returned.
     * @return address of the core contract.
     */
    function getSupportedCoreContractAtIndex(uint256 _index)
        external
        view
        returns (address)
    {
        require(
            _supportedCoreContracts.length() > _index,
            "Index out of bounds"
        );
        return _supportedCoreContracts.at(_index);
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

        for (uint256 i = 0; i < supportedCoreContractCount; i++) {
            supportedCoreContracts[i] = _supportedCoreContracts.at(i);
        }

        return supportedCoreContracts;
    }

    function getDependencyAdditionalCDNAtIndex(
        bytes32 _dependencyType,
        uint256 _index
    ) external view returns (string memory) {
        return dependencyDetails[_dependencyType].additionalCDNs[_index];
    }

    function getDependencyAdditionalRepositoryAtIndex(
        bytes32 _dependencyType,
        uint256 _index
    ) external view returns (string memory) {
        return
            dependencyDetails[_dependencyType].additionalRepositories[_index];
    }

    /**
     * @notice Returns address with bytecode containing script for
     * dependency `_dependencyTypes` at script index `_index`.
     */
    function getDependencyScriptBytecodeAddressAtIndex(
        bytes32 _dependencyType,
        uint256 _index
    ) external view returns (address) {
        return
            dependencyDetails[_dependencyType].scriptBytecodeAddresses[_index];
    }

    /**
     * @notice Returns script for dependency `_dependencyType` at script index `_index`.
     * @param _dependencyType dependency to be queried.
     * @param _index Index of script to be queried.
     */
    function getDependencyScriptAtIndex(bytes32 _dependencyType, uint256 _index)
        external
        view
        returns (string memory)
    {
        Dependency storage dependency = dependencyDetails[_dependencyType];
        // If trying to access an out-of-index script, return the empty string.
        if (_index >= dependency.scriptCount) {
            return "";
        }

        return dependency.scriptBytecodeAddresses[_index].readFromBytecode();
    }

    /**
     * @notice Returns the dependency type for a given project (`projectId`)
     * on a given core contract (`_contractAddress`). If no override is set,
     * the core contract is called to retrieve the script type and version as
     * dependency type. For any contract earlier than v3, that does not have
     * an override set, this will revert.
     * @param _contractAddress Core contract address.
     * @param _projectId Project to return dependency type for.
     * @return dependencyType Dependency type used by project.
     */
    function getDependencyTypeForProject(
        address _contractAddress,
        uint256 _projectId
    )
        external
        view
        onlySupportedCoreContract(_contractAddress)
        returns (string memory)
    {
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
