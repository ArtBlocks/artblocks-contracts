// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {EngineConfiguration} from "./IGenArt721CoreContractV3_Engine.sol";

interface IEngineFactoryV0 {
    /// @notice Engine Core type
    enum EngineCoreType {
        Engine, // GenArt721CoreV3_Engine Contract
        EngineFlex // GenArt721CoreV3_Engine_Flex Contract
    }
    /**
     * @notice This contract was deployed.
     * @param engineImplementation address with the implementation of the Engine contract
     * @param engineFlexImplementation address with the implementation of the Engine Flex contract
     * @param type_ type of this contract
     */
    event Deployed(
        address indexed engineImplementation,
        address indexed engineFlexImplementation,
        bytes32 indexed type_
    );
    /**
     * @notice New Engine or Engine Flex contract was created.
     * @param engineContract address of the newly created Engine contract
     */
    event EngineContractCreated(address indexed engineContract);
    /**
     * @notice This contract was abandoned and no longer can be used to create
     * new Engine or Engine Flex contracts.
     */
    event Abandoned();
    /**
     * @notice The default base URI host was updated.
     * @param defaultBaseURIHost new default base URI host
     */
    event DefaultBaseURIHostUpdated(string defaultBaseURIHost);

    /**
     * @notice Creates a new Engine or Engine Flex contract with the provided
     * `engineConfiguration`, depending on the `engineCoreContractType`.
     * @param engineCoreContractType Type of Engine Core contract.
     * @param engineConfiguration EngineConfiguration data to configure the
     * contract with.
     * @param adminACLContract Address of admin access control contract, to be
     * set as contract owner. A new contract will be deployed if address is null.
     * @param salt Salt used to deterministically deploy the clone.
     * @return engineContract The address of the newly created Engine or Engine Flex
     * contract. The address is also emitted in both the `EngineCreated` and
     * `EngineFlexCreated` events.
     */
    function createEngineContract(
        EngineCoreType engineCoreContractType,
        EngineConfiguration calldata engineConfiguration,
        address adminACLContract,
        bytes32 salt
    ) external returns (address engineContract);

    /**
     * @notice Drains the contract's balance to the `recipient`.
     * @param recipient The address to send funds to.
     * Only callable by the owner.
     */
    function drainETH(address payable recipient) external;

    /**
     * @notice Drains the contract's balance of an input ERC20 token to
     * the `recipient`.
     * @param ERC20TokenAddress The address of the ERC20 token to withdraw.
     * @param recipient The address to send ERC20 tokens to.
     * Only callable by the owner.
     */
    function drainERC20(address ERC20TokenAddress, address recipient) external;

    /**
     * @notice Updates the default base URI host used when initializing new
     * Engine contracts.
     * Only callable by the owner.
     * @param _defaultBaseURIHost New default base URI host.
     */
    function updateDefaultBaseURIHost(
        string memory _defaultBaseURIHost
    ) external;

    /**
     * @notice Calls transferOwnership on the core registry.
     * Useful for updating the owner of the core registry contract.
     * @param _owner address of the new owner
     */
    function transferCoreRegistryOwnership(address _owner) external;

    /**
     * @notice Registers multiple contracts with the core registry.
     * @param contractAddresses An array of contract addresses to register.
     * @param coreVersions An array of versions corresponding to the contract addresses.
     * @param coreTypes An array of types corresponding to the contract addresses.
     */
    function registerMultipleContracts(
        address[] calldata contractAddresses,
        bytes32[] calldata coreVersions,
        bytes32[] calldata coreTypes
    ) external;

    /**
     * @notice Unregisters multiple contracts from the core registry.
     * @param contractAddresses An array of contract addresses to unregister.
     */
    function unregisterMultipleContracts(
        address[] calldata contractAddresses
    ) external;

    /**
     * @notice The implementation contract that is cloned when creating new
     * Engine Core contracts.
     */
    function engineImplementation() external view returns (address);

    /**
     * @notice The implementation contract that is cloned when creating new
     * Engine Flex Core contracts.
     */
    function engineFlexImplementation() external view returns (address);

    /**
     * @notice Indicates whether the contract is abandoned.
     * Once abandoned, the contract can no longer be used to create new Engine
     * or Engine Flex contracts.
     * @return bool True if the contract is abandoned, false otherwise.
     */
    function isAbandoned() external view returns (bool);

    /**
     * @notice Indicates the type of the contract, e.g. `EngineFactoryV0`.
     * @return type_ The type of the contract.
     */
    function type_() external pure returns (bytes32);
}
