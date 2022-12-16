pragma solidity ^0.8.17;

interface IDependencyRegistryV0 {
    event SupportedCoreContractAdded(address indexed _coreContractAddress);

    event SupportedCoreContractRemoved(address indexed _coreContractAddress);

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

    event DependencyTypeReferenceWebsiteUpdated(
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

    /**
     * @notice Returns number of registered dependency types
     * @return Number of registered dependencies.
     */
    function getRegisteredDependencyTypeCount() external view returns (uint256);

    /**
     * @notice Returns registered depenedency type at index `_index`.
     * @return Registered dependency at `_index`.
     */
    function getRegisteredDependencyTypeAtIndex(uint256 _index)
        external
        view
        returns (string memory);

    /**
     * @notice Returns details for depedency type `_dependencyTypeId`.
     * @param _dependencyTypeId Dependency type to be queried.
     * @return typeAndVersion String representation of `_dependencyTypeId`.
     * (e.g. "p5js(atSymbol)1.0.0")
     * @return preferredCDN Preferred CDN URL for dependency type
     * @return additionalCDNCount Count of additional CDN URLs for dependency type
     * @return preferredRepository Preferred repository URL for dependency type
     * @return additionalRepositoryCount Count of additional repository URLs for dependency type
     * @return referenceWebsite Project website URL for dependency type
     * @return availableOnChain Whether dependency type is available on chain
     * @return scriptCount Count of on-chain scripts for dependency type
     */
    function getDependencyTypeDetails(bytes32 _dependencyTypeId)
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
        );

    /**
     * @notice Returns address with bytecode containing script for
     * dependency type `_dependencyTypeIds` at script index `_index`.
     */
    function getDependencyTypeScriptBytecodeAddressAtIndex(
        bytes32 _dependencyTypeId,
        uint256 _index
    ) external view returns (address);

    /**
     * @notice Returns script for dependency type `_dependencyTypeId` at script index `_index`.
     * @param _dependencyTypeId Dependency type to be queried.
     * @param _index Index of script to be queried.
     */
    function getDependencyTypeScriptAtIndex(
        bytes32 _dependencyTypeId,
        uint256 _index
    ) external view returns (string memory);

    /**
     * @notice Returns the dependency type for a given project (`projectId`)
     * on a given core contract (`_contractAddress`). If no override is set,
     * the core contract is called to retrieve the script type and version as
     * dependency type. For any contract earlier than v3, that does not have
     * an override set, this will revert.
     * @param _contractAddress Core contract address.
     * @param _projectId Project to return dependency type for.
     * @return dependencyTypeId Dependency type used by project.
     */
    function getDependencyTypeForProject(
        address _contractAddress,
        uint256 _projectId
    ) external view returns (string memory);
}
