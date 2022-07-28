// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../interfaces/0.8.x/IAdminACLV0.sol";

/**
 * @dev Mock contract for testing purposes.
 * This contract has a single superAdmin that passes all ACL checks. All checks
 * for any other address will return false.
 * It also emits an event for all ACL checks, enabling our test suite to verify
 * that the ACL was checked with the correct parameters.
 */
contract MockAdminACLV0Events is IAdminACLV0 {
    // event used for testing purposes to diagnose what core contract is asking
    // approval for.
    event ACLCheck(address indexed sender, bytes4 indexed selector);

    string public AdminACLType = "MockAdminACLV0Events";

    // superAdmin is the only address that passes any and all ACL checks
    address public superAdmin;

    constructor() {
        superAdmin = msg.sender;
    }

    /**
     * @dev Returns true for all ACL checks.
     * Also emits event for testing purposes.
     */
    function allowed(address _sender, bytes4 _selector)
        external
        returns (bool)
    {
        emit ACLCheck(_sender, _selector);
        return superAdmin == _sender;
    }
}
