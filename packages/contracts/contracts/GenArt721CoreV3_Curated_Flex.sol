// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.22;

// Created By: Art Blocks Inc.

import {GenArt721CoreV3_Engine_Flex} from "./engine/V3/GenArt721CoreV3_Engine_Flex.sol";
import {EngineConfiguration} from "./interfaces/v0.8.x/IGenArt721CoreContractV3_Engine.sol";

import "./libs/v0.8.x/Bytes32Strings.sol";

/**
 * @title Art Blocks Curated ERC-721 core contract, V3.2 Flex
 * @author Art Blocks Inc.
 * @notice This contract derives from the Art Blocks Engine Flex contract and adds
 * some functionality to support curation of projects by Art Blocks.
 * It also performs initialization of the contract in the constructor, because
 * the contract is not intended to use a clone proxy pattern, and is intended
 * to be deployed without any required follow-on calls to initialize.
 * Constraints are added to the contract to only allow ONCHAIN dependencies,
 * ensuring that the Art Blocks Curated projects are only dependent on onchain
 * data, consistent with previous Art Blocks Curated contracts.
 * ----------------------------------------------------------------------------
 * See the Art Blocks Engine Flex contract for additional applicable documentation.
 */
contract GenArt721CoreV3_Curated_Flex is GenArt721CoreV3_Engine_Flex {
    using Bytes32Strings for bytes32;

    /// override patch version of this core contract
    // @dev this is a constant value that is used to override the inherited core version CORE_VERSION
    bytes32 private constant _CORE_VERSION_OVERRIDE = "v3.2.7";

    // @dev overridden core version is returned instead of the inherited core version
    function coreVersion() external pure override returns (string memory) {
        return _CORE_VERSION_OVERRIDE.toString();
    }

    /// metadata pointer to the previous associated Flagship Artblocks core contracts
    // @dev not defined as constant because constant address arrays are not yet implemented in Solidity
    address[] public PREVIOUS_ART_BLOCKS_CONTRACTS = [
        0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a,
        0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270,
        0x99a9B7c1116f9ceEB1652de04d5969CcE509B069,
        0xAB0000000000aa06f89B268D604a9c1C41524Ac6
    ];

    /// Curation registry for Flagship projects, managed by Art Blocks
    address public artblocksCurationRegistryAddress;

    bool public constant IS_FLAGSHIP = true;

    /**
     * @notice Construct a new curated Art Blocks ERC-721 core contract.
     * Performs all contract initialization in the constructor.
     * @param engineConfiguration Configuration for the engine contract.
     * note: parameter `engineConfiguration.newSuperAdminAddress` is not used or operated on in this contract.
     * @param adminACLContract_ Address of the admin ACL contract.
     * @param defaultBaseURIHost Default base URI host for token URIs, e.g. "https://token.artblocks.io/" for mainnet
     * @param bytecodeStorageReaderContract_ Address of the bytecode storage reader contract to be used by this
     * contract.
     */
    constructor(
        EngineConfiguration memory engineConfiguration,
        address adminACLContract_,
        string memory defaultBaseURIHost,
        address bytecodeStorageReaderContract_
    ) GenArt721CoreV3_Engine_Flex() {
        // input validation generally performed by the engine factory
        _onlyNonZeroAddress(engineConfiguration.renderProviderAddress);
        _onlyNonZeroAddress(engineConfiguration.randomizerContract);
        _onlyNonZeroAddress(adminACLContract_);
        _onlyNonZeroAddress(bytecodeStorageReaderContract_);
        require(
            bytes(defaultBaseURIHost).length > 0,
            "GenArt721CoreV3_Curated_Flex: defaultBaseURIHost must be non-empty"
        );

        // input validation specific to the curated contract
        require(
            !engineConfiguration.autoApproveArtistSplitProposals,
            "GenArt721CoreV3_Curated_Flex: autoApproveArtistSplitProposals must be false"
        );
        // @dev artblocks is listed as render provider, no party should be platform provider
        require(
            engineConfiguration.nullPlatformProvider,
            "GenArt721CoreV3_Curated_Flex: nullPlatformProvider must be true"
        );
        require(
            !engineConfiguration.allowArtistProjectActivation,
            "GenArt721CoreV3_Curated_Flex: allowArtistProjectActivation must be false"
        );
        // @dev previous artblocks contracts exists, so only starting project ID > 0
        require(
            engineConfiguration.startingProjectId > 0,
            "GenArt721CoreV3_Curated_Flex: startingProjectId must be greater than 0"
        );

        // initialize the contract
        _initialize({
            engineConfiguration: engineConfiguration,
            adminACLContract_: adminACLContract_,
            defaultBaseURIHost: defaultBaseURIHost,
            bytecodeStorageReaderContract_: bytecodeStorageReaderContract_
        });

        // override default base URI to be curated format instead of Engine (no address required for curated)
        _updateDefaultBaseURI(defaultBaseURIHost);
    }

    /**
     * @notice Override of the Engine contract's initialize function.
     * Immediately reverts, as initialization of this Curated contract is performed in the constructor.
     */
    function initialize(
        EngineConfiguration memory /*engineConfiguration*/,
        address /*adminACLContract_*/,
        string memory /*defaultBaseURIHost*/,
        address /*bytecodeStorageReaderContract_*/
    ) external pure override {
        // revert - initialization for this contract is performed in the constructor
        // @dev note that the initialize function would revert without this override, but it is included for clarity
        revert(
            "GenArt721CoreV3_Curated_Flex: contract initialized in constructor"
        );
    }

    /**
     * @notice Updates reference to Art Blocks Curation Registry contract.
     * @param _artblocksCurationRegistryAddress Address of Art Blocks Curation Registry contract.
     */
    function updateArtblocksCurationRegistryAddress(
        address _artblocksCurationRegistryAddress
    ) external {
        _onlyAdminACL(this.updateArtblocksCurationRegistryAddress.selector);
        artblocksCurationRegistryAddress = _artblocksCurationRegistryAddress;
        emit ArtBlocksCurationRegistryContractUpdated(
            _artblocksCurationRegistryAddress
        );
    }

    function updateProjectExternalAssetDependency(
        uint256 _projectId,
        uint256 _index,
        string memory _cidOrData,
        ExternalAssetDependencyType _dependencyType
    ) public override {
        require(
            _dependencyType == ExternalAssetDependencyType.ONCHAIN,
            "GenArt721CoreV3_Curated_Flex: Curated dependency type must be ONCHAIN"
        );
        super.updateProjectExternalAssetDependency({
            _projectId: _projectId,
            _index: _index,
            _cidOrData: _cidOrData,
            _dependencyType: _dependencyType
        });
    }

    function addProjectExternalAssetDependency(
        uint256 _projectId,
        string memory _cidOrData,
        ExternalAssetDependencyType _dependencyType
    ) public override {
        require(
            _dependencyType == ExternalAssetDependencyType.ONCHAIN,
            "GenArt721CoreV3_Curated_Flex: Curated dependency type must be ONCHAIN"
        );
        super.addProjectExternalAssetDependency({
            _projectId: _projectId,
            _cidOrData: _cidOrData,
            _dependencyType: _dependencyType
        });
    }
}
