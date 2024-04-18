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
     * new split atomic contracts.
     */
    event Abandoned();

    /**
     * @notice Initializes the Engine or Engine Flex contract with the provided
     * `engineConfiguration` data.
     * Only callable once.
     * @param splits Splits to configure the contract with. Must add up to
     * 10_000 BPS.
     * @return splitAtomic The address of the newly created split atomic
     * contract
     */
    function createEngineContract(
        EngineCoreType engineCoreType,
        EngineConfiguration calldata engineConfiguration
    ) external returns (address splitAtomic);

    /**
     * @notice The implementation contract that is cloned when creating new
     * split atomic contracts.
     */
    function splitAtomicImplementation() external view returns (address);

    /**
     * @notice The address that must be included in all splits.
     */
    function requiredSplitAddress() external view returns (address);

    /**
     * @notice The basis points that must be included in all splits, for the
     * required split address.
     */
    function requiredSplitBasisPoints() external view returns (uint16);

    /**
     * @notice The deployer of the contract.
     */
    function deployer() external view returns (address);

    /**
     * @notice Indicates whether the contract is abandoned.
     * Once abandoned, the contract can no longer be used to create new split
     * atomic contracts.
     * @return bool True if the contract is abandoned, false otherwise.
     */
    function isAbandoned() external view returns (bool);

    /**
     * @notice Indicates the type of the contract, e.g. `SplitAtomicFactoryV0`.
     * @return type_ The type of the contract.
     */
    function type_() external pure returns (bytes32);
}
