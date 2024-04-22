// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
pragma solidity 0.8.19;

import {AdminACLV0} from "../../AdminACLV0.sol";
import {IGenArt721CoreContractV3_Engine, EngineConfiguration} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Engine.sol";
import {ICoreRegistryV1} from "../../interfaces/v0.8.x/ICoreRegistryV1.sol";
import {IEngineFactoryV0} from "../../interfaces/v0.8.x/IEngineFactoryV0.sol";

import "@openzeppelin-4.7/contracts/access/Ownable.sol";
import {Clones} from "@openzeppelin-4.7/contracts/proxy/Clones.sol";
import {IERC20} from "@openzeppelin-4.7/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin-4.7/contracts/token/ERC20/utils/SafeERC20.sol";
import {Create2} from "@openzeppelin-4.7/contracts/utils/Create2.sol";

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
contract EngineFactoryV0 is Ownable, IEngineFactoryV0 {
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

    // Address of core registry contract.
    address public immutable coreRegistry;

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
     * @param coreRegistry_ address of the core registry contract
     */
    constructor(
        address engineImplementation_,
        address engineFlexImplementation_,
        address coreRegistry_
    ) Ownable() {
        coreRegistry = coreRegistry_;
        engineFlexImplementation = engineFlexImplementation_;
        engineImplementation = engineImplementation_;
        deployer = msg.sender;
        // set owner of core registry contract
        Ownable(coreRegistry_).transferOwnership(address(this));
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
        IEngineFactoryV0.EngineCoreType engineCoreType,
        EngineConfiguration calldata engineConfiguration,
        address adminACLContract
    ) external onlyOwner returns (address engineContract) {
        require(!isAbandoned, "factory is abandoned");
        // TODO: engine configuration validation here?
        if (adminACLContract == address(0)) {
            // deploy new AdminACLV0 contract
            adminACLContract = Create2.deploy({
                amount: 0,
                salt: blockhash(block.number - 1),
                bytecode: type(AdminACLV0).creationCode
            });
        }

        if (engineCoreType == IEngineFactoryV0.EngineCoreType.Engine) {
            // Create the EIP 1167 Engine contract
            engineContract = Clones.clone({
                implementation: engineImplementation
            });
            // initialize the new Engine contract
            IGenArt721CoreContractV3_Engine(engineContract).initialize(
                engineConfiguration,
                adminACLContract
            );
            bytes32 coreType = IGenArt721CoreContractV3_Engine(engineContract)
                .CORE_TYPE();
            bytes32 coreVersion = IGenArt721CoreContractV3_Engine(
                engineContract
            ).CORE_VERSION();
            // register the new Engine contract
            ICoreRegistryV1(coreRegistry).registerContract(
                engineContract,
                bytes32(coreVersion),
                bytes32(coreType)
            );
            emit EngineContractCreated(engineContract);
        } else {
            // Create the EIP 1167 Engine Flex contract
            engineContract = Clones.clone({
                implementation: engineFlexImplementation
            });
            // initialize the new Engine contract
            IGenArt721CoreContractV3_Engine(engineContract).initialize(
                engineConfiguration,
                adminACLContract
            );
            // register the new Engine contract
            bytes32 coreType = IGenArt721CoreContractV3_Engine(engineContract)
                .CORE_TYPE();
            bytes32 coreVersion = IGenArt721CoreContractV3_Engine(
                engineContract
            ).CORE_VERSION();
            ICoreRegistryV1(coreRegistry).registerContract(
                engineContract,
                bytes32(coreVersion),
                bytes32(coreType)
            );
            // emit event
            emit EngineFlexContractCreated(engineContract);
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

    /**
     * @notice Drains the contract's balance to the `recipient`.
     * @param recipient The address to send funds to.
     * Only callable by the owner.
     */
    function drainETH(address payable recipient) external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = recipient.call{value: balance}("");
            require(success, "Payment failed");
        }
    }

    /**
     * @notice Drains the contract's balance of an input ERC20 token to
     * the `recipient`.
     * @param ERC20TokenAddress The address of the ERC20 token to withdraw.
     * @param recipient The address to send ERC20 tokens to.
     * Only callable by the owner.
     */
    function drainERC20(
        address ERC20TokenAddress,
        address recipient
    ) external onlyOwner {
        IERC20 token = IERC20(ERC20TokenAddress);
        uint256 balance = token.balanceOf(address(this));
        if (balance > 0) {
            SafeERC20.safeTransfer({
                token: token,
                to: recipient,
                value: balance
            });
        }
    }
}
