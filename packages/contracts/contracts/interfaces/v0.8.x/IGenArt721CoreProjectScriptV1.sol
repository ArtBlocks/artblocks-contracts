// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.0;

/**
 * @dev This interface is implemented by GenArt721CoreV3 and above
 */
interface IGenArt721CoreProjectScriptV1 {
    function projectScriptDetails(
        uint256 _projectId
    )
        external
        view
        returns (
            string memory scriptTypeAndVersion,
            string memory aspectRatio,
            uint256 scriptCount
        );

    function projectScriptBytecodeAddressByIndex(
        uint256 _projectId,
        uint256 _index
    ) external view returns (address);
}
