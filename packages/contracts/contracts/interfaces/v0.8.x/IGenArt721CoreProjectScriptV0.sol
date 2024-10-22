// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.0;

/**
 * @dev This interface is implemented by GenArt721CoreV0, GenArt721CoreV1, and GenArt721CoreV2
 */
interface IGenArt721CoreProjectScriptV0 {
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
