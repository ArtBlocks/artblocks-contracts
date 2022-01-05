// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

interface IMinterFilter {
    /**
     * @notice Approved minter `_minterAddress`.
     */
    event MinterApproved(address indexed _minterAddress);

    /**
     * @notice Revoked approval for minter `_minterAddress`
     */
    event MinterRevoked(address indexed _minterAddress);

    /**
     * @notice Minter `_minterAddress` registered as default minter.
     */
    event DefaultMinterRegistered(address indexed _minterAddress);

    /**
     * @notice Minter `_minterAddress` registered for project
     * `_projectId`.
     */
    event ProjectMinterRegistered(
        uint256 indexed _projectId,
        address indexed _minterAddress
    );

    function setMinterForProject(uint256, address) external;

    function setDefaultMinter(address) external;

    function resetMinterForProjectToDefault(uint256) external;

    function mint(
        address _to,
        uint256 _projectId,
        address sender
    ) external returns (uint256);
}
