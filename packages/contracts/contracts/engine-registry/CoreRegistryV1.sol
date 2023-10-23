// SPDX-License-Identifier: MIT

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
pragma solidity 0.8.19;

import {ICoreRegistryV1} from "../interfaces/v0.8.x/ICoreRegistryV1.sol";

import {Ownable} from "@openzeppelin-4.7/contracts/access/Ownable.sol";
import {EnumerableSet} from "@openzeppelin-4.7/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title Art Blocks Core Contract Registry, V1.
 * @author Art Blocks Inc.
 * @notice Privileged Roles and Ownership:
 * This contract has a single owner, and is intended to be deployed with a
 * permissioned owner that has elevated privileges on this contract.
 * If in the future multiple deployer addresses are needed to interact with
 * this registry, a new registry version with more complex logic should be
 * implemented and deployed to replace this.
 *
 * This contract builds on the EngineRegistryV0 contract, but encompases more
 * than just Engine contracts. It is updated to be named CoreRegistry, and is
 * V1 because it is the next iteration of the V0 Engine Registry.
 *
 * This contract is intended to be able to act as a registry of all core
 * contracts that are allowed to interact with a specific MinterFilter V2.
 * This includes, but is not limited to:
 * - Flagship contracts
 * - Collaboration contracts
 * - Engine contracts
 * - Engine Flex contracts
 *
 * Note that not all contracts will be registered in this registry, as some
 * contracts may not need to interact with a MinterFilterV2 contract. For
 * example, the original Art Blocks V0 contract does not need to interact with
 * a MinterFilterV2 contract, as it uses a different minting mechanism.
 *
 * A view function is provided to determine if a contract is registered.
 *
 * This contract is designed to be managed by an owner with privileged roles
 * and abilities.
 * ----------------------------------------------------------------------------
 * The following function is restricted to the engine registry owner sending,
 * or the core contract being registered during a transaction originating from
 * the engine registry owner:
 * - registerContract
 * ----------------------------------------------------------------------------
 * The following functions are restricted to the engine registry owner sending:
 * - unregisterContract
 * - registerContracts
 * - unregisterContracts
 * - Ownable: transferOwnership
 * - Ownable: renounceOwnership
 * ----------------------------------------------------------------------------
 * Additional privileged roles may be described on minters, registries, and
 * other contracts that may interact with this contract.
 */
contract CoreRegistryV1 is Ownable, ICoreRegistryV1 {
    using EnumerableSet for EnumerableSet.AddressSet;

    /// private enumerable set of registered contracts
    EnumerableSet.AddressSet private _registeredContracts;

    /// private mapping of registered contract addresses to
    EnumerableSet.AddressSet
        private _registeredMinterFilterV2CompatibleContracts;

    constructor() Ownable() {}

    /**
     * @notice Register a contract and emit a `ContractRegistered` event with
     * the provided information. Only callable by the owner or the contract
     * being registered, and only if tx.origin == owner.
     * Reverts if authorization fails, or if the contract is already
     * registered.
     */
    function registerContract(
        address contractAddress,
        bytes32 coreVersion,
        bytes32 coreType
    ) external {
        // CHECKS
        // revert if not called by owner
        Ownable._checkOwner();
        // EFFECTS
        _registerContract(contractAddress, coreVersion, coreType);
    }

    /**
     * @notice Unregister a contract and emit a `ContractUnregistered` event.
     * Only callable by the owner of this registry contract.
     * Reverts if authorization fails, or if the contract is not already
     * registered.
     */
    function unregisterContract(address contractAddress) external {
        // CHECKS
        // revert if not called by owner
        Ownable._checkOwner();
        // EFFECTS
        _unregisterContract(contractAddress);
    }

    /**
     * @notice Register multiple contracts at once.
     * Only callable by the owner.
     * Reverts if any contract is already registered.
     * @dev This should primarily be used for backfilling the registry with
     * existing contracts shortly after deployment.
     * @param contractAddresses Array of contract addresses to register.
     * @param coreVersions Array of core versions for each contract (aligned).
     * @param coreTypes Array of core types for each contract (aligned).
     */
    function registerContracts(
        address[] calldata contractAddresses,
        bytes32[] calldata coreVersions,
        bytes32[] calldata coreTypes
    ) external {
        // CHECKS
        // revert if not called by owner
        Ownable._checkOwner();
        // validate same length arrays
        uint256 numContracts = contractAddresses.length;
        require(
            numContracts == coreVersions.length &&
                numContracts == coreTypes.length,
            "Mismatched array lengths"
        );
        // EFFECTS
        for (uint256 i = 0; i < numContracts; ) {
            _registerContract(
                contractAddresses[i],
                coreVersions[i],
                coreTypes[i]
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
     * @param contractAddresses Array of contract addresses to unregister.
     */
    function unregisterContracts(
        address[] calldata contractAddresses
    ) external {
        // CHECKS
        // revert if not called by owner
        Ownable._checkOwner();
        // EFFECTS
        uint256 numContracts = contractAddresses.length;
        for (uint256 i = 0; i < numContracts; ) {
            _unregisterContract(contractAddresses[i]);
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
        return _registeredContracts.length();
    }

    /**
     * @notice Get the address of a registered contract by index.
     * @param index The index of the contract to get.
     * @return The address of the contract at the given index.
     */
    function getRegisteredContractAt(
        uint256 index
    ) external view returns (address) {
        return _registeredContracts.at(index);
    }

    /**
     * @notice Gets an array of all registered contract addresses.
     * Warning: Unbounded gas limit. This function is gas intensive and should
     * only be used for off-chain analysis. Please use
     * `getNumRegisteredContracts` and `getRegisteredContractAt` for bounded
     * gas usage.
     */
    function getAllRegisteredContracts()
        external
        view
        returns (address[] memory)
    {
        return _registeredContracts.values();
    }

    /**
     * @notice Returns boolean representing if contract is registered on this
     * registry.
     * @param contractAddress The address of the contract to check.
     * @return isRegistered True if the contract is registered.
     */
    function isRegisteredContract(
        address contractAddress
    ) external view returns (bool isRegistered) {
        return _registeredContracts.contains(contractAddress);
    }

    /**
     * @notice Internal function to register a contract.
     * Reverts if the contract is already registered.
     */
    function _registerContract(
        address contractAddress,
        bytes32 coreVersion,
        bytes32 coreType
    ) internal {
        // @dev add returns true only if not already registered
        require(
            _registeredContracts.add(contractAddress),
            "Contract already registered"
        );
        emit ContractRegistered(contractAddress, coreVersion, coreType);
    }

    /**
     * @notice Internal function to unregister a contract.
     * Reverts if the contract is not already registered.
     */
    function _unregisterContract(address contractAddress) internal {
        // @dev remove returns true only if already in set
        require(
            _registeredContracts.remove(contractAddress),
            "Only registered contracts"
        );
        emit ContractUnregistered(contractAddress);
    }
}
