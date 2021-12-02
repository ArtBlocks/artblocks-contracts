pragma solidity ^0.5.0;

interface IMinterFilter {
    event MinterApproved(address indexed _minterAddress);

    event MinterRevoked(address indexed _minterAddress);

    event DefaultMinterRegistered(address indexed _minterAddress);

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
