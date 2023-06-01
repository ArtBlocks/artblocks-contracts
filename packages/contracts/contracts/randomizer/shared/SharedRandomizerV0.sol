// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity 0.8.19;

import "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import "../../interfaces/v0.8.x/ISharedRandomizerV0.sol";
import "../../interfaces/v0.8.x/IPseudorandomAtomic.sol";

/**
 * @title A shared randomizer contract that enables support of many Art Blocks
 * and Art Blocks Engine core contracts with a single randomizer.
 * @notice This randomizer is designed to be used with many core contracts that
 * implement the `IGenArt721CoreContractV3_Base` interface. It exclusively uses
 * atomic callbacks, and will assign a token's hash before returning from the
 * `assignTokenHash` function, as long as the call does not revert.
 *
 * The randomizer generates a token's hash seed in one of two ways:
 * 1. If the project of the token is specified as a polyptych, the randomizer
 * will assign the token the hash seed as previously set by the project's hash
 * seed setter contract. If no hash seed has been set, the randomizer will
 * revert.
 * 2. If the project of the token is not specified as a polyptych, the
 * randomizer will generate a new hash seed using the `IPseudorandomAtomic`
 * contract, which is immutable and set during deployment.
 *
 * When using this randomizer for ployptych minting, several requirements may
 * be required by the hash seed setter contract, including the possibility
 * that a token's hash seed must be available in a public getter function on
 * the core contract. Please inspect the hash seed setter contract to ensure
 * that all requirements are met.
 *
 * @notice Privileged Roles and Ownership:
 * Privileged roles and abilities are controlled by each core contract's admin
 * ACL contract and artists. Both of these roles hold extensive power and can
 * influence the behavior of this randomizer.
 * Care must be taken to ensure that the admin ACL contract and artist
 * addresses are secure behind a multi-sig or other access control mechanism.
 * ----------------------------------------------------------------------------
 * The following function is restricted to each core's Admin ACL contract:
 * - setHashSeedSetterContract
 * ----------------------------------------------------------------------------
 * The following functions are restricted to only the Artist address:
 * - toggleProjectIsPolyptych
 * ----------------------------------------------------------------------------
 * The following function is restricted to only the hash seed setter contract
 * of a given core contract:
 * - setPolyptychHashSeed
 * ----------------------------------------------------------------------------
 * Additional admin and artist privileged roles may be described on minters,
 * registries, and other contracts that may interact with this randomizer.
 */
