// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../interfaces/0.8.x/IAdminACLV0.sol";

/**
 * @dev Mock contract for testing purposes.
 * This contract always returns true for all ACL checks.
 * It also emits an event for all ACL checks, allowing our test suite to verify
 * that the ACL was checked with the correct parameters.
 */
contract MockAdminACLV0EventsTrue is IAdminACLV0 {
    // event used for testing purposes to diagnose what core contract is asking
    // approval for.
    event ACLCheck(address indexed sender, bytes4 indexed selector);

    string public AdminACLType = "MockAdminACLV0EventsTrue";

    /**
     * @dev Returns true for all ACL checks.
     * Also emits event for testing purposes.
     */
    function allowed(
        address, /*_sender*/
        bytes4 /*_selector*/
    ) external pure returns (bool) {
        return true;
    }
}
