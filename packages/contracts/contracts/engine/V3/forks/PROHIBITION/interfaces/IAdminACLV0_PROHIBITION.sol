// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import "../../../../../interfaces/0.8.x/IAdminACLV0.sol";

interface IAdminACLV0_PROHIBITION is IAdminACLV0 {
    /**
     * @notice Emitted when function caller is updated.
     * @param contractAddress Contract that the selector caller is being set for.
     * @param selector Selector of the function we're giving the privilege to call.
     * @param caller Caller address that is allowed to call the function.
     * @param approved Boolean value indicating if the caller is approved or not.
     */
    event ContractSelectorApprovalUpdated(
        address indexed contractAddress,
        bytes4 indexed selector,
        address indexed caller,
        bool approved
    );

    /**
     * @notice Emitted when verified artist is updated.
     * @param contractAddress Contract that the selector caller is being set for.
     * @param caller Address of the artist.
     * @param approved Boolean value indicating if the caller is approved or not.
     */
    event ContractArtistApprovalUpdated(
        address indexed contractAddress,
        address indexed caller,
        bool approved
    );

    /**
     * @notice Retrieve whether of the caller is allowed to call a contract's function
     * @param _contract The contract address.
     * @param _selector The function selector.
     * @param _caller The caller address.
     * @return isApproved The approval status.
     */
    function getContractSelectorApproval(
        address _contract,
        bytes4 _selector,
        address _caller
    ) external view returns (bool);

    /**
     * @notice Retrieve whether of the caller is allowed to call a functions for a project
     * @param _contract The contract address.
     * @param _caller The caller address.
     * @return isApproved The approval status.
     */
    function getContractArtistApproval(
        address _contract,
        address _caller
    ) external view returns (bool);

    /**
     * @notice Allowed caller can to set a contract function caller.
     * @param _contract The contract address.
     * @param _selector The function selector.
     * @param _caller The caller address.
     * @dev this function is gated to only superAdmin address or allowed caller.
     */
    function toggleContractSelectorApproval(
        address _contract,
        bytes4 _selector,
        address _caller
    ) external;

    /**
     * @notice Toggles verification for artists to call functions relating to their projects on a contract
     * @param _contract The contract address.
     * @param _caller The caller address.
     * @dev this function is gated to only allwed addressed.
     */
    function toggleContractArtistApproval(
        address _contract,
        address _caller
    ) external;

    /**
     * @notice Checks if sender `_sender` is allowed to call function (or functions for projects) with
     * method `_selector` on `_contract`. Returns true if sender is superAdmin.
     * @param _sender The sender address.
     * @param _contract The contract address.
     * @param _selector The function selector.
     * @param _projectId The project ID.
     * @return isApproved The approval status.
     * @dev this function is public insteaad of internal so that the right to toggle approvals can also be delegated
     */
    function allowed(
        address _sender,
        address _contract,
        bytes4 _selector,
        uint256 _projectId
    ) external returns (bool);

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
    ) external pure returns (bytes32);

    /**
     * @notice Hash the contract address and artist address.
     * @param _contract The contract address.
     * @param _caller The artist address.
     * @return hash The hash.
     */
    function hashArtistApprovalKey(
        address _contract,
        address _caller
    ) external pure returns (bytes32);
}
