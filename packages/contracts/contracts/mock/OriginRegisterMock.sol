// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {ICoreRegistryV1} from "../interfaces/0.8.x/ICoreRegistryV1.sol";

/**
 * @dev Mock contract for testing purposes.
 * This contract hijacks a tx with origin of a core registry's owner, and
 * attempts to register a contract with the registry.
 * Note that mock could forward on additional requests to contracts that only
 * register "themselves", and could be successfully registered.
 */
contract OriginRegisterMock {
    function registerOther(
        address _registry,
        address _contract,
        bytes32 _coreVersion,
        bytes32 _coreType
    ) external {
        ICoreRegistryV1(_registry).registerContract(
            _contract,
            _coreVersion,
            _coreType
        );
    }
}
