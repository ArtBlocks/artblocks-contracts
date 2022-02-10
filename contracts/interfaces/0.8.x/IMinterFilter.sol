// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "./IGenArt721CoreContractV3.sol";

pragma solidity ^0.8.0;

interface IMinterFilter {
    /**
     * @notice Approved minter `_minterAddress`.
     */
    event MinterApproved(
        address indexed _minterAddress,
        string indexed _minterType
    );

    /**
     * @notice Revoked approval for minter `_minterAddress`
     */
    event MinterRevoked(address indexed _minterAddress);

    /**
     * @notice Minter `_minterAddress` of type `_minterType`
     * registered for project `_projectId`.
     */
    event ProjectMinterRegistered(
        uint256 indexed _projectId,
        address indexed _minterAddress,
        string indexed _minterType
    );

    /**
     * @notice Any active minter removed for project `_projectId`.
     */
    event ProjectMinterRemoved(uint256 indexed _projectId);

    function genArtCoreContract() external returns (IGenArt721CoreContractV3);

    function setMinterForProject(uint256, address) external;

    function removeMinterForProject(uint256) external;

    function mint(
        address _to,
        uint256 _projectId,
        address sender
    ) external returns (uint256);

    function getMinterForProject(uint256) external view returns (address);

    function projectHasMinter(uint256) external view returns (bool);
}
