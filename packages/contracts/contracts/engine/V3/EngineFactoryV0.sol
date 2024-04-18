// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
pragma solidity 0.8.22;

import {IGenArt721CoreContractV3_Engine, EngineConfiguration} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Engine.sol";
import {IEngineFactoryV0} from "../../interfaces/v0.8.x/IEngineFactoryV0.sol";

import {Clones} from "@openzeppelin-5.0/contracts/proxy/Clones.sol";

/**
 * @title EngineFactoryV0
 * @author Art Blocks Inc.
 * @notice Factory contract for creating new Engine and Engine Flex Core contracts.
 * @dev This contract is deployed once, and then used to create new Engine and Engine
 * Flex Core contracts. The contract may be abandoned once it is no longer needed.
 * Once abandoned, the contract can no longer be used to create new Engine and Engine
 * Flex Core contracts.
 * The contract is initialized with a required contract type.
 * All splits must include the required split address and basis points.
 * The contract is initialized with an implementation contract, which is cloned
 * when creating new Engine and Engine Flex Core contracts.
*/
contract EngineFactoryV0 {
  // public type
  bytes32 public constant type_ = "EngineFactoryV0";

  /**
    * The implementation contract that is cloned when creating new Engine
    * contracts.
  */
  address public immutable engineImplementation;
  /**
    * The implementation contract that is cloned when creating new Engine
    * Flex contracts.
  */
  address public immutable engineFlexImplementation;
  
  // deployer of the contract is the only one who may abandon the contract
  address public immutable deployer;

  /**
    * Indicates whether the contract is abandoned.
    * Once abandoned, the contract can no longer be used to create new Engine
    * and Engine Flex contracts.
  */
  bool public isAbandoned; // default false

  /**
    * @notice validates and assigns immutable configuration variables
    * @param engineImplementation_ address of the Engine
    * implementation contract
    * @param engineFlexImplementation_ address of the Engine Flex
    * implementation contract
    */
  constructor(
    address engineImplementation_,
    address engineFlexImplementation_
  ) {
    deployer = msg.sender;
    // emit event
    emit Deployed({
      engineImplementation: engineImplementation_,
      engineFlexImplementation: engineFlexImplementation_,
      type_: type_
    });
  }

  /**
  * @notice Creates a new Engine or Engine Flex contract with the provided
  * `engineConfiguration`, depending on the `engineCoreType`.
  * @param engineConfiguration EngineConfiguration data to configure the
  * contract with.
  * @return engineContract The address of the newly created Engine or Engine Flex
  * contract. The address is also emitted in both the `EngineCreated` and
  * `EngineFlexCreated` events.
  */
  function createEngineContract(
    IEngineFactoryV0.EngineCoreType engineCoreType,
    EngineConfiguration calldata engineConfiguration
  ) external returns (address engineContract) {
    require(!isAbandoned, "factory is abandoned");
    // TODO: validate the args are present? maybe it will fail without them?
    if (engineCoreType == IEngineFactoryV0.EngineCoreType.Engine) {
      // Create the EIP 1167 Engine contract
      engineContract = Clones.clone({implementation: engineImplementation});
      // initialize the new Engine contract
      // IGenArt721CoreContractV3_Engine(engineContract).initialize(engineConfiguration);
      emit EngineContractCreated(engineContract);
    } else if (engineCoreType == IEngineFactoryV0.EngineCoreType.EngineFlex) {
      // Create the EIP 1167 Engine Flex contract
      engineContract = Clones.clone({implementation: engineFlexImplementation});
      // initialize the new Engine contract
      // IGenArt721CoreContractV3_Engine(engineContract).initialize(engineConfiguration);
      // emit event
      emit EngineFlexContractCreated(engineContract);
    } else {
      return;
    }
  }

  /**
  * @notice Abandons the contract, preventing it from being used to create
  * new Engine and Engine Flex contracts.
  * Only callable by the deployer, and only once; reverts otherwise.
  */
  function abandon() external {
      require(!isAbandoned, "factory is abandoned");
      require(msg.sender == deployer, "only deployer may abandon");
      // set isAbandoned to true
      isAbandoned = true;
      // emit event
      emit Abandoned();
  }
}
