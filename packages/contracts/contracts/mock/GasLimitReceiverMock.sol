// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.17;

/**
 * @notice This uses all gas when receiving Ether, useful when testing denial
 * of service attacks.
 * @dev Mock contract for testing purposes.
 */
contract GasLimitReceiverMock {
    string public a = "a string in storage.";

    receive() external payable {
        // infinite loop to burn all available gas
        while (true) {
            a = string.concat(a, " A longer string in storage to burn gas.");
        }
    }
}
