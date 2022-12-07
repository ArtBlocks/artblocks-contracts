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
}
