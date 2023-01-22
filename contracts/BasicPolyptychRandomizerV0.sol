// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity 0.8.17;

import "./interfaces/0.8.x/IGenArt721CoreContractV3_Engine.sol";
import "./interfaces/0.8.x/IBasicPolyptychRandomizerV0.sol";

import "@openzeppelin-4.7/contracts/access/Ownable.sol";

/**
 * @title Basic Polytych Randomizer contract that enables the copying of token hash seeds.
 * @notice This contract requires several configuration options to be set properly before
 * it enables the copying of token hashes from an original token (the first panel of a polyptych)
 * to subsequent diptych, triptych, or polyptych panels.
 *
 * Requirements to use the polyptych randomizer:
 * - Core contract must be an instance of `GenArt721CoreV3_Engine`
 * - The initial project used as the first panel must be minted with a completely random token hash
 * - An `MinterPolyptychV0` contract or similar must be deployed and configured as the `hashSeedSetterContract`
 * - The `projectDuplicateHashSeedLimit` should be configured for each project
 *
 * Once the contract is configured, it will enable newly-minted tokens to use a copy of the hash
 * seed from a previously-minted token.
 */
contract BasicPolyptychRandomizerV0 is IBasicPolyptychRandomizerV0, Ownable {
    // The core contract that may interact with this randomizer contract.
    IGenArt721CoreContractV3_Engine public genArt721Core;

    // Used to obtain the project ID from the token ID
    uint256 constant ONE_MILLION = 1_000_000;

    // Mapping of token IDs to hash seeds
    mapping(uint256 => bytes12) public polyptychHashSeeds;

    // Configures the maximum number of hash seed copies that can exist per project (default zero)
    mapping(uint256 => bool) public projectIsPolyptych;

    // The contract allowed to assign hash seeds (e.g. PolyptychMinterV0)
    address public hashSeedSetterContract;

    function assignCoreAndRenounce(address _genArt721Core) external onlyOwner {
        renounceOwnership();
        genArt721Core = IGenArt721CoreContractV3_Engine(_genArt721Core);
    }

    // modifier to restrict access to only AdminACL allowed calls
    // @dev defers which ACL contract is used to the core contract
    modifier onlyCoreAdminACL(bytes4 _selector) {
        require(
            genArt721Core.adminACLAllowed(msg.sender, address(this), _selector),
            "Only Core AdminACL allowed"
        );
        _;
    }

    modifier onlyArtist(uint256 _projectId) {
        require(
            msg.sender == genArt721Core.projectIdToArtistAddress(_projectId),
            "Only Artist"
        );
        _;
    }

    // Allows the owner of the core contract to set the minter that is allowed to assign hash seeds
    function setHashSeedSetterContract(
        address _contractAddress
    ) external onlyCoreAdminACL(this.setHashSeedSetterContract.selector) {
        hashSeedSetterContract = _contractAddress;
        emit HashSeedSetterUpdated(_contractAddress);
    }

    /**
     * @notice Allows the owner of the core contract to configure a project as a polyptych
     * @param _projectId - The ID of the project that has a polyptych panel (second, third, etc.)
     */
    function toggleProjectIsPolyptych(
        uint256 _projectId
    ) external onlyArtist(_projectId) {
        projectIsPolyptych[_projectId] = !projectIsPolyptych[_projectId];
        emit ProjectIsPolyptychUpdated(
            _projectId,
            projectIsPolyptych[_projectId]
        );
    }

    // Sets the token hash seed to be re-used in the subsequent panels of a polyptych
    function setPolyptychHashSeed(
        uint256 _tokenId,
        bytes12 _hashSeed
    ) external {
        require(
            msg.sender == hashSeedSetterContract,
            "Only hashSeedSetterContract"
        );
        polyptychHashSeeds[_tokenId] = _hashSeed;
        // @dev event indicating token hash seed assigned is not required for subgraph indexing
        // because token hash seeds are still assigned atomically in `assignTokenHash` function.
        // If token hash seeds were assigned async, event emission may be required to support
        // subgraph indexing.
    }

    // When `genArt721Core` calls this, it can be assured that the randomizer
    // will set a bytes32 hash for tokenId `_tokenId` on the core contract.
    function assignTokenHash(uint256 _tokenId) external virtual {
        require(msg.sender == address(genArt721Core), "Only core may call");

        if (projectIsPolyptych[_tokenId / ONE_MILLION]) {
            bytes12 seededHash = polyptychHashSeeds[_tokenId];
            require(seededHash != 0);
            genArt721Core.setTokenHash_8PT(_tokenId, seededHash);
        } else {
            uint256 time = block.timestamp;
            bytes32 hash = keccak256(
                abi.encodePacked(
                    _tokenId,
                    block.number,
                    blockhash(block.number - 1),
                    time,
                    (time % 200) + 1
                )
            );
            genArt721Core.setTokenHash_8PT(_tokenId, hash);
        }
    }
}
