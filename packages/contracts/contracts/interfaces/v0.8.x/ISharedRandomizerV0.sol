// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity ^0.8.0;

import "./IRandomizer_V3CoreBase.sol";

interface ISharedRandomizerV0 is IRandomizer_V3CoreBase {
    /**
     * @notice The pseudorandom atomic contract that is used to generate
     * pseudorandom values for this randomizer was updated.
     */
    event PseudorandomAtomicContractUpdated(
        address indexed pseudorandomAtomicContract
    );

    /**
     * @notice Contract at `_hashSeedSetterContract` allowed to assign
     * token hash seeds on core contract `_coreContract` for project
     * `_projectId`.
     */
    event HashSeedSetterForProjectUpdated(
        address indexed coreContract,
        uint256 indexed projectId,
        address indexed hashSeedSetterContract
    );

    /**
     * @notice Project with ID `_projectId` is enabled/disabled for polyptych
     * minting (i.e. allows token hash seeds to be set by hash seed setter).
     */
    event ProjectIsPolyptychUpdated(
        address coreContract,
        uint256 projectId,
        bool isPolyptych
    );

    /**
     * @notice Allows the artist of a project to set the contract that is
     * allowed to assign hash seeds to tokens. Typically, this is expected to
     * be a minter contract, such as `MinterPolyptychV1`.
     * @param _coreContract - the core contract that is being configured
     * @param _projectId - the project ID that is being configured
     * @param _hashSeedSetterContract - the contract that is allowed to assign
     * hash seeds to tokens
     */
    function setHashSeedSetterContract(
        address _coreContract,
        uint256 _projectId,
        address _hashSeedSetterContract
    ) external;

    /**
     * @notice Allows the artist of a project to configure as as a polyptych
     * project.
     * @param _coreContract - The address of the core contract
     * @param _projectId - The ID of the project that has a polyptych panel
     * (second, third, etc.)
     */
    function toggleProjectIsPolyptych(
        address _coreContract,
        uint256 _projectId
    ) external;

    /**
     * @notice Store the token hash seed for an existing token to be re-used in
     * a polyptych panel.
     * @param _coreContract - The address of the core contract of `_tokenId`
     * @param _tokenId - The ID of the token to set the hash seed for
     * @param _hashSeed - The hash seed to set for `_tokenId`
     * @dev Only callable by the hash seed setter contract of `_coreContract`.
     */
    function setPolyptychHashSeed(
        address _coreContract,
        uint256 _tokenId,
        bytes12 _hashSeed
    ) external;

    /**
     * @notice Boolean representing whether or not project with ID `_projectId`
     * on core contract `_coreContract` is currently enabled for polyptych
     * minting.
     */
    function projectIsPolyptych(
        address _coreContract,
        uint256 _projectId
    ) external view returns (bool _isPolyptych);

    /**
     * Returns the hash seed setter contract for a given core contract.
     * Returns address(0) if no hash seed setter contract is set for the core.
     * @param _coreContract - The address of the core contract
     * @param _projectId - The ID of the project to query
     */
    function hashSeedSetterContracts(
        address _coreContract,
        uint256 _projectId
    ) external view returns (address _hashSeedSetterContract);

    /**
     * Returns the current hash seed for a given token ID.
     * Returns bytes12(0) if no hash seed is set for the token.
     * @param _coreContract - The address of the core contract of `_tokenId`
     * @param _tokenId - The ID of the token to get the hash seed for
     * @return _hashSeed - The stored hash seed for `_tokenId`
     */
    function polyptychHashSeed(
        address _coreContract,
        uint256 _tokenId
    ) external view returns (bytes12 _hashSeed);
}
