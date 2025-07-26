// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

interface IRelic {
    // Query the inscription list by address; returning true/false for whether that address has inscribed,
    // and the number of squiggles under ownership (directly or through delegation)
    function inscriptionByAddress(
        address a
    ) external view returns (bool inscribed, uint256 squiggle_count);
}

/**
 * @title MockRelic
 * @author Art Blocks Inc.
 * @notice TESTNET ONLY - NO PERMS - FOR INTEGRATION TESTING ONLY
 * This contract is a mock implementation of a subset of the Relic contract logic.
 * It is used to test the LiftHooks contract.
 */
contract MockRelic is IRelic {
    mapping(address => bool) internal _inscription;
    mapping(address => uint256) internal _squiggleCount;

    function setInscriptionTrue(address a) external {
        _inscription[a] = true;
    }

    function setInscriptionFalse(address a) external {
        _inscription[a] = false;
    }

    function setSquiggleCount(address a, uint256 count) external {
        _squiggleCount[a] = count;
    }

    function inscriptionByAddress(
        address a
    ) external view returns (bool inscribed, uint256 squiggle_count) {
        return (_inscription[a], _squiggleCount[a]);
    }
}
