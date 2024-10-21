// SPDX-License-Identifier: MIT

pragma solidity 0.8.22;

import "../interfaces/v0.8.x/integration-refs/splits-0x-v2/ISplitFactoryV2.sol";

/**
 * @dev Mock contract for testing purposes.
 * This contract implements a mock version of a splitter deployed
 * by 0xSplits V2.
 * Behaviors are not the same as the production version of the contract
 * and are implemented for integration and testing purposes.
 * Notably, this contract is not actually a splitter, but more of an introspection
 * contract for testing purposes.
 */
contract Mock0xSplitsV2Splitter {
    ISplitFactoryV2.Split private _splitParams;
    address private _owner;
    bool private _isInitialized;

    function initialize(
        ISplitFactoryV2.Split memory splitParams,
        address owner
    ) external {
        _splitParams = splitParams;
        _owner = owner;
        _isInitialized = true;
    }

    function getSplitParams()
        external
        view
        returns (ISplitFactoryV2.Split memory)
    {
        _onlyInitialized();
        return _splitParams;
    }

    function getOwner() external view returns (address) {
        _onlyInitialized();
        return _owner;
    }

    function _onlyInitialized() private view {
        require(_isInitialized, "Splitter not initialized");
    }
}
