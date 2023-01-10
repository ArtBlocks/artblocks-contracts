// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity 0.8.17;

import "./interfaces/0.8.x/IBasicPolyptychRandomizerV0.sol";
import "./interfaces/0.8.x/IGenArt721CoreContractV3.sol";
import "./interfaces/0.8.x/IFilteredMinterHolderV1.sol";

import "@openzeppelin-4.7/contracts/access/Ownable.sol";

contract BasicPolyptychRandomizerV0 is IBasicPolyptychRandomizerV0, Ownable {
    // The core contract that may interact with this randomizer contract.
    IGenArt721CoreContractV3 public genArt721Core;

    // Used to obtain the project ID from the token ID
    uint256 constant ONE_MILLION = 1_000_000;

    // Mapping of token IDs to hash seeds
    mapping(uint256 => bytes12) public polyptychHashSeeds;

    // Mapping of source token hashes to qty of tokens minted with that hash
    mapping(address => mapping(uint256 => mapping(uint256 => bool)))
        public baseTokenToUsedOnProject;

    // The second/subsequent panels of polyptychs should be configured to bypass randomizing
    mapping(uint256 => bool) projectIsPolyptych;

    // The contract allowed to assign hash seeds (e.g. PolyptychMinterV0)
    address hashSeedSetterContract;

    function assignCoreAndRenounce(address _genArt721Core) external onlyOwner {
        renounceOwnership();
        genArt721Core = IGenArt721CoreContractV3(_genArt721Core);
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

    // Allows the owner of the core contract to set the minter that is allowed to assign hash seeds
    function setHashSeedSetterContract(
        address _contractAddress
    ) external onlyCoreAdminACL(this.setHashSeedSetterContract.selector) {
        hashSeedSetterContract = _contractAddress;
        emit HashSeedSetterUpdated(_contractAddress);
    }

    // Allows the owner of the core contract to configure a project as a polyptych
    function toggleProjectIsPolyptych(
        uint256 _projectId
    ) external onlyCoreAdminACL(this.toggleProjectIsPolyptych.selector) {
        projectIsPolyptych[_projectId] = !projectIsPolyptych[_projectId];
    }

    // Sets the token hash seed to be re-used in the subsequent panels of a polyptych
    function setPolyptychHashSeed(
        address _baseTokenAddress,
        uint256 _baseTokenId,
        uint256 _tokenId,
        bytes12 _hashSeed
    ) external {
        // CHECKS
        require(
            msg.sender == hashSeedSetterContract,
            "Only hashSeedSetterContract"
        );
        uint256 projectId = _tokenId / ONE_MILLION;
        require(
            !baseTokenToUsedOnProject[_baseTokenAddress][_baseTokenId][
                projectId
            ],
            "Token already used on project"
        );
        // EFFECTS
        polyptychHashSeeds[_tokenId] = _hashSeed;
        baseTokenToUsedOnProject[_baseTokenAddress][_baseTokenId][
            projectId
        ] = true;
    }

    // When `genArt721Core` calls this, it can be assured that the randomizer
    // will set a bytes32 hash for tokenId `_tokenId` on the core contract.
    function assignTokenHash(uint256 _tokenId) external virtual {
        require(msg.sender == address(genArt721Core), "Only core may call");

        if (projectIsPolyptych[_tokenId / ONE_MILLION]) {
            bytes32 seededHash = polyptychHashSeeds[_tokenId];
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
