// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
pragma solidity 0.8.22;

import {AdminACLV0} from "../../AdminACLV0.sol";
import {IGenArt721CoreContractV3_Engine, EngineConfiguration} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Engine.sol";
import {ICoreRegistryV1} from "../../interfaces/v0.8.x/ICoreRegistryV1.sol";
import {IEngineFactoryV0} from "../../interfaces/v0.8.x/IEngineFactoryV0.sol";
import {IAdminACLV0_Extended} from "../../interfaces/v0.8.x/IAdminACLV0_Extended.sol";

import "@openzeppelin-5.0/contracts/access/Ownable.sol";
import {Clones} from "@openzeppelin-5.0/contracts/proxy/Clones.sol";
import {IERC20} from "@openzeppelin-5.0/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin-5.0/contracts/token/ERC20/utils/SafeERC20.sol";
import {Create2} from "@openzeppelin-5.0/contracts/utils/Create2.sol";

/**
 * @title EngineFactoryV0
 * @author Art Blocks Inc.
 * @notice Factory contract for creating new Engine and Engine Flex Core contracts.
 * @dev This contract is deployed once, and then used to create new Engine and Engine
 * Flex Core contracts. The contract may be abandoned once it is no longer needed.
 * Once abandoned, the contract can no longer be used to create new Engine and Engine
 * Flex Core contracts.
 * The contract is initialized with a required contract type.
 * The contract is initialized with an Engine and Engine Flex implementation contract, which is cloned
 * when creating new Engine and Engine Flex Core contracts.
 */
