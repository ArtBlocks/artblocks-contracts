// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

interface IAdminACLV0 {
    // Type of the Admin ACL contract of the form "AdminACLV0"
    function AdminACLType() external view returns (string memory);

    // Checks if sender is allowed to call function with selector `_selector`
    function allowed(address _sender, bytes4 _selector) external returns (bool);
}
