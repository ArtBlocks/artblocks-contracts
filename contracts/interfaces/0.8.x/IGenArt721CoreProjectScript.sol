pragma solidity 0.8.17;

interface IGenArt721CoreProjectScript {
    function projectScriptByIndex(
        uint256 _projectId,
        uint256 _index
    ) external view returns (string memory);

    function projectScriptInfo(
        uint256 _projectId
    ) external view returns (string memory scriptJSON, uint256 scriptCount);
}
