// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.17;

interface IGenArt721CoreTokenHashProviderV1 {
    function tokenIdToHash(uint256 tokenId) external view returns (bytes32);
}
