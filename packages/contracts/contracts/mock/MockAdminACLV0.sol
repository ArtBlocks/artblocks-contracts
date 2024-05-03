// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "../interfaces/v0.8.x/IAdminACLV0.sol";
import "@openzeppelin-4.7/contracts/access/Ownable.sol";
import "@openzeppelin-4.7/contracts/utils/introspection/ERC165.sol";

/**
 * @dev Mock contract for testing purposes.
 * This contract has a single superAdmin that passes all ACL checks. All checks
 * for any other address will return false.
 * It also emits an event for all ACL checks, enabling our test suite to verify
 * that the ACL was checked with the correct parameters.
 * @dev this contract specifically does not broadcast conformance to IAdminACLV0
 * for testing purposes.
 */
contract MockAdminACLV0Events is IAdminACLV0, ERC165 {
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
    function allowed(
        address _sender,
        address /*_contract*/,
        bytes4 _selector
    ) external returns (bool) {
        emit ACLCheck(_sender, _selector);
        return superAdmin == _sender;
    }

    /**
     * @dev Allows superAdmin to call transferOwnership on other contract from
     * this contract.
     */
    function transferOwnershipOn(
        address _contract,
        address _newAdminACL
    ) external {
        require(msg.sender == superAdmin, "Only superAdmin");
        Ownable(_contract).transferOwnership(_newAdminACL);
    }

    /**
     * @notice Allows superAdmin change the superAdmin address.
     * @param _newSuperAdmin The new superAdmin address.
     * @param _genArt721CoreAddressesToUpdate Array of genArt721Core
     * addresses to update to the new superAdmin, for indexing purposes only.
     * @dev this function is gated to only superAdmin address.
     */
    function changeSuperAdmin(
        address _newSuperAdmin,
        address[] calldata _genArt721CoreAddressesToUpdate
    ) external {
        require(msg.sender == superAdmin, "Only superAdmin");
        address previousSuperAdmin = superAdmin;
        superAdmin = _newSuperAdmin;
        emit SuperAdminTransferred(
            previousSuperAdmin,
            _newSuperAdmin,
            _genArt721CoreAddressesToUpdate
        );
    }

    /**
     * @dev Allows superAdmin to call renounceOwnership on other contract from
     * this contract.
     */
    function renounceOwnershipOn(address _contract) external {
        require(msg.sender == superAdmin, "Only superAdmin");
        Ownable(_contract).renounceOwnership();
    }
}
