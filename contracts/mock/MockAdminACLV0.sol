// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../interfaces/0.8.x/IAdminACLV0.sol";

contract MockAdminACLV0 is IAdminACLV0 {
    string public AdminACLType = "MockAdminACLV0";

    // Dummy implementation that always returns true
    function allowed(
        address, /*_sender*/
        bytes4 /*_selector*/
    ) external pure returns (bool) {
        return true;
    }
}
