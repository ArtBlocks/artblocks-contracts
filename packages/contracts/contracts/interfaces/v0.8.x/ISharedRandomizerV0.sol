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
     * @notice Project with ID `_projectId` is is or is not using a hash seed
     * setter contract to assign token hash seeds on core contract.
     */
    event ProjectUsingHashSeedSetterUpdated(
        address coreContract,
        uint256 projectId,
        bool usingHashSeedSetter
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
     * @notice Allows the artist of a project to configure their project to
     * only allow the specified hash seed setter contract to assign new token
     * hash seeds. When this is enabled, the hash seed setter contract is
     * responsible for assigning hash seeds to tokens, and the randomizer
     * contract will not use the pseudorandom atomic contract to generate
     * hash seeds.
     * An example use case is where the artist wants to mint a polyptych panel
     * (second, third, etc.) of a project, and therefore wants to re-use
     * specific hash seeds of the original project.
     * @param _coreContract - The address of the core contract
     * @param _projectId - The ID of the project to be toggled
     */
    function toggleProjectUseAssignedHashSeed(
        address _coreContract,
        uint256 _projectId
    ) external;

    /**
     * @notice Pre-set the hash seed for a token. This function is only
     * callable by the hash seed setter contract of the project.
     * @param _coreContract - The address of the core contract of `_tokenId`
     * @param _tokenId - The ID of the token to set the hash seed for
     * @param _hashSeed - The hash seed to set for `_tokenId`
     * @dev Only callable by the hash seed setter contract of `_coreContract`.
     */
    function preSetHashSeed(
        address _coreContract,
        uint256 _tokenId,
        bytes12 _hashSeed
    ) external;

    /**
     * @notice Boolean representing whether or not project with ID `_projectId`
     * on core contract `_coreContract` is currently using a hash seed setter
     * contract to assign hash seeds to tokens.
     */
    function projectUsesHashSeedSetter(
        address _coreContract,
        uint256 _projectId
    ) external view returns (bool _usingHashSeedSetter);

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
     * Returns the current pre-assigned hash seed for a given token ID.
     * Returns bytes12(0) if no hash seed has been set for the token.
     * Note that this only returns the pre-assigned hash seed for tokens that
     * are configured to use a hash seed setter contract. In typical cases
     * where the project is not configured to use a hash seed setter contract,
     * the hash seed is generated on-chain by the pseudorandom atomic contract
     * and is not stored on-chain in this randomizer contract, and therefore
     * this function will return bytes12(0).
     * @param _coreContract - The address of the core contract of `_tokenId`
     * @param _tokenId - The ID of the token to get the hash seed for
     * @return _hashSeed - The stored hash seed for `_tokenId`
     */
    function preAssignedHashSeed(
        address _coreContract,
        uint256 _tokenId
    ) external view returns (bytes12 _hashSeed);
}
