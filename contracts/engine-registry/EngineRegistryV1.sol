// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "../interfaces/0.8.x/IEngineRegistryV1.sol";
import "@openzeppelin-4.7/contracts/access/Ownable.sol";
import "@openzeppelin-4.7/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title Engine Registry contract, V1.
 * @author Art Blocks Inc.
 * @notice Privileged Roles and Ownership:
 * This contract has a single owner, and is intended to be deployed with a
 * permissioned owner that has elevated privileges on this contract.
 * If in the future multiple deployer addresses are needed to interact with
 * this registry, a new registry version with more complex logic should be
 * implemented and deployed to replace this.
 * Note that this contract is intended to be able to act as a registry of
 * contracts that may be configure with a minter filter contract.
 *
 * This contract may register Flagship, and/or Engine core contracts.
 *
 * This contract is designed to be managed by an owner with privileged roles
 * and abilities.
 * ----------------------------------------------------------------------------
 * The following function is restricted to the contract owner sending, or the
 * contract being registered during a transaction originating from the
 * owner:
 * - registerContract
 * ----------------------------------------------------------------------------
 * The following function is restricted to the contract owner sending, or the
 * the contract being unregistered:
 * - unregisterContract
 * ----------------------------------------------------------------------------
 * The following functions are restricted to the contract owner:
 * - registerContracts
 * - unregisterContracts
 * - Ownable: transferOwnership
 * - Ownable: renounceOwnership
 */
contract EngineRegistryV1 is Ownable, IEngineRegistryV1 {
    using EnumerableSet for EnumerableSet.AddressSet;

    /// private enumerable set of registered contracts
    EnumerableSet.AddressSet private registeredContracts;

    constructor() Ownable() {}

    /**
     * @notice Register a contract and emit a `ContractRegistered` event with
     * the provided information. Only callable by the owner or the contract
     * being registered, and only if tx.origin == owner.
     * Reverts if authorization fails, or if the contract is already
     * registered.
     */
    function registerContract(
        address _contractAddress,
        bytes32 _coreVersion,
        bytes32 _coreType
    ) external {
        // CHECKS
        // Validate against `tx.origin` rather than `msg.sender` as it is intended that this registration be
        // performed in an automated fashion *at the time* of contract deployment for the `_contractAddress`.
        require(tx.origin == owner(), "Only tx origin of owner");
        // Prevent registration of a contract by an unrelated contract
        require(
            msg.sender == _contractAddress || msg.sender == owner(),
            "Only calls by owner or contract"
        );
        // EFFECTS
        _registerContract(_contractAddress, _coreVersion, _coreType);
    }

    /**
     * @notice Unregister a contract and emit a `ContractUnregistered` event.
     * Only callable by the owner or this contract or the contract being
     * unregistered.
     * Reverts if authorization fails, or if the contract is not already
     * registered.
     */
    function unregisterContract(address _contractAddress) external {
        // CHECKS
        // Prevent unregistration of a contract by an unrelated contract
        require(
            msg.sender == _contractAddress || msg.sender == owner(),
            "Only calls by owner or contract"
        );
        // EFFECTS
        _unregisterContract(_contractAddress);
    }

    /**
     * @notice Register multiple contracts at once.
     * Only callable by the owner.
     * Reverts if any contract is already registered.
     * @dev This should primarily be used for backfilling the registry with
     * existing contracts shortly after deployment.
     * @param _contractAddresses Array of contract addresses to register.
     * @param _coreVersions Array of core versions for each contract (aligned).
     * @param _coreTypes Array of core types for each contract (aligned).
     */
    function registerContracts(
        address[] calldata _contractAddresses,
        bytes32[] calldata _coreVersions,
        bytes32[] calldata _coreTypes
    ) external onlyOwner {
        uint256 numContracts = _contractAddresses.length;
        require(
            numContracts == _coreVersions.length &&
                numContracts == _coreTypes.length,
            "Mismatched array lengths"
        );
        for (uint256 i = 0; i < numContracts; ) {
            _registerContract(
                _contractAddresses[i],
                _coreVersions[i],
                _coreTypes[i]
            );
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Unregister multiple contracts at once.
     * Only callable by the owner.
     * Reverts if any contract is not already registered.
     * @param _contractAddresses Array of contract addresses to unregister.
     */
    function unregisterContracts(
        address[] calldata _contractAddresses
    ) external onlyOwner {
        uint256 numContracts = _contractAddresses.length;
        for (uint256 i = 0; i < numContracts; ) {
            _unregisterContract(_contractAddresses[i]);
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Get the number of registered contracts.
     * @return The number of registered contracts.
     */
    function getNumRegisteredContracts() external view returns (uint256) {
        return registeredContracts.length();
    }

    /**
     * @notice Get the address of a registered contract by index.
     * @param _index The index of the contract to get.
     * @return The address of the contract at the given index.
     */
    function getRegisteredContractAt(
        uint256 _index
    ) external view returns (address) {
        return registeredContracts.at(_index);
    }

    /**
     * @notice Returns boolean representing if contract is registered on this
     * registry.
     * @param _contractAddress The address of the contract to check.
     * @return isRegistered True if the contract is registered.
     */
    function isRegisteredContract(
        address _contractAddress
    ) external view returns (bool isRegistered) {
        return registeredContracts.contains(_contractAddress);
    }

    /**
     * @notice Internal function to register a contract.
     * Reverts if the contract is already registered.
     */
    function _registerContract(
        address _contractAddress,
        bytes32 _coreVersion,
        bytes32 _coreType
    ) internal {
        // @dev add returns true only if not already registered
        require(
            registeredContracts.add(_contractAddress),
            "Only register new contracts"
        );
        emit ContractRegistered(_contractAddress, _coreVersion, _coreType);
    }

    /**
     * @notice Internal function to unregister a contract.
     * Reverts if the contract is not already registered.
     */
    function _unregisterContract(address _contractAddress) internal {
        // @dev remove returns true only if already in set
        require(
            registeredContracts.remove(_contractAddress),
            "Only registered contracts"
        );
        emit ContractUnregistered(_contractAddress);
    }
}
