pragma solidity ^0.5.0;

interface IFilteredMinter {
  function purchase(uint256 _projectId)
      external
      payable
      returns (uint256 tokenId);
}
