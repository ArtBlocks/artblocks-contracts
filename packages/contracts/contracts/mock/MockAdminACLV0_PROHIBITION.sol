// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "../engine/V3/forks/PROHIBITION/interfaces/IAdminACLV0_PROHIBITION.sol";
import "../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
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
contract MockAdminACLV0Events_PROHIBITION is IAdminACLV0_PROHIBITION, ERC165 {
    // event used for testing purposes to diagnose what core contract is asking
    // approval for.
    event ACLCheck(address indexed sender, bytes4 indexed selector);

    string public AdminACLType = "MockAdminACLV0Events_PROHIBITION";

    // superAdmin is the only address that passes any and all ACL checks
    address public superAdmin;

    /// approvedCallers is a mapping of keccak256(contracts,  selectors, account) -> approved to call.
    /// It is used to determine if an account is approved to call a function on specific contracts.
    mapping(bytes32 => bool) public contractSelectorApprovals;
    /// contractArtistApprovals is a mapping of:
    ///   keccak256(contracts, artist) -> approved to call.
    /// It is used to determine if an account is approved to call a functions for specific projects.
    mapping(bytes32 => bool) public contractArtistApprovals;

    constructor() {
        superAdmin = msg.sender;
    }

    /**
     * @dev Retrieve the address of the caller that is allowed to call a contract's function
     */
    function getContractSelectorApproval(
        address _contract,
        bytes4 _selector,
        address _caller
    ) external view returns (bool) {
        return
            contractSelectorApprovals[
                hashSelectorApprovalKey(_contract, _selector, _caller)
            ];
    }

    /**
     * @dev Retrieve whether of the caller is allowed to call a functions for a project
     */
    function getContractArtistApproval(
        address _contract,
        address _caller
    ) external view returns (bool) {
        return
            contractArtistApprovals[hashArtistApprovalKey(_contract, _caller)];
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
     * @dev Allows superAdmin to set a contract function caller.
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
            "Only superAdmin or allowed caller"
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
     * @dev Toggles verification for artists to call functions relating to their projects on a contract
     */
    function toggleContractArtistApproval(
        address _contract,
        address _artist
    ) external {
        require(
            allowed(
                msg.sender,
                address(this),
                this.toggleContractArtistApproval.selector
            ),
            "Only allowed caller"
        );

        bytes32 approvalHash = hashArtistApprovalKey(_contract, _artist);
        contractSelectorApprovals[approvalHash] = !contractSelectorApprovals[
            approvalHash
        ];
        emit ContractArtistApprovalUpdated(
            _contract,
            _artist,
            contractArtistApprovals[approvalHash]
        );
    }

    /**
     * @dev Checks if sender `_sender` is allowed to call function with selector
     * `_selector` on contract `_contract`. Returns true if sender is superAdmin.
     * Also emits event for testing purposes.
     */
    function allowed(
        address _sender,
        address _contract,
        bytes4 _selector
    ) public returns (bool) {
        emit ACLCheck(_sender, _selector);
        return
            superAdmin == _sender ||
            contractSelectorApprovals[
                hashSelectorApprovalKey(_contract, _selector, _sender)
            ];
    }

    /**
     * @dev Checks if sender `_sender` is allowed to call function (or functions for projects) with
     * method `_selector` on `_contract`. Returns true if sender is superAdmin.
     * @dev this function is public insteaad of internal so that the right to toggle approvals can also be delegated
     */
    function allowed(
        address _sender,
        address _contract,
        bytes4 _selector,
        uint256 _projectId
    ) external returns (bool) {
        emit ACLCheck(_sender, _selector);
        IGenArt721CoreContractV3_Base coreV3 = IGenArt721CoreContractV3_Base(
            _contract
        );
        return
            allowed(_sender, _contract, _selector) ||
            (contractArtistApprovals[
                hashArtistApprovalKey(_contract, _sender)
            ] && coreV3.projectIdToArtistAddress(_projectId) == _sender);
    }

    /**
     * @dev Hash the contract address, selector, and caller address.
     */
    function hashSelectorApprovalKey(
        address _contract,
        bytes4 _selector,
        address _caller
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_contract, _selector, _caller));
    }

    /**
     * @dev Hash the contract address and artist address.
     */
    function hashArtistApprovalKey(
        address _contract,
        address _artist
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_contract, _artist));
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
     * @dev Allows superAdmin to call renounceOwnership on other contract from
     * this contract.
     */
    function renounceOwnershipOn(address _contract) external {
        require(msg.sender == superAdmin, "Only superAdmin");
        Ownable(_contract).renounceOwnership();
    }
}
