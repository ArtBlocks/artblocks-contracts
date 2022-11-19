// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.17;

// Created By: Art Blocks Inc.

import "./interfaces/0.8.x/IAdminACLV0.sol";
import "./interfaces/0.8.x/IGenArtDependencyConsumer.sol";

import "@openzeppelin-4.7/contracts/utils/Strings.sol";
import "@openzeppelin-4.7/contracts/access/Ownable.sol";
import "@openzeppelin-4.7/contracts/utils/structs/EnumerableSet.sol";
import "./libs/0.8.x/BytecodeStorage.sol";
import "./libs/0.8.x/Bytes32Strings.sol";

/**
 * @title Art Blocks Dependency Registry, V0.
 * @author Art Blocks Inc.
 * @notice Privileged Roles and Ownership:
 * Permissions managed by ACL contract
 */
contract DependencyRegistryV0 is Ownable {
    using BytecodeStorage for string;
    using BytecodeStorage for address;
    using Bytes32Strings for bytes32;
    using Strings for uint256;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    uint8 constant AT_CHARACTER_CODE = uint8(bytes1("@")); // 0x40

    /// admin ACL contract
    IAdminACLV0 public adminACLContract;

    event ProjectDependencyOverrideAdded(
        address indexed _coreContractAddress,
        uint256 indexed _projectId,
        bytes32 _dependencyTypeId
    );

    event ProjectDependencyOverrideRemoved(
        address indexed _coreContractAddress,
        uint256 indexed _projectId
    );

    event DependencyTypeAdded(
        bytes32 indexed _dependencyTypeId,
        string _preferredCDN,
        string _preferredRepository,
        string _projectWebsite
    );

    event DependencyTypeRemoved(bytes32 indexed _dependencyTypeId);

    event DependencyTypeProjectWebsiteUpdated(
        bytes32 indexed _dependencyTypeId,
        string _projectWebsite
    );

    event DependencyTypePreferredCDNUpdated(
        bytes32 indexed _dependencyTypeId,
        string _preferredCDN
    );

    event DependencyTypePreferredRepositoryUpdated(
        bytes32 indexed _dependencyTypeId,
        string _preferredRepository
    );

    event DependencyTypeAdditionalCDNUpdated(
        bytes32 indexed _dependencyTypeId,
        string _additionalCDN,
        uint256 _additionalCDNIndex
    );

    event DependencyTypeAdditionalCDNRemoved(
        bytes32 indexed _dependencyTypeId,
        uint256 indexed _additionalCDNIndex
    );

    event DependencyTypeAdditionalRepositoryUpdated(
        bytes32 indexed _dependencyTypeId,
        string _additionalRepository,
        uint256 _additionalRepositoryIndex
    );

    event DependencyTypeAdditionalRepositoryRemoved(
        bytes32 indexed _dependencyTypeId,
        uint256 indexed _additionalRepositoryIndex
    );

    event DependencyTypeScriptUpdated(bytes32 indexed _dependencyTypeId);

    struct DependencyType {
        string preferredCDN;
        mapping(uint256 => string) additionalCDNs;
        uint24 additionalCDNCount;
        string preferredRepository;
        mapping(uint256 => string) additionalRepositories;
        uint24 additionalRepositoryCount;
        string projectWebsite;
        uint24 scriptCount;
        // mapping from script index to address storing script in bytecode
        mapping(uint256 => address) scriptBytecodeAddresses;
    }

    EnumerableSet.Bytes32Set private _dependencyTypes;
    mapping(bytes32 => DependencyType) dependencyTypeInfo;
    mapping(address => mapping(uint256 => bytes32)) projectDependencyOverrides;

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

    modifier onlyExistingDependencyType(bytes32 _dependencyTypeId) {
        require(
            _dependencyTypes.contains(_dependencyTypeId),
            "Dependency type does not exist"
        );
        _;
    }

    /**
     * @notice Initializes contract.
     * @param _adminACLContract Address of admin access control contract, to be
     * set as contract owner.
     */
    constructor(address _adminACLContract) {
        // set AdminACL management contract as owner
        _transferOwnership(_adminACLContract);
    }

    /**
     * @notice Adds a new dependency type.
     * @param _dependencyTypeId Name of dependency type (i.e. "type@version")
     * @param _preferredCDN Preferred CDN for dependency type.
     * @param _preferredRepository Preferred repository for dependency type.
     */
    function addDependencyType(
        bytes32 _dependencyTypeId,
        string memory _preferredCDN,
        string memory _preferredRepository,
        string memory _projectWebsite
    ) external onlyAdminACL(this.addDependencyType.selector) {
        require(
            !_dependencyTypes.contains(_dependencyTypeId),
            "Dependency type already exists"
        );
        require(
            _dependencyTypeId.containsExactCharacterQty(
                AT_CHARACTER_CODE,
                uint8(1)
            ),
            "must contain exactly one @"
        );

        _dependencyTypes.add(_dependencyTypeId);
        dependencyTypeInfo[_dependencyTypeId].preferredCDN = _preferredCDN;
        dependencyTypeInfo[_dependencyTypeId]
            .preferredRepository = _preferredRepository;
        dependencyTypeInfo[_dependencyTypeId].projectWebsite = _projectWebsite;

        emit DependencyTypeAdded(
            _dependencyTypeId,
            _preferredCDN,
            _preferredRepository,
            _projectWebsite
        );
    }

    /**
     * @notice Removes a new dependency type.
     * @param _dependencyTypeId Name of dependency type (i.e. "type@version")
     */
    function removeDependencyType(bytes32 _dependencyTypeId)
        external
        onlyAdminACL(this.removeDependencyType.selector)
    {
        require(
            _dependencyTypes.contains(_dependencyTypeId),
            "Dependency type does not exist"
        );

        _dependencyTypes.remove(_dependencyTypeId);
        delete dependencyTypeInfo[_dependencyTypeId];

        emit DependencyTypeRemoved(_dependencyTypeId);
    }

    /**
     * @notice Returns a list of registered depenency types.
     * @return List of registered depenency types.
     */
    function getRegisteredDependencyTypes()
        external
        view
        returns (string[] memory)
    {
        string[] memory dependencyTypes = new string[](
            _dependencyTypes.length()
        );
        for (uint256 i = 0; i < _dependencyTypes.length(); i++) {
            dependencyTypes[i] = _dependencyTypes.at(i).toString();
        }
        return dependencyTypes;
    }

    /**
     * @notice Adds a script to dependencyType `_dependencyTypeId`.
     * @param _dependencyTypeId Dependency type to be updated.
     * @param _script Script to be added. Required to be a non-empty string,
     * but no further validation is performed.
     */
    function addDependencyTypeScript(
        bytes32 _dependencyTypeId,
        string memory _script
    )
        external
        onlyAdminACL(this.addDependencyTypeScript.selector)
        onlyNonEmptyString(_script)
    {
        DependencyType storage dependencyType = dependencyTypeInfo[
            _dependencyTypeId
        ];
        // store script in contract bytecode
        dependencyType.scriptBytecodeAddresses[
            dependencyType.scriptCount
        ] = _script.writeToBytecode();
        dependencyType.scriptCount = dependencyType.scriptCount + 1;

        emit DependencyTypeScriptUpdated(_dependencyTypeId);
    }

    /**
     * @notice Updates script for dependencyType `_dependencyTypeId` at script ID `_scriptId`.
     * @param _dependencyTypeId Dependency Type to be updated.
     * @param _scriptId Script ID to be updated.
     * @param _script The updated script value. Required to be a non-empty
     * string, but no further validation is performed.
     */
    function updateDependencyTypeScript(
        bytes32 _dependencyTypeId,
        uint256 _scriptId,
        string memory _script
    )
        external
        onlyAdminACL(this.updateDependencyTypeScript.selector)
        onlyNonEmptyString(_script)
    {
        DependencyType storage dependencyType = dependencyTypeInfo[
            _dependencyTypeId
        ];
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

        emit DependencyTypeScriptUpdated(_dependencyTypeId);
    }

    /**
     * @notice Removes last script from dependency type `_dependencyTypeId`.
     * @param _dependencyTypeId Dependency type to be updated.
     */
    function removeDependencyTypeLastScript(bytes32 _dependencyTypeId)
        external
        onlyAdminACL(this.removeDependencyTypeLastScript.selector)
    {
        DependencyType storage dependencyType = dependencyTypeInfo[
            _dependencyTypeId
        ];
        require(
            dependencyType.scriptCount > 0,
            "there are no scripts to remove"
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
        dependencyType
            .scriptBytecodeAddresses[dependencyType.scriptCount - 1]
            .purgeBytecode();
        // delete reference to contract address that no longer exists
        delete dependencyType.scriptBytecodeAddresses[
            dependencyType.scriptCount - 1
        ];
        unchecked {
            dependencyType.scriptCount = dependencyType.scriptCount - 1;
        }

        emit DependencyTypeScriptUpdated(_dependencyTypeId);
    }
    
    function updateDependencyTypePreferredCDN(
        bytes32 _dependencyTypeId,
        string memory _preferredCDN
    )
        external
        onlyAdminACL(this.updateDependencyTypePreferredCDN.selector)
        onlyNonEmptyString(_preferredCDN)
    {
        dependencyTypeInfo[_dependencyTypeId].preferredCDN = _preferredCDN;

        emit DependencyTypePreferredCDNUpdated(_dependencyTypeId, _preferredCDN);
    }

    function updateDependencyTypePreferredRepository(
        bytes32 _dependencyTypeId,
        string memory _preferredRepository
    )
        external
        onlyAdminACL(this.updateDependencyTypePreferredRepository.selector)
        onlyNonEmptyString(_preferredRepository)
    {
        dependencyTypeInfo[_dependencyTypeId].preferredRepository = _preferredRepository;

        emit DependencyTypePreferredRepositoryUpdated(
            _dependencyTypeId,
            _preferredRepository
        );
    }

    function updateDependencyTypeProjectWebsite(
        bytes32 _dependencyTypeId,
        string memory _projectWebsite
    ) external onlyAdminACL(this.updateDependencyTypeProjectWebsite.selector) {
        dependencyTypeInfo[_dependencyTypeId].projectWebsite = _projectWebsite;

        emit DependencyTypeProjectWebsiteUpdated(
            _dependencyTypeId,
            _projectWebsite
        );
    }

    function addDependencyTypeAdditionalCDN(
        bytes32 _dependencyTypeId,
        string memory _additionalCDN
    )
        external
        onlyAdminACL(this.addDependencyTypeAdditionalCDN.selector)
        onlyNonEmptyString(_additionalCDN)
    {
        uint24 additionalCDNCount = dependencyTypeInfo[_dependencyTypeId]
            .additionalCDNCount;
        dependencyTypeInfo[_dependencyTypeId].additionalCDNs[
            additionalCDNCount
        ] = _additionalCDN;
        dependencyTypeInfo[_dependencyTypeId].additionalCDNCount =
            additionalCDNCount +
            1;

        emit DependencyTypeAdditionalCDNUpdated(
            _dependencyTypeId,
            _additionalCDN,
            additionalCDNCount
        );
    }

    function removeDependencyTypeAdditionalCDNAtIndex(
        bytes32 _dependencyTypeId,
        uint256 _index
    )
        external
        onlyAdminACL(this.removeDependencyTypeAdditionalCDNAtIndex.selector)
        onlyExistingDependencyType(_dependencyTypeId)
    {
        uint24 additionalCDNCount = dependencyTypeInfo[_dependencyTypeId]
            .additionalCDNCount;
        require(_index < additionalCDNCount, "Asset index out of range");

        uint24 lastElementIndex = additionalCDNCount - 1;

        dependencyTypeInfo[_dependencyTypeId].additionalCDNs[
                _index
            ] = dependencyTypeInfo[_dependencyTypeId].additionalCDNs[
            lastElementIndex
        ];
        delete dependencyTypeInfo[_dependencyTypeId].additionalCDNs[
            lastElementIndex
        ];

        dependencyTypeInfo[_dependencyTypeId]
            .additionalCDNCount = lastElementIndex;

        emit DependencyTypeAdditionalCDNRemoved(_dependencyTypeId, _index);
    }

    function updateDependencyTypeAdditionalCDNAtIndex(
        bytes32 _dependencyTypeId,
        uint256 _index,
        string memory _additionalCDN
    )
        external
        onlyAdminACL(this.updateDependencyTypeAdditionalCDNAtIndex.selector)
    {
        uint24 additionalCDNCount = dependencyTypeInfo[_dependencyTypeId]
            .additionalCDNCount;
        require(_index < additionalCDNCount, "Asset index out of range");

        dependencyTypeInfo[_dependencyTypeId].additionalCDNs[
            _index
        ] = _additionalCDN;

        emit DependencyTypeAdditionalCDNUpdated(
            _dependencyTypeId,
            _additionalCDN,
            _index
        );
    }

    function addDependencyTypeAdditionalRepository(
        bytes32 _dependencyTypeId,
        string memory _additionalRepository
    )
        external
        onlyAdminACL(this.addDependencyTypeAdditionalRepository.selector)
        onlyNonEmptyString(_additionalRepository)
    {
        uint24 additionalRepositoryCount = dependencyTypeInfo[_dependencyTypeId]
            .additionalRepositoryCount;
        dependencyTypeInfo[_dependencyTypeId].additionalRepositories[
                additionalRepositoryCount
            ] = _additionalRepository;
        dependencyTypeInfo[_dependencyTypeId].additionalRepositoryCount =
            additionalRepositoryCount +
            1;

        emit DependencyTypeAdditionalRepositoryUpdated(
            _dependencyTypeId,
            _additionalRepository,
            additionalRepositoryCount
        );
    }

    function removeDependencyTypeAdditionalRepositoryAtIndex(
        bytes32 _dependencyTypeId,
        uint256 _index
    )
        external
        onlyAdminACL(
            this.removeDependencyTypeAdditionalRepositoryAtIndex.selector
        )
        onlyExistingDependencyType(_dependencyTypeId)
    {
        uint24 additionalRepositoryCount = dependencyTypeInfo[_dependencyTypeId]
            .additionalRepositoryCount;
        require(_index < additionalRepositoryCount, "Asset index out of range");

        uint24 lastElementIndex = additionalRepositoryCount - 1;

        dependencyTypeInfo[_dependencyTypeId].additionalRepositories[
                _index
            ] = dependencyTypeInfo[_dependencyTypeId].additionalRepositories[
            lastElementIndex
        ];
        delete dependencyTypeInfo[_dependencyTypeId].additionalRepositories[
            lastElementIndex
        ];

        dependencyTypeInfo[_dependencyTypeId]
            .additionalRepositoryCount = lastElementIndex;

        emit DependencyTypeAdditionalRepositoryRemoved(
            _dependencyTypeId,
            _index
        );
    }

    function updateDependencyTypeAdditionalRepositoryAtIndex(
        bytes32 _dependencyTypeId,
        uint256 _index,
        string memory _additionalRepository
    )
        external
        onlyAdminACL(
            this.updateDependencyTypeAdditionalRepositoryAtIndex.selector
        )
    {
        uint24 additionalRepositoryCount = dependencyTypeInfo[_dependencyTypeId]
            .additionalRepositoryCount;
        require(_index < additionalRepositoryCount, "Asset index out of range");

        dependencyTypeInfo[_dependencyTypeId].additionalRepositories[
                _index
            ] = _additionalRepository;

        emit DependencyTypeAdditionalRepositoryUpdated(
            _dependencyTypeId,
            _additionalRepository,
            _index
        );
    }

    function dependencyTypeDetails(bytes32 _dependencyTypeId)
        external
        view
        returns (
            string memory typeAndVersion,
            string memory preferredCDN,
            uint24 additionalCDNCount,
            string memory preferredRepository,
            uint24 additionalRepositoryCount,
            string memory projectWebsite,
            bool availableOnChain,
            uint24 scriptCount
        )
    {
        DependencyType storage dependencyType = dependencyTypeInfo[
            _dependencyTypeId
        ];

        return (
            _dependencyTypeId.toString(),
            dependencyType.preferredCDN,
            dependencyType.additionalCDNCount,
            dependencyType.preferredRepository,
            dependencyType.additionalRepositoryCount,
            dependencyType.projectWebsite,
            dependencyType.scriptCount > 0,
            dependencyType.scriptCount
        );
    }

    function addProjectDependencyOverride(
        address _contractAddress,
        uint256 _projectId,
        bytes32 _dependencyTypeId
    ) external onlyAdminACL(this.addProjectDependencyOverride.selector) {
        require(
            _dependencyTypes.contains(_dependencyTypeId),
            "Dependency type is not registered"
        );
        projectDependencyOverrides[_contractAddress][
            _projectId
        ] = _dependencyTypeId;

        emit ProjectDependencyOverrideAdded(
            _contractAddress,
            _projectId,
            _dependencyTypeId
        );
    }

    function removeProjectDependencyOverride(
        address _contractAddress,
        uint256 _projectId
    ) external onlyAdminACL(this.addProjectDependencyOverride.selector) {
        delete projectDependencyOverrides[_contractAddress][_projectId];

        emit ProjectDependencyOverrideRemoved(
            _contractAddress,
            _projectId
        );
    }

    function getDependencyForProject(
        address _contractAddress,
        uint256 _projectId
    ) external view returns (string memory) {
        bytes32 dependencyType = projectDependencyOverrides[_contractAddress][
            _projectId
        ];
        if (dependencyType != bytes32(0)) {
            return dependencyType.toString();
        }

        try
            IGenArtDependencyConsumer(_contractAddress).projectScriptDetails(
                _projectId
            )
        returns (string memory scriptTypeAndVersion, string memory, uint256) {
            return scriptTypeAndVersion;
        } catch {
            return "";
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
    function owner() public view override(Ownable) returns (address) {
        return Ownable.owner();
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
        Ownable._transferOwnership(newOwner);
        adminACLContract = IAdminACLV0(newOwner);
    }
}
