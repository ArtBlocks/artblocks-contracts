// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {SplitFundsLib} from "../libs/v0.8.x/minter-libs/SplitFundsLib.sol";

/**
 * @dev Mock contract for testing purposes.
 * This contract exposes a payable function that force-sends ETH to a target
 * address.
 */
contract ForceSendMock {
    // @dev forwards msg.value to target address
    function forceSendETH(address target) external payable {
        SplitFundsLib.forceSafeTransferETH({
            to: target,
            amount: msg.value,
            // induce force-send by having a low gas limit
            minterRefundGasLimit: 1_000
        });
    }
}
