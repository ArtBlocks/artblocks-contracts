pragma solidity ^0.5.0;

interface IRandomizer {
    function returnValue() external view returns (bytes32);
}
