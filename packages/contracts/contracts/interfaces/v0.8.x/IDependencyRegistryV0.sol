// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
pragma solidity ^0.8.19;

interface IDependencyRegistryV0 {
    // legacy event used before deferring to core registry for allowlist
    event SupportedCoreContractAdded(address indexed coreContractAddress);

    // legacy event used before deferring to core registry for allowlist
    event SupportedCoreContractRemoved(address indexed coreContractAddress);

    // active event used to add additional supported contracts beyond what core registry allows
    event SupportedCoreContractOverrideAdded(
        address indexed coreContractAddress
    );

    // active event used to remove additional supported contracts beyond what core registry allows
    event SupportedCoreContractOverrideRemoved(
        address indexed coreContractAddress
    );

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

    event CoreRegistryAddressUpdated(address indexed coreRegistryAddress);

    event UniversalBytecodeStorageReaderUpdated(address indexed newReader);

    event DependencyCanvasTagUpdated(
        bytes32 indexed dependencyNameAndVersion,
        CanvasTag canvasTag
    );

    event DependencyLoadAsModuleUpdated(
        bytes32 indexed dependencyNameAndVersion,
        bool loadAsModule
    );

    event DependencyProjectScriptSpecialTypeUpdated(
        bytes32 indexed dependencyNameAndVersion,
        string projectScriptSpecialType
    );

    /**
     * @notice Enum representing the canvas tag requirements for a dependency.
     * @dev This enum is used to convey the canvas tag for a dependency.
     * @dev NoCanvasTag is the default value. No canvas tag is required to be added to the html when generating the project outputs.
     * @dev CanvasBeforeProjectScript is used for dependencies that require a canvas tag to be added before the project script.
     * @dev CanvasAfterProjectScript is used for dependencies that require a canvas tag to be added after the project script.
     */
    enum CanvasTag {
        NoCanvasTag, // default
        CanvasBeforeProjectScript,
        CanvasAfterProjectScript
    }

    struct DependencyDetails {
        // name and version of dependency (i.e. "name@version") used to identify dependency
        string nameAndVersion;
        // type of license, MIT, GPL, etc.
        string licenseType;
        // preferred CDN URL for dependency
        string preferredCDN;
        // count of additional CDN URLs for dependency
        uint24 additionalCDNCount;
        // preferred code repository URL for dependency
        string preferredRepository;
        // count of additional repository URLs for dependency
        uint24 additionalRepositoryCount;
        // project website URL for dependency
        string dependencyWebsite;
        // whether the dependency is available on chain
        bool availableOnChain;
        // count of on-chain scripts for dependency
        uint24 scriptCount;
        // canvas tag for the dependency
        CanvasTag canvasTag;
        // whether the dependency should be loaded as a module
        bool loadAsModule;
        // project script special type for the dependency
        string projectScriptSpecialType;
    }

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

    /**
     * @notice Returns details for a given dependency type `dependencyNameAndVersion`.
     * @param dependencyNameAndVersion Name and version of dependency (i.e. "name@version") used to identify dependency.
     * @return dependencyDetails Details for a given dependency type.
     */
    function getDependencyDetails(
        bytes32 dependencyNameAndVersion
    ) external view returns (DependencyDetails memory dependencyDetails);

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
    ) external view returns (string memory);

    /**
     * @notice Returns whether the given contract address is a supported core contract.
     * @param coreContractAddress Address of the core contract to be queried.
     * @return True if the given contract address is a supported core contract.
     */
    function isSupportedCoreContract(
        address coreContractAddress
    ) external view returns (bool);

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
    ) external returns (bool);
}
