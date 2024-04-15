// SPDX-License-Identifier: MIT

pragma solidity 0.8.22;

import "../interfaces/v0.8.x/integration-refs/splits-0x-v2/ISplitFactoryV2.sol";

/**
 * @dev Mock contract for testing purposes.
 * This contract implements a mock version of the splitter factory deployed
 * by 0xSplits V2.
 * Behaviors are not exactly the same as the production version of the contract
 * and are implemented for integration and testing purposes.
 */
contract Mock0xSplitsV2PullFactory is ISplitFactoryV2 {
    /**
     * @notice Create a new split with params and owner.
     * @param _splitParams Params to create split with.
     * @param _owner Owner of created split.
     * @param _creator Creator of created split.
     * @param _salt Salt for create2.
     * @return split Address of the created split.
     */
    function createSplitDeterministic(
        Split calldata _splitParams,
        address _owner,
        address _creator,
        bytes32 _salt
    ) external returns (address split) {
        // TODO: Implement this function
        return address(0);
    }

    /**
     * @notice Predict the address of a new split and check if it is deployed.
     * @param _splitParams Params to create split with.
     * @param _owner Owner of created split.
     * @param _salt Salt for create2.
     */
    function isDeployed(
        Split calldata _splitParams,
        address _owner,
        bytes32 _salt
    ) external view returns (address split, bool exists) {
        // TODO: Implement this function
        return (address(0), false);
    }
}
