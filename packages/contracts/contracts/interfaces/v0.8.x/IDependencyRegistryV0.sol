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

    event DependencyProjectScriptTagTypeUpdated(
        bytes32 indexed dependencyNameAndVersion,
        ProjectScriptTagType projectScriptTagType,
        string projectScriptSpecialType
    );

    /**
     * @notice Enum representing the canvas tag requirements for a dependency.
     * @dev Conveys whether generated HTML must include a canvas tag, and where.
     * @dev NoCanvasTag is the default value. No canvas tag is added to the generated HTML.
     * @dev CanvasBeforeProjectScript adds a canvas tag before the project script.
     * @dev CanvasAfterProjectScript adds a canvas tag after the project script.
     */
    enum CanvasTag {
        NoCanvasTag, // default
        CanvasBeforeProjectScript,
        CanvasAfterProjectScript
    }

    /**
     * @notice Enum representing how a project's script must be injected into generated HTML.
     * @dev ClassicScript is the default value. The project script is wrapped in a plain
     * `<script>` tag, which is correct for the majority of dependencies.
     * @dev Module wraps the project script in `<script type="module">`, for dependencies whose
     * projects are authored as ES modules (e.g. those importing a bare specifier such as "three").
     * @dev SpecialType wraps the project script in a `<script>` tag whose `type` attribute is set
     * to the dependency's `projectScriptSpecialType` (e.g. "application/processing").
     * @dev RawHtml injects the project script verbatim, with no wrapping tag, for dependencies
     * whose project scripts are themselves complete HTML documents (e.g. "custom@na"). Generated
     * HTML also omits the default style reset in this case, because the raw document owns its
     * own styling.
     */
    enum ProjectScriptTagType {
        ClassicScript, // default
        Module,
        SpecialType,
        RawHtml
    }

    /**
     * @notice Struct holding all details describing a dependency, including the fields that
     * fully prescribe how the generator should render projects using it.
     */
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
        // whether the dependency's own script is an ES module, and therefore must be exposed to
        // project scripts via an import map rather than loaded with a plain `<script src>` tag
        bool loadAsModule;
        // canvas tag requirement for the dependency
        CanvasTag canvasTag;
        // how a project's script must be injected into generated HTML
        ProjectScriptTagType projectScriptTagType;
        // `type` attribute used when projectScriptTagType is SpecialType; empty otherwise
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
     * @return dependencyDetails Details for the given dependency.
     */
    function getDependencyDetailsV2(
        bytes32 dependencyNameAndVersion
    ) external view returns (DependencyDetails memory dependencyDetails);

    /**
     * @notice Returns details for a given dependency type `dependencyNameAndVersion`.
     * @dev Superseded by `getDependencyDetailsV2`, which additionally returns the fields
     * prescribing how the generator renders projects using this dependency. Retained with an
     * unchanged signature so that existing off-chain consumers continue to decode correctly.
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
        );

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
