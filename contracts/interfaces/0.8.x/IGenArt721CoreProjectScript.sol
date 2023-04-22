// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.17;

interface IGenArt721CoreProjectScript {
    function projectScriptByIndex(
        uint256 _projectId,
        uint256 _index
    ) external view returns (string memory);

    /**
     * @dev the return specified here is common across all
     * pre-v3 core contracts. They all return additional
     * data as well that varies between contracts but is not
     * used by the dependency registry.
     */
    function projectScriptInfo(
        uint256 _projectId
    ) external view returns (string memory scriptJSON, uint256 scriptCount);
}
