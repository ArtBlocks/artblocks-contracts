// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.22;

// Created By: Art Blocks Inc.

import {GenArt721CoreV3_Engine} from "./engine/V3/GenArt721CoreV3_Engine.sol";
import {EngineConfiguration} from "./interfaces/v0.8.x/IGenArt721CoreContractV3_Engine.sol";

import "./libs/v0.8.x/Bytes32Strings.sol";

/**
 * @title Art Blocks Curated ERC-721 core contract, V3.2
 * @author Art Blocks Inc.
 * @notice This contract derives from the Art Blocks Engine contract and adds
 * some functionality to support curation of projects by Art Blocks.
 * It also performs initialization of the contract in the constructor, because
 * the contract is not intended to use a clone proxy pattern, and is intended
 * to be deployed without any required follow-on calls to initialize.
 * ----------------------------------------------------------------------------
 * See the Art Blocks Engine contract for additional applicable documentation.
 */
contract GenArt721CoreV3_Curated is GenArt721CoreV3_Engine {
    using Bytes32Strings for bytes32;

    /// override patch version of this core contract
    // @dev this is a constant value that is used to override the inherited core version CORE_VERSION
    bytes32 constant CORE_VERSION_OVERRIDE = "v3.2.6";

    // @dev overridden core version is returned instead of the inherited core version
    function coreVersion() external pure override returns (string memory) {
        return CORE_VERSION_OVERRIDE.toString();
    }

    /**
     * @notice Event emitted when the Art Blocks Curation Registry contract is updated.
     * @param artblocksCurationRegistryAddress Address of Art Blocks Curation Registry contract.
     */
    event ArtBlocksCurationRegistryContractUpdated(
        address indexed artblocksCurationRegistryAddress
    );

    /// metadata pointer to the previous associated Flagship Artblocks core contracts
    // @dev not defined as constant because constant address arrays are not yet implemented in Solidity
    address[] public PREVIOUS_ART_BLOCKS_CONTRACTS = [
        0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a,
        0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270,
        0x99a9B7c1116f9ceEB1652de04d5969CcE509B069
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
     * @param defaultBaseURIHost Default base URI host for token URIs.
     * @param bytecodeStorageReaderContract_ Address of the bytecode storage reader contract to be used by this
     * contract.
     */
    constructor(
        EngineConfiguration memory engineConfiguration,
        address adminACLContract_,
        string memory defaultBaseURIHost,
        address bytecodeStorageReaderContract_
    ) {
        // input validation generally performed by the engine factory
        _onlyNonZeroAddress(engineConfiguration.renderProviderAddress);
        _onlyNonZeroAddress(engineConfiguration.randomizerContract);
        _onlyNonZeroAddress(adminACLContract_);
        _onlyNonZeroAddress(bytecodeStorageReaderContract_);
        require(
            bytes(defaultBaseURIHost).length > 0,
            "GenArt721CoreV3_Curated: defaultBaseURIHost must be non-empty"
        );

        // input validation specific to the curated contract
        require(
            !engineConfiguration.autoApproveArtistSplitProposals,
            "GenArt721CoreV3_Curated: autoApproveArtistSplitProposals must be false"
        );
        // @dev artblocks is listed as render provider, no party should be platform provider
        require(
            engineConfiguration.nullPlatformProvider,
            "GenArt721CoreV3_Curated: nullPlatformProvider must be true"
        );
        require(
            !engineConfiguration.allowArtistProjectActivation,
            "GenArt721CoreV3_Curated: allowArtistProjectActivation must be false"
        );
        // @dev previous artblocks contracts exists, so only starting project ID > 0
        require(
            engineConfiguration.startingProjectId > 0,
            "GenArt721CoreV3_Curated: startingProjectId must be greater than 0"
        );

        // initialize the contract
        _initialize({
            engineConfiguration: engineConfiguration,
            adminACLContract_: adminACLContract_,
            defaultBaseURIHost: defaultBaseURIHost,
            bytecodeStorageReaderContract_: bytecodeStorageReaderContract_
        });

        // override default base URI to be curated format instead of Engine (no address required for curated)
        _updateDefaultBaseURI(string.concat(defaultBaseURIHost, "/"));
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
        revert("GenArt721CoreV3_Curated: contract initialized in constructor");
    }

    /**
     * @notice Updates reference to Art Blocks Curation Registry contract.
     * @param _artblocksCurationRegistryAddress Address of Art Blocks Curation Registry contract.
     */
    function updateArtblocksCurationRegistryAddress(
        address _artblocksCurationRegistryAddress
    ) external {
        _onlyAdminACL(this.updateArtblocksCurationRegistryAddress.selector);
        _onlyNonZeroAddress(_artblocksCurationRegistryAddress);
        artblocksCurationRegistryAddress = _artblocksCurationRegistryAddress;
        emit ArtBlocksCurationRegistryContractUpdated(
            _artblocksCurationRegistryAddress
        );
    }
}
