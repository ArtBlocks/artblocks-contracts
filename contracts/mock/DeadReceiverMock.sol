// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.17;

/**
 * @notice This reverts when receiving Ether
 * @dev Mock contract for testing purposes.
 */
contract DeadReceiverMock {
    receive() external payable {
        revert("DeadReceiverMock: I am dead");
    }
}