contract EngineFactoryV0 is Ownable, IEngineFactoryV0 {
    // public type
    bytes32 public constant type_ = "EngineFactoryV0";

    // base URI host for all Engine contracts on this network/chainID
    string public defaultBaseURIHost;

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

    /// version and type of Engine implementation contract
    string public engineCoreType;
    string public engineCoreVersion;

    /// version and type of Engine Flex implementation contract
    string public flexCoreType;
    string public flexCoreVersion;

    /**
     * Indicates whether the contract is abandoned.
     * Once abandoned, the contract can no longer be used to create new Engine
     * and Engine Flex contracts.
     */
    bool public isAbandoned; // default false

    /// Universal Bytecode Storage Reader contract address, which all core contracts are initialized to use
    address public immutable universalBytecodeStorageReader;

    // pseudorandom salt nonce to prevent collisions for multiple contract deployments in single block
    uint256 private _pseudorandomSaltNonce;

    /**
     * Represents a generic call operation.
     */
    struct Call {
        address to;
        bytes data;
    }

    /**
     * @notice validates and assigns immutable configuration variables and
     * sets state variables
     * @param engineImplementation_ address of the Engine
     * implementation contract
     * @param engineFlexImplementation_ address of the Engine Flex
     * implementation contract
     * @param coreRegistry_ address of the core registry contract
     * @param owner_ address of the initial owner
     * @param defaultBaseURIHost_ default base URI prefix for all Engine contracts,
     * e.g. "https://token.artblocks.io/1/" for mainnet, "https://token.artblocks.io/42161/" for arbitrum, etc.
     * @param universalBytecodeStorageReader_ address of the UniversalBytecodeStorageReader contract
     */
    constructor(
        address engineImplementation_,
        address engineFlexImplementation_,
        address coreRegistry_,
        address owner_,
        string memory defaultBaseURIHost_,
        address universalBytecodeStorageReader_
    ) Ownable(owner_) {
        _onlyNonZeroAddress(engineImplementation_);
        _onlyNonZeroAddress(engineFlexImplementation_);
        _onlyNonZeroAddress(coreRegistry_);
        _onlyNonZeroAddress(owner_);

        defaultBaseURIHost = defaultBaseURIHost_;

        engineImplementation = engineImplementation_;
        engineFlexImplementation = engineFlexImplementation_;
        coreRegistry = coreRegistry_;

        engineCoreType = IGenArt721CoreContractV3_Engine(engineImplementation)
            .coreType();
        engineCoreVersion = IGenArt721CoreContractV3_Engine(
            engineImplementation
        ).coreVersion();
        flexCoreType = IGenArt721CoreContractV3_Engine(engineFlexImplementation)
            .coreType();
        flexCoreVersion = IGenArt721CoreContractV3_Engine(
            engineFlexImplementation
        ).coreVersion();

        universalBytecodeStorageReader = universalBytecodeStorageReader_;

        // emit event
        emit Deployed({
            engineImplementation: engineImplementation_,
            engineFlexImplementation: engineFlexImplementation_,
            type_: type_
        });
    }

    /**
     * @notice Creates a new Engine or Engine Flex contract with the provided
     * `engineConfiguration`, depending on the `engineCoreContractType`.
     * Reverts if invalid configuration is provided, or if in an invalid deployment
     * state (e.g. if the contract is abandoned or does not own the core registry).
     * @param engineCoreContractType Type of Engine Core contract.
     * @param engineConfiguration EngineConfiguration data to configure the
     * contract with.
     * @param adminACLContract Address of admin access control contract, to be
     * set as contract owner. A new contract will be deployed if address is null.
     * @param salt Salt used to deterministically deploy the clone. If null, a
     * pseudorandom salt is generated.
     * @return engineContract The address of the newly created Engine or Engine Flex
     * contract. The address is also emitted in the `EngineContractCreated` event.
     */
    function createEngineContract(
        IEngineFactoryV0.EngineCoreType engineCoreContractType,
        EngineConfiguration calldata engineConfiguration,
        address adminACLContract,
        bytes32 salt
    ) external onlyOwner returns (address engineContract) {
        require(!isAbandoned, "factory is abandoned");
        // validate engine contract configuration
        _onlyNonZeroAddress(engineConfiguration.renderProviderAddress);
        _onlyNonZeroAddress(engineConfiguration.randomizerContract);

        // check if salt is empty and generate a pseudorandom one if so
        if (salt == bytes32(0)) {
            salt = _generatePseudorandomSalt();
        }

        if (adminACLContract == address(0)) {
            _onlyNonZeroAddress(engineConfiguration.newSuperAdminAddress);
            // deploy new AdminACLV0 contract and update super admin
            adminACLContract = Create2.deploy({
                amount: 0,
                salt: _generatePseudorandomSalt(),
                bytecode: type(AdminACLV0).creationCode
            });
            address[] memory tmpEmptyArray = new address[](0);

            IAdminACLV0_Extended(adminACLContract).changeSuperAdmin(
                engineConfiguration.newSuperAdminAddress,
                tmpEmptyArray
            );
        } else {
            // Use existing Admin ACL Contract, newSuperAdminAddress should not be populated
            require(
                engineConfiguration.newSuperAdminAddress == address(0),
                "AdminACL already exists"
            );
        }

        address implementation = engineCoreContractType ==
            IEngineFactoryV0.EngineCoreType.Engine
            ? engineImplementation
            : engineFlexImplementation;

        engineContract = Clones.cloneDeterministic({
            implementation: implementation,
            salt: salt
        });

        IGenArt721CoreContractV3_Engine(engineContract).initialize({
            engineConfiguration: engineConfiguration,
            adminACLContract_: adminACLContract,
            defaultBaseURIHost: defaultBaseURIHost,
            bytecodeStorageReaderContract_: universalBytecodeStorageReader
        });

        (
            string memory coreContractType,
            string memory coreContractVersion
        ) = engineCoreContractType == IEngineFactoryV0.EngineCoreType.Engine
                ? (engineCoreType, engineCoreVersion)
                : (flexCoreType, flexCoreVersion);

        // register the new Engine contract
        ICoreRegistryV1(coreRegistry).registerContract(
            engineContract,
            _stringToBytes32(coreContractVersion),
            _stringToBytes32(coreContractType)
        );
        // emit event
        emit EngineContractCreated(engineContract);
    }

    /**
     * @notice Updates the default base URI host used when initializing new
     * Engine contracts.
     * e.g. "https://token.artblocks.io/1/" for mainnet,
     * "https://token.artblocks.io/42161/" for arbitrum, etc.
     * Only callable by the owner.
     * @param _defaultBaseURIHost New default base URI host.
     */
    function updateDefaultBaseURIHost(
        string memory _defaultBaseURIHost
    ) external onlyOwner {
        require(
            bytes(_defaultBaseURIHost).length > 0,
            "Must input non-empty string"
        );
        defaultBaseURIHost = _defaultBaseURIHost;
        emit DefaultBaseURIHostUpdated(_defaultBaseURIHost);
    }

    /**
     * @notice Calls transferOwnership on the core registry.
     * Useful for updating the owner of the core registry contract.
     * @param _owner address of the new owner
     */
    function transferCoreRegistryOwnership(address _owner) external onlyOwner {
        Ownable(coreRegistry).transferOwnership(_owner);
    }

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
    ) external onlyOwner {
        // @dev pure forwarding - input validation is done in the core registry
        ICoreRegistryV1(coreRegistry).registerContracts({
            contractAddresses: contractAddresses,
            coreVersions: coreVersions,
            coreTypes: coreTypes
        });
    }

    /**
     * @notice Unregisters multiple contracts from the core registry.
     * @param contractAddresses An array of contract addresses to unregister.
     */
    function unregisterMultipleContracts(
        address[] calldata contractAddresses
    ) external onlyOwner {
        // @dev pure forwarding - input validation is done in the core registry
        ICoreRegistryV1(coreRegistry).unregisterContracts(contractAddresses);
    }

    /**
     * @notice Abandons the contract, preventing it from being used to create
     * new Engine and Engine Flex contracts.
     * Only callable by the owner, and only once; reverts otherwise.
     */
    function abandon() external onlyOwner {
        require(!isAbandoned, "factory is abandoned");
        // set isAbandoned to true
        isAbandoned = true;
        // emit event
        emit Abandoned();
    }

    /**
     * @dev This contract is not intended to hold funds. This function,
     * `drainETH`, and `drainERC20` are implemented to prevent the loss
     * of funds that might be sent to this contract inadvertently.
     */
    receive() external payable {}

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

    /**
     * @notice Execute a batch of calls.
     * @dev The calls are executed in order, reverting if any of them fails. Can
     * only be called by the owner. It is safe to check ownership only once here
     * because the owner status is only used to gate access to the function, not
     * to validate each individual call. Even if ownership is transferred during
     * the sequence of calls, it does not affect the execution logic or security,
     * as ownership is solely used to prevent unauthorized use of this batch
     * execution capability. This is particularly useful to safely interact
     * with contracts or addresses that might deem this contract eligible for
     * airdrops, thereby avoiding loss of funds.
     * @param _calls The calls to execute
     */
    function execCalls(
        Call[] calldata _calls
    )
        external
        onlyOwner
        returns (uint256 blockNumber, bytes[] memory returnData)
    {
        blockNumber = block.number;
        uint256 length = _calls.length;
        returnData = new bytes[](length);

        for (uint256 i = 0; i < length; ++i) {
            Call calldata calli = _calls[i];

            // check for existence of code at the target address
            if (calli.to.code.length == 0) {
                // when the call is to an EOA, the calldata must be empty.
                require(calli.data.length == 0, "Invalid call data");
            }

            (bool success, bytes memory data) = calli.to.call(calli.data);
            require(success, string(data));
            returnData[i] = data;
        }
    }

    /**
     * @dev Predict the deterministic address for a new core contract of type
     * `engineCoreContractType` and salt `salt`, deployed using the function
     * `createEngineContract`.
     * Reverts if `salt` is null, because the factory generates a pseudorandom
     * salt in that case.
     * @param engineCoreContractType Type of Engine Core contract.
     * @param salt Salt used to deterministically deploy the clone.
     */
    function predictDeterministicAddress(
        IEngineFactoryV0.EngineCoreType engineCoreContractType,
        bytes32 salt
    ) external view returns (address predicted) {
        // cannot predict if salt is null, because factory generates pseudorandom salt
        if (salt == bytes32(0)) {
            revert("null salt = pseudorandom addr");
        }
        return
            Clones.predictDeterministicAddress({
                implementation: engineCoreContractType ==
                    IEngineFactoryV0.EngineCoreType.Engine
                    ? engineImplementation
                    : engineFlexImplementation,
                salt: salt
            });
    }

    /**
     * @notice helper function to generate a pseudorandom salt
     * @return result pseudorandom salt
     */
    function _generatePseudorandomSalt() internal returns (bytes32 result) {
        // get and increment nonce to prevent same-block collisions
        uint256 nonce = _pseudorandomSaltNonce++;
        return
            keccak256(
                abi.encodePacked(
                    nonce,
                    block.timestamp,
                    block.number,
                    address(this)
                )
            );
    }

    /**
     * @notice helper function to convert a string to a bytes32.
     * Caution: This function only works properly for short strings.
     * @param source string to convert
     * @return result bytes32 representation of the string
     */
    function _stringToBytes32(
        string memory source
    ) internal pure returns (bytes32 result) {
        bytes memory tempString = bytes(source);
        if (tempString.length == 0) {
            return 0x0;
        }

        assembly {
            result := mload(add(source, 32))
        }
    }

    /**
     * @notice helper function to validate that an address is non-zero.
     * Reverts if the address is zero.
     * @param address_ address to validate
     */
    function _onlyNonZeroAddress(address address_) internal pure {
        require(address_ != address(0), "Must input non-zero address");
    }
}
