pragma solidity ^0.5.0;

interface IMinterFilter {
    function setOwnerAddress(address payable _ownerAddress) external;

    function setMinterForProject(uint256 _projectId, address _minterAddress)
        external;

    function disableMinterForProject(uint256 _projectId) external;

    function mint(
        address _to,
        uint256 _projectId,
        address sender
    ) external returns (uint256);
}
