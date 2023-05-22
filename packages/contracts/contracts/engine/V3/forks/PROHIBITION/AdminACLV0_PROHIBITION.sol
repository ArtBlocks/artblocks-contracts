// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "./interfaces/IAdminACLV0_PROHIBITION.sol";
import "../../../../interfaces/0.8.x/IGenArt721CoreContractV3_Base.sol";

import "@openzeppelin-4.7/contracts/access/Ownable.sol";
import "@openzeppelin-4.7/contracts/utils/introspection/ERC165.sol";

/**
 * @title Admin ACL contract, V0.
 * @author Art Blocks Inc.
 * @notice Privileged Roles and Ownership:
 * This contract has a single superAdmin that passes all ACL checks. All checks
 * for any other address will return false.
 * The superAdmin can be changed by the current superAdmin.
 * Care must be taken to ensure that the admin ACL contract is secure behind a
 * multi-sig or other secure access control mechanism.
 */
contract AdminACLV0_PROHIBITION is IAdminACLV0_PROHIBITION, ERC165 {
    string public AdminACLType = "AdminACLV0_PROHIBITION";

    /// superAdmin is the only address that passes any and all ACL checks
    address public superAdmin;

    /// contractSelectorApprovals is a mapping of:
    ///   keccak256(contracts, selectors, account) -> approved to call.
    /// It is used to determine if an account is approved to call a function on specific contracts.
    mapping(bytes32 => bool) contractSelectorApprovals;

    /// contractArtistApprovals is a mapping of:
    ///   keccak256(contracts, artist) -> approved to call.
    /// It is used to determine if an account is approved to call a functions for specific projects.
    mapping(bytes32 => bool) contractArtistApprovals;

    constructor() {
        superAdmin = msg.sender;
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
     * @param _contract The contract address.
     * @param _newAdminACL The new AdminACL contract address.
     * @dev This function is gated to only superAdmin address.
     * @dev This implementation requires that the new AdminACL contract
     * broadcasts support of IAdminACLV0 via ERC165 interface detection.
     */
    function transferOwnershipOn(
        address _contract,
        address _newAdminACL
    ) external {
        require(msg.sender == superAdmin, "Only superAdmin");
        // ensure new AdminACL contract supports IAdminACLV0
        require(
            ERC165(_newAdminACL).supportsInterface(
                type(IAdminACLV0).interfaceId
            ),
            "AdminACLV0: new admin ACL does not support IAdminACLV0"
        );
        Ownable(_contract).transferOwnership(_newAdminACL);
    }

    /**
     * @notice Calls renounceOwnership on other contract from this contract.
     * @param _contract The contract address.
     * @dev this function is gated to only superAdmin address.
     */
    function renounceOwnershipOn(address _contract) external {
        require(msg.sender == superAdmin, "Only superAdmin");
        Ownable(_contract).renounceOwnership();
    }

    /**
     * @notice Retrieve the address of the caller that is allowed to call a contract's function
     * @param _contract The contract address.
     * @param _selector The function selector.
     * @param _caller The caller address.
     * @return isApproved The approval status.
     */
    function getContractSelectorApproval(
        address _contract,
        bytes4 _selector,
        address _caller
    ) public view returns (bool) {
        return
            contractSelectorApprovals[
                hashSelectorApprovalKey(_contract, _selector, _caller)
            ];
    }

    /**
     * @notice Retrieve whether of the caller is allowed to call a functions for a project
     * @param _contract The contract address.
     * @param _caller The caller address.
     * @return isApproved The approval status.
     */
    function getContractArtistApproval(
        address _contract,
        address _caller
    ) public view returns (bool) {
        return
            contractArtistApprovals[hashArtistApprovalKey(_contract, _caller)];
    }

    /**
     * @notice Toggles ability for caller to call specific function on a contract
     * @param _contract The contract address.
     * @param _selector The function selector.
     * @param _caller The caller address.
     * @dev this function is gated to only allwed addressed.
     */
    function toggleContractSelectorApproval(
        address _contract,
        bytes4 _selector,
        address _caller
    ) external {
        require(
            allowed(
                msg.sender,
                address(this),
                this.toggleContractSelectorApproval.selector
            ),
            "Only allowed caller"
        );

        bytes32 approvalHash = hashSelectorApprovalKey(
            _contract,
            _selector,
            _caller
        );
        contractSelectorApprovals[approvalHash] = !contractSelectorApprovals[
            approvalHash
        ];
        emit ContractSelectorApprovalUpdated(
            _contract,
            _selector,
            _caller,
            contractSelectorApprovals[approvalHash]
        );
    }

    /**
     * @notice Toggles verification for artists to call functions relating to their projects
     * on a contract
     * @param _contract The contract address.
     * @param _caller The caller address.
     * @dev this function is gated to only allwed addressed.
     */
    function toggleContractArtistApproval(
        address _contract,
        address _caller
    ) external {
        require(
            allowed(
                msg.sender,
                address(this),
                this.toggleContractArtistApproval.selector
            ),
            "Only allowed caller"
        );

        bytes32 approvalHash = hashArtistApprovalKey(_contract, _caller);
        contractArtistApprovals[approvalHash] = !contractArtistApprovals[
            approvalHash
        ];
        emit ContractArtistApprovalUpdated(
            _contract,
            _caller,
            contractArtistApprovals[approvalHash]
        );
    }

    /**
     * @notice Checks if sender `_sender` is allowed to call function with method
     * `_selector` on `_contract`. Returns true if sender is superAdmin.
     * @param _sender The sender address.
     * @param _contract The contract address.
     * @param _selector The function selector.
     * @return isApproved The approval status.
     * @dev this function is public insteaad of internal so that the right to toggle approvals
     * can also be delegated
     */
    function allowed(
        address _sender,
        address _contract,
        bytes4 _selector
    ) public view returns (bool) {
        return
            superAdmin == _sender ||
            getContractSelectorApproval(_contract, _selector, _sender);
    }

    /**
     * @notice Checks if sender `_sender` is allowed to call function (or functions) for projects
     * `projectId` with method `_selector` on `_contract`. Returns true if sender is superAdmin.
     * @param _sender The sender address.
     * @param _contract The contract address.
     * @param _selector The function selector.
     * @param _projectId The project ID.
     * @return isApproved The approval status.
     * @dev this function is public insteaad of internal so that the right to toggle approvals
     * can also be delegated
     */
    function allowed(
        address _sender,
        address _contract,
        bytes4 _selector,
        uint256 _projectId
    ) external view returns (bool) {
        IGenArt721CoreContractV3_Base coreV3 = IGenArt721CoreContractV3_Base(
            _contract
        );
        return
            allowed(_sender, _contract, _selector) ||
            (getContractArtistApproval(_contract, _sender) &&
                coreV3.projectIdToArtistAddress(_projectId) == _sender);
    }

    /**
     * @notice Hash the contract address, selector, and caller address.
     * @param _contract The contract address.
     * @param _selector The function selector.
     * @param _caller The caller address.
     * @return hash The hash.
     */
    function hashSelectorApprovalKey(
        address _contract,
        bytes4 _selector,
        address _caller
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_contract, _selector, _caller));
    }

    /**
     * @notice Hash the contract address and artist address.
     * @param _contract The contract address.
     * @param _caller The artist address.
     * @return hash The hash.
     */
    function hashArtistApprovalKey(
        address _contract,
        address _caller
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_contract, _caller));
    }

    /**
     * @inheritdoc ERC165
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165) returns (bool) {
        return
            interfaceId == type(IAdminACLV0_PROHIBITION).interfaceId ||
            interfaceId == type(IAdminACLV0).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
