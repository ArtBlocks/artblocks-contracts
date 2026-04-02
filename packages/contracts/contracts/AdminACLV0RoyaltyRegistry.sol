// SPDX-License-Identifier: MIT

pragma solidity 0.8.22;

import "./interfaces/v0.8.x/IAdminACLV0.sol";
import {IAdminACLV0_Extended} from "./interfaces/v0.8.x/IAdminACLV0_Extended.sol";
import "@openzeppelin-4.7/contracts/access/Ownable.sol";
import "@openzeppelin-4.7/contracts/utils/introspection/ERC165.sol";

interface IRoyaltyRegistry {
    function setRoyaltyLookupAddress(
        address tokenAddress,
        address royaltyLookupAddress
    ) external returns (bool);
}

/**
 * @title Admin ACL contract, V0, with Royalty Registry support.
 * @author Art Blocks Inc.
 * @notice Privileged Roles and Ownership:
 * This contract has a single superAdmin that passes all ACL checks. All checks
 * for any other address will return false.
 * The superAdmin can be changed by the current superAdmin.
 * Extends AdminACLV0 with a single additional function to call
 * setRoyaltyLookupAddress on a Royalty Registry contract. This is needed
 * because V3 core contracts return this AdminACL as admin(), and the
 * Royalty Registry's overrideAllowed check requires msg.sender == admin().
 * Care must be taken to ensure that the admin ACL contract is secure behind a
 * multi-sig or other secure access control mechanism.
 */
contract AdminACLV0RoyaltyRegistry is
    IAdminACLV0,
    IAdminACLV0_Extended,
    ERC165
{
    string public AdminACLType = "AdminACLV0RoyaltyRegistry";

    /// superAdmin is the only address that passes any and all ACL checks
    address public superAdmin;

    constructor(address superAdmin_) {
        superAdmin = superAdmin_;
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
     * Calls transferOwnership on other contract from this contract.
     * This is useful for updating to a new AdminACL contract.
     * @dev this function is gated to only superAdmin address.
     * @dev This implementation requires that the new AdminACL contract
     * broadcasts support of IAdminACLV0 via ERC165 interface detection.
     */
    function transferOwnershipOn(
        address _contract,
        address _newAdminACL
    ) external {
        require(msg.sender == superAdmin, "Only superAdmin");
        require(
            ERC165(_newAdminACL).supportsInterface(
                type(IAdminACLV0).interfaceId
            ),
            "AdminACLV0RoyaltyRegistry: new admin ACL does not support IAdminACLV0"
        );
        Ownable(_contract).transferOwnership(_newAdminACL);
    }

    /**
     * @notice Calls renounceOwnership on other contract from this contract.
     * @dev this function is gated to only superAdmin address.
     */
    function renounceOwnershipOn(address _contract) external {
        require(msg.sender == superAdmin, "Only superAdmin");
        Ownable(_contract).renounceOwnership();
    }

    /**
     * @notice Checks if sender `_sender` is allowed to call function with selector
     * `_selector` on contract `_contract`. Returns true if sender is superAdmin.
     */
    function allowed(
        address _sender,
        address /*_contract*/,
        bytes4 /*_selector*/
    ) external view returns (bool) {
        return superAdmin == _sender;
    }

    /**
     * @notice Calls setRoyaltyLookupAddress on a Royalty Registry contract.
     * This is necessary because V3 core contracts return this AdminACL's
     * address from admin(), and the Royalty Registry requires
     * msg.sender == admin() for override authorization.
     * @param _royaltyRegistry Address of the Royalty Registry contract.
     * @param _tokenAddress Core contract address to configure.
     * @param _royaltyLookupAddress Override address for royalty lookups
     * (typically a royalty override shim). Set to address(0) to clear.
     * @dev this function is gated to only superAdmin address.
     */
    function setRoyaltyLookupAddressOn(
        address _royaltyRegistry,
        address _tokenAddress,
        address _royaltyLookupAddress
    ) external {
        require(msg.sender == superAdmin, "Only superAdmin");
        IRoyaltyRegistry(_royaltyRegistry).setRoyaltyLookupAddress(
            _tokenAddress,
            _royaltyLookupAddress
        );
    }

    /**
     * @inheritdoc ERC165
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165) returns (bool) {
        return
            interfaceId == type(IAdminACLV0).interfaceId ||
            interfaceId == type(IAdminACLV0_Extended).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
