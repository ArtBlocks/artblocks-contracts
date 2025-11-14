// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.22;

// Created By: Art Blocks Inc.

import {GenArt721CoreV3_Engine_Flex} from "./engine/V3/GenArt721CoreV3_Engine_Flex.sol";
import {EngineConfiguration} from "./interfaces/v0.8.x/IGenArt721CoreContractV3_Engine.sol";

import "./libs/v0.8.x/Bytes32Strings.sol";

/**
 * @title Art Blocks Explorations ERC-721 core contract, V3.2 Flex (ONCHAIN only)
 * @author Art Blocks Inc.
 * @notice This contract derives from the Art Blocks Engine Flex contract and adds
 * some functionality to support curation of projects by Art Blocks.
 * It also performs initialization of the contract in the constructor, because
 * the contract is not intended to use a clone proxy pattern, and is intended
 * to be deployed without any required follow-on calls to initialize.
 * Constraints are added to the contract to only allow ONCHAIN dependencies.
 * ----------------------------------------------------------------------------
 * See the Art Blocks Engine Flex contract for additional applicable documentation.
 */
contract GenArt721CoreV3_Explorations_Flex is GenArt721CoreV3_Engine_Flex {
    using Bytes32Strings for bytes32;

    /// override patch version of this core contract
    // @dev this is a constant value that is used to override the inherited core version CORE_VERSION
    bytes32 private constant _CORE_VERSION_OVERRIDE = "v3.2.8";

    // @dev overridden core version is returned instead of the inherited core version
    function coreVersion() external pure override returns (string memory) {
        return _CORE_VERSION_OVERRIDE.toString();
    }

    /// metadata pointer to the previous associated Art Blocks Explorations core contracts
    // @dev not defined as constant because constant address arrays are not yet implemented in Solidity
    address[] public PREVIOUS_ART_BLOCKS_EXPLORATIONS_CONTRACTS = [
        0x942BC2d3e7a589FE5bd4A5C6eF9727DFd82F5C8a
    ];

    /// Curation registry for Flagship projects, managed by Art Blocks
    address public artblocksCurationRegistryAddress;

    bool public constant IS_FLAGSHIP = true;

    /**
     * @notice Construct a new Explorations Art Blocks ERC-721 core contract.
     * Performs all contract initialization in the constructor.
     * @param engineConfiguration Configuration for the engine contract.
     * note: parameter `engineConfiguration.newSuperAdminAddress` is not used or operated on in this contract.
     * @param adminACLContract_ Address of the admin ACL contract.
     * @param bytecodeStorageReaderContract_ Address of the bytecode storage reader contract to be used by this
     * contract.
     * @dev parameter `defaultBaseURIHost` is not used or operated on in this contract - it is ignored and
     * will be overridden in the constructor.
     */
    constructor(
        EngineConfiguration memory engineConfiguration,
        address adminACLContract_,
        string memory /*defaultBaseURIHost*/,
        address bytecodeStorageReaderContract_
    ) GenArt721CoreV3_Engine_Flex() {
        // input validation generally performed by the engine factory
        _onlyNonZeroAddress(engineConfiguration.renderProviderAddress);
        _onlyNonZeroAddress(engineConfiguration.randomizerContract);
        _onlyNonZeroAddress(adminACLContract_);
        _onlyNonZeroAddress(bytecodeStorageReaderContract_);

        // input validation specific to the Explorations contract
        require(
            !engineConfiguration.autoApproveArtistSplitProposals,
            "GenArt721CoreV3_Explorations_Flex: autoApproveArtistSplitProposals must be false"
        );
        // @dev artblocks is listed as render provider, no party should be platform provider
        require(
            engineConfiguration.nullPlatformProvider,
            "GenArt721CoreV3_Explorations_Flex: nullPlatformProvider must be true"
        );
        require(
            !engineConfiguration.allowArtistProjectActivation,
            "GenArt721CoreV3_Explorations_Flex: allowArtistProjectActivation must be false"
        );
        // @dev previous artblocks contracts exists, so only starting project ID > 0
        require(
            engineConfiguration.startingProjectId > 0,
            "GenArt721CoreV3_Explorations_Flex: startingProjectId must be greater than 0"
        );

        // actual default base uri is hard-coded, depending on the contract address
        string memory defaultBaseURIHost = string.concat(
            "https://token.artblocks.io/",
            _addressToHexString(address(this)),
            "/"
        );

        // initialize the contract
        _initialize({
            engineConfiguration: engineConfiguration,
            adminACLContract_: adminACLContract_,
            defaultBaseURIHost: defaultBaseURIHost,
            bytecodeStorageReaderContract_: bytecodeStorageReaderContract_
        });
    }

    function _addressToHexString(
        address _address
    ) internal pure returns (string memory) {
        // convert address to hex string
        bytes memory buffer = new bytes(20);
        for (uint256 i = 0; i < 20; i++) {
            buffer[i] = bytes1(
                uint8(uint256(uint160(_address)) / (2 ** (8 * (19 - i))))
            );
        }
        return string.concat("0x", string(buffer));
    }

    /**
     * @notice Override of the Engine contract's initialize function.
     * Immediately reverts, as initialization of this Explorations contract is performed in the constructor.
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
            "GenArt721CoreV3_Explorations_Flex: contract initialized in constructor"
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
            "GenArt721CoreV3_Explorations_Flex: Dependency type must be ONCHAIN"
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
            "GenArt721CoreV3_Explorations_Flex: Dependency type must be ONCHAIN"
        );
        super.addProjectExternalAssetDependency({
            _projectId: _projectId,
            _cidOrData: _cidOrData,
            _dependencyType: _dependencyType
        });
    }
}