contract SharedRandomizerV0 is ISharedRandomizerV0 {
    IPseudorandomAtomic public immutable pseudorandomAtomicContract;

    // constant used to obtain the project ID from the token ID
    uint256 internal constant ONE_MILLION = 1_000_000;

    // mapping of core contract => token ID => hash seed
    mapping(address => mapping(uint256 => bytes12)) private _polyptychHashSeed;

    // mapping of core contract => project ID => is polyptych
    mapping(address => mapping(uint256 => bool)) private _projectIsPolyptych;

    // mapping of core contract => hash seed setter contract
    mapping(address => address) private _hashSeedSetterContracts;

    // modifier to restrict access to only AdminACL allowed calls
    // @dev defers to ACL contract being used to the core contract
    function _onlyCoreAdminACL(
        address _coreContract,
        bytes4 _selector
    ) internal {
        require(
            IGenArt721CoreContractV3_Base(_coreContract).adminACLAllowed(
                msg.sender,
                address(this),
                _selector
            ),
            "Only Core AdminACL allowed"
        );
    }

    // modifier to restrict access to only Artist allowed calls
    function _onlyArtist(
        address _coreContract,
        uint256 _projectId
    ) internal view {
        require(
            msg.sender ==
                IGenArt721CoreContractV3_Base(_coreContract)
                    .projectIdToArtistAddress(_projectId),
            "Only Artist"
        );
    }

    // modifier to restrict access to only calls by the hash seed setter
    // contract of a given core contract
    function _onlyHashSeedSetterContract(address _coreContract) internal view {
        require(
            msg.sender == _hashSeedSetterContracts[_coreContract],
            "Only Hash Seed Setter Contract"
        );
    }

    /**
     *
     * @param _pseudorandomAtomicContract Address of the pseudorandom atomic
     * contract to use for atomically generating random values. This contract
     * does not have an owner, and therefore the pseudorandom atomic contract
     * address cannot be changed after deployment.
     */
    constructor(address _pseudorandomAtomicContract) {
        pseudorandomAtomicContract = IPseudorandomAtomic(
            _pseudorandomAtomicContract
        );
        emit PseudorandomAtomicContractUpdated({
            pseudorandomAtomicContract: _pseudorandomAtomicContract
        });
    }

    /**
     * @inheritdoc ISharedRandomizerV0
     */
    function setHashSeedSetterContract(
        address _coreContract,
        address _hashSeedSetterContract
    ) external {
        _onlyCoreAdminACL(
            _coreContract,
            this.setHashSeedSetterContract.selector
        );
        _hashSeedSetterContracts[_coreContract] = _hashSeedSetterContract;
        emit HashSeedSetterForCoreUpdated({
            coreContract: _coreContract,
            hashSeedSetterContract: _hashSeedSetterContract
        });
    }

    /**
     * @inheritdoc ISharedRandomizerV0
     */
    function toggleProjectIsPolyptych(
        address _coreContract,
        uint256 _projectId
    ) external {
        _onlyArtist(_coreContract, _projectId);
        _projectIsPolyptych[_coreContract][_projectId] = !_projectIsPolyptych[
            _coreContract
        ][_projectId];
        emit ProjectIsPolyptychUpdated({
            coreContract: _coreContract,
            projectId: _projectId,
            isPolyptych: _projectIsPolyptych[_coreContract][_projectId]
        });
    }

    /**
     * @inheritdoc ISharedRandomizerV0
     */
    function setPolyptychHashSeed(
        address _coreContract,
        uint256 _tokenId,
        bytes12 _hashSeed
    ) external {
        _onlyHashSeedSetterContract(_coreContract);
        _polyptychHashSeed[_coreContract][_tokenId] = _hashSeed;
        // @dev event indicating token hash seed assigned is not required for
        // subgraph indexing because token hash seeds are still assigned
        // atomically in `assignTokenHash` function. If token hash seeds were
        // assigned async, event emission may be required to support subgraph
        // indexing.
    }

    /**
     * @inheritdoc IRandomizer_V3CoreBase
     */
    function assignTokenHash(uint256 _tokenId) external {
        // @dev this function is callable by any core contract, and does not
        // does not require any gating.
        // @dev naming variables for readability
        address coreContract = msg.sender;
        uint256 projectId = _tokenId / ONE_MILLION;
        bytes32 hashSeed;
        if (_projectIsPolyptych[coreContract][projectId]) {
            hashSeed = _polyptychHashSeed[coreContract][_tokenId];
        } else {
            hashSeed = _getPseudorandomAtomic(coreContract, _tokenId);
        }
        // verify that the hash seed is non-zero
        require(hashSeed != 0, "Only non-zero hash seed");
        // assign the token hash seed on the core contract
        IGenArt721CoreContractV3_Base(coreContract).setTokenHash_8PT(
            _tokenId,
            hashSeed
        );
    }

    /**
     * @inheritdoc ISharedRandomizerV0
     */
    function projectIsPolyptych(
        address _coreContract,
        uint256 _projectId
    ) external view returns (bool _isPolyptych) {
        return _projectIsPolyptych[_coreContract][_projectId];
    }

    /**
     * @inheritdoc ISharedRandomizerV0
     */
    function hashSeedSetterContracts(
        address _coreContract
    ) external view returns (address _hashSeedSetterContract) {
        return _hashSeedSetterContracts[_coreContract];
    }

    /**
     * @inheritdoc ISharedRandomizerV0
     */
    function polyptychHashSeed(
        address _coreContract,
        uint256 _tokenId
    ) external view returns (bytes12 _hashSeed) {
        return _polyptychHashSeed[_coreContract][_tokenId];
    }

    /**
     * @notice Internal function to atomically obtain a pseudorandom number
     * from the configured pseudorandom contract.
     * @param _coreContract - The core contract that is requesting an atomic
     * pseudorandom number.
     * @param _tokenId - The token ID on `_coreContract` that is associated
     * with the pseudorandom number request.
     */
    function _getPseudorandomAtomic(
        address _coreContract,
        uint256 _tokenId
    ) internal view returns (bytes32) {
        return
            pseudorandomAtomicContract.getPseudorandomAtomic(
                keccak256(abi.encodePacked(_coreContract, _tokenId))
            );
    }
}
