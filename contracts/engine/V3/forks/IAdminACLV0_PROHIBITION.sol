// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import "../../../interfaces/0.8.x/IAdminACLV0.sol";

interface IAdminACLV0_PROHIBITION is IAdminACLV0 {
    /**
     * @notice Emitted when function caller is updated.
     * @param contractAddress Contract that the selector caller is being set for.
     * @param selector Selector of the function we're giving the privilege to call.
     * @param caller Caller address that is allowed to call the function.
     */
    event ApprovedCallerUpdated(
        address indexed contractAddress,
        address indexed selector,
        address indexed caller
    );

    /**
     * @notice Retrieve the address of the caller that is allowed to call a contract's function
     */
    function getApprovedCaller(
        address _contract,
        bytes4 _selector
    ) external view returns (address);

    /**
     * @notice Allows superAdmin to set a contract function caller.
     * @dev this function is gated to only superAdmin address.
     */
    function updateApprovedCaller(
        address _contract,
        bytes4 _selector,
        address _caller
    ) external;
}
