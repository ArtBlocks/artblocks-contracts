// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.22;

import {RelayExecutor} from "../relay/RelayExecutor.sol";
import {RelayExecutorPartialReverts} from "../relay/RelayExecutorPartialReverts.sol";

/// @dev Helper that wraps RelayExecutor so tests can invoke execute() as
///      msg.sender == address(this), mimicking the EIP-7702 delegation model
///      where the EOA calls its own delegated code.
contract RelayExecutorTestHelper is RelayExecutor {
    /// @dev Calls execute on this contract from itself so that
    ///      msg.sender == address(this) and the base ERC7821 auth passes.
    function selfExecute(bytes32 mode, bytes calldata executionData) external {
        this.execute(mode, executionData);
    }
}

/// @dev Simple target contract for testing batch calls.
contract MockTarget {
    uint256 public value;
    address public lastCaller;

    event Called(uint256 val);

    function setValue(uint256 val) external payable {
        value = val;
        lastCaller = msg.sender;
        emit Called(val);
    }

    function alwaysReverts() external pure {
        revert("MockTarget: forced revert");
    }

    receive() external payable {}
}

/// @dev Helper that wraps RelayExecutorPartialReverts so tests can invoke
///      execute() as msg.sender == address(this).
contract RelayExecutorPartialRevertsTestHelper is RelayExecutorPartialReverts {
    function selfExecute(bytes32 mode, bytes calldata executionData) external {
        this.execute(mode, executionData);
    }
}
