pragma solidity 0.8.17;

interface IGenArt721CoreTokenHashProviderV0 {
    function showTokenHashes(
        uint256 _tokenId
    ) external view returns (bytes32[] memory);
}
