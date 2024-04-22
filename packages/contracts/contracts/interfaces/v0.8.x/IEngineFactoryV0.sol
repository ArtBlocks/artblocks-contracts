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
     * @notice New Engine contract was created.
     * @param engineContract address of the newly created Engine contract
     */
    event EngineContractCreated(address indexed engineContract);
    /**
     * @notice New Engine Flex contract was created.
     * @param engineFlexContract address of the newly created Engine Flex contract
     */
    event EngineFlexContractCreated(address indexed engineFlexContract);
    /**
     * @notice This contract was abandoned and no longer can be used to create
     * new Engine or Engine Flex contracts.
     */
    event Abandoned();

    /**
     * @notice Creates a new Engine or Engine Flex contract with the provided
     * `engineConfiguration`, depending on the `engineCoreType`.
     * @param engineCoreType Type of Engine Core contract.
     * @param engineConfiguration EngineConfiguration data to configure the
     * contract with.
     * @param adminACLContract Address of admin access control contract, to be
     * set as contract owner. A new contract will be deployed if address is null.
     * @return engineContract The address of the newly created Engine or Engine Flex
     * contract. The address is also emitted in both the `EngineCreated` and
     * `EngineFlexCreated` events.
     */
    function createEngineContract(
        EngineCoreType engineCoreType,
        EngineConfiguration calldata engineConfiguration,
        address adminACLContract
    ) external returns (address engineContract);

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
     * @notice The deployer of the contract.
     */
    function deployer() external view returns (address);

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
