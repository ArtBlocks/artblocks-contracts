// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

import "./IGenArt721CoreContract.sol";

pragma solidity ^0.5.0;

interface IMinterFilter {
    event MinterApproved(
        address indexed _minterAddress,
        string indexed _minterType
    );

    event MinterRevoked(address indexed _minterAddress);

    event DefaultMinterRegistered(address indexed _minterAddress);

    event ProjectMinterRegistered(
        uint256 indexed _projectId,
        address indexed _minterAddress,
        string indexed _minterType
    );

    function genArtCoreContract() external returns (IGenArt721CoreContract);

    function setMinterForProject(uint256, address) external;

    function setDefaultMinter(address) external;

    function resetMinterForProjectToDefault(uint256) external;

    function mint(
        address _to,
        uint256 _projectId,
        address sender
    ) external returns (uint256);

    function getMinterForProject(uint256) external view returns (address);

    function projectHasMinter(uint256) external view returns (bool);
}
