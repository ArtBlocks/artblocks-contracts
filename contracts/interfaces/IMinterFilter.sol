pragma solidity ^0.5.0;

interface IMinterFilter {
    function setMinterForProject(uint256, address)
        external;

    function setDefaultMinter(address) external;

    function resetMinterForProjectToDefault(uint256) external;

    function mint(
        address _to,
        uint256 _projectId,
        address sender
    ) external returns (uint256);
}
