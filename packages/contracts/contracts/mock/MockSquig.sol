// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

interface IGenArt721V0_Minimal {
    function showTokenHashes(
        uint256 _tokenId
    ) external view returns (bytes32[] memory);

    function ownerOf(uint256 _tokenId) external view returns (address);
}

/**
 * @title MockSquig
 * @author Art Blocks Inc.
 * @notice TESTNET ONLY - NO PERMS - FOR INTEGRATION TESTING ONLY
 * This contract is a mock implementation of a subset of the squiggle GenArt V0 contract logic.
 * It is used to test the LiftHooks contract.
 * Token's don't actually exist, but functions used for hook integration are implemented.
 */
contract MockSquig is IGenArt721V0_Minimal {
    address public constant DEFAULT_OWNER =
        0x2A98FCD155c9Da4A28BdB32acc935836C233882A;
    bytes32 public constant DEFAULT_TOKEN_HASH =
        0x56461a01b69faeffeaa342cd081d753c0b98f9863f60600541a391a093a17275;
    uint256 public constant MAX_TOKEN_ID = 9999;
    mapping(uint256 => bytes32) internal _tokenHashes;
    mapping(uint256 => address) internal _owners;

    function setTokenHash(uint256 _tokenId, bytes32 _tokenHash) external {
        _tokenHashes[_tokenId] = _tokenHash;
    }

    function setOwner(uint256 _tokenId, address _owner) external {
        _owners[_tokenId] = _owner;
    }

    function showTokenHashes(
        uint256 _tokenId
    ) external view returns (bytes32[] memory) {
        if (_tokenId > MAX_TOKEN_ID) {
            return new bytes32[](0);
        }

        // return the token hash if it exists, otherwise return the default token hash
        bytes32 tokenHash = _tokenHashes[_tokenId];
        bytes32[] memory tokenHashes = new bytes32[](1);
        if (tokenHash == bytes32(0)) {
            tokenHashes[0] = DEFAULT_TOKEN_HASH;
        } else {
            tokenHashes[0] = tokenHash;
        }

        return tokenHashes;
    }

    function ownerOf(uint256 _tokenId) external view returns (address) {
        if (_tokenId > MAX_TOKEN_ID) {
            revert("Token ID out of bounds");
        }
        address owner = _owners[_tokenId];
        // default to default owner if not set
        if (owner == address(0)) {
            return DEFAULT_OWNER;
        }
        return owner;
    }
}
