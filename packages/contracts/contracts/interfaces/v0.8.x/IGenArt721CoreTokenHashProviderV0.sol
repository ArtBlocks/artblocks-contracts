// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.0;

/**
 * @dev This interface is implemented by the GenArt721 (GenArt721CoreV0)
 */
interface IGenArt721CoreTokenHashProviderV0 {
    function showTokenHashes(
        uint256 _tokenId
    ) external view returns (bytes32[] memory);
}
