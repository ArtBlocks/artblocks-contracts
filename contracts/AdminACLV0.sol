// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./interfaces/0.8.x/IAdminACLV0.sol";
import "@openzeppelin-4.7/contracts/access/Ownable.sol";

/**
 * This contract has a single superAdmin that passes all ACL checks. All checks
 * for any other address will return false.
 */
contract AdminACLV0 is IAdminACLV0 {
    string public AdminACLType = "AdminACLV0";

    // superAdmin is the only address that passes any and all ACL checks
    address public superAdmin;

    constructor() {
        superAdmin = msg.sender;
    }

    /**
     * @dev Allows superAdmin to call transferOwnership on other contract from
     * this contract.
     */
    function changeSuperAdmin(address _newSuperAdmin) external {
        require(msg.sender == superAdmin, "Only superAdmin");
        superAdmin = _newSuperAdmin;
    }

    /**
     * @dev Allows superAdmin to call transferOwnership on other contract from
     * this contract.
     */
    function transferOwnershipOn(address _contract, address _newOwner)
        external
    {
        require(msg.sender == superAdmin, "Only superAdmin");
        Ownable(_contract).transferOwnership(_newOwner);
    }

    /**
     * @dev Allows superAdmin to call renounceOwnership on other contract from
     * this contract.
     */
    function renounceOwnershipOn(address _contract) external {
        require(msg.sender == superAdmin, "Only superAdmin");
        Ownable(_contract).renounceOwnership();
    }

    /**
     * @dev Returns true if `_sender` is `superAdmin` for all ACL checks.
     */
    function allowed(
        address _sender,
        address, /*_contract*/
        bytes4 /*_selector*/
    ) external view returns (bool) {
        return superAdmin == _sender;
    }
}
