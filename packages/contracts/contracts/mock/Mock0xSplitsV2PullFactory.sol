// SPDX-License-Identifier: MIT

pragma solidity 0.8.22;

import "../interfaces/v0.8.x/integration-refs/splits-0x-v2/ISplitFactoryV2.sol";
import {Mock0xSplitsV2Splitter} from "./Mock0xSplitsV2Splitter.sol";

import {Create2} from "@openzeppelin-5.0/contracts/utils/Create2.sol";

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
     * For testing purposes only.
     * @dev This function is not implemented exactly like 0xSplits V2 factory, but is
     * sufficient for testing purposes.
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
        require(_creator != address(0), "Invalid creator");
        // deploy + initialize
        address newSplitter = Create2.deploy({
            amount: 0,
            salt: _getFakeMockHash(_splitParams, _owner, _salt),
            bytecode: type(Mock0xSplitsV2Splitter).creationCode
        });
        Mock0xSplitsV2Splitter(newSplitter).initialize(_splitParams, _owner);
        return newSplitter;
    }

    /**
     * @notice Predict the address of a new split and check if it is deployed.
     * For testing purposes only, namely, this function is not equivalent to the
     * implementation shipped for 0xSplits V2, and is only for testing purposes.
     * @param _splitParams Params to create split with.
     * @param _owner Owner of created split.
     * @param _salt Salt for create2.
     */
    function isDeployed(
        Split calldata _splitParams,
        address _owner,
        bytes32 _salt
    ) external view returns (address split, bool exists) {
        address predictedSplitter = Create2.computeAddress({
            salt: _getFakeMockHash(_splitParams, _owner, _salt),
            bytecodeHash: keccak256(type(Mock0xSplitsV2Splitter).creationCode)
        });
        return (predictedSplitter, predictedSplitter.code.length > 0);
    }

    // this gets a fack hash with all split and owner params for testing purposes,
    // and does not match 0xSplits implementation
    function _getFakeMockHash(
        Split memory splitParams,
        address owner,
        bytes32 salt
    ) private pure returns (bytes32) {
        return keccak256(abi.encode(splitParams, owner, salt));
    }
}
