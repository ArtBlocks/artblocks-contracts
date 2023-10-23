// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
pragma solidity 0.8.19;

import {IMinterFilterV1} from "../../interfaces/v0.8.x/IMinterFilterV1.sol";
import {ISharedMinterV0} from "../../interfaces/v0.8.x/ISharedMinterV0.sol";
import {IGenArt721CoreContractV3_Base} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import {ICoreRegistryV1} from "../../interfaces/v0.8.x/ICoreRegistryV1.sol";
import {IAdminACLV0} from "../../interfaces/v0.8.x/IAdminACLV0.sol";

import {Bytes32Strings} from "../../libs/v0.8.x/Bytes32Strings.sol";

import {Ownable} from "@openzeppelin-4.7/contracts/access/Ownable.sol";
import {EnumerableMap} from "@openzeppelin-4.7/contracts/utils/structs/EnumerableMap.sol";
import {EnumerableSet} from "@openzeppelin-4.7/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title MinterFilterV2
 * @dev At the time of deployment, this contract is intended to be used with
 * core contracts that implement IGenArt721CoreContractV3_Base.
 * @author Art Blocks Inc.
 * @notice This Minter Filter V2 contract allows minters to be set on a
 * per-project basis, for any registered core contract. This minter filter does
 * not extend the previous version of the minter filters, as the previous
 * version is not compatible with multiple core contracts.
 *
 * This contract is designed to be managed by an Admin ACL contract, as well as
 * delegated privileges to core contract artists and Admin ACL contracts.
 * These roles hold extensive power and can arbitrarily control and modify
 * how a project's tokens may be minted.
 * Care must be taken to ensure that the admin ACL contract and artist
 * addresses are secure behind a multi-sig or other access control mechanism.
 * ----------------------------------------------------------------------------
 * The following functions are restricted as allowed by this contract's Admin
 * ACL:
 * - updateCoreRegistry
 * - approveMinterGlobally
 * - revokeMinterGlobally
 * - removeMintersForProjectsOnContracts
 * ----------------------------------------------------------------------------
 * The following functions are restricted as allowed by each core contract's
 * Admin ACL contract:
 * - approveMinterForContract
 * - revokeMinterForContract
 * - removeMintersForProjectsOnContract
 * ----------------------------------------------------------------------------
 * The following functions are restricted as allowed by each core contract's
 * Admin ACL contract, or to the artist address of the project:
 * - setMinterForProject
 * - removeMinterForProject
 * ----------------------------------------------------------------------------
 * Additional admin and artist privileged roles may be described on minters,
 * registries, and other contracts that may interact with this contract.
 */
contract MinterFilterV2 is Ownable, IMinterFilterV1 {
    // add Enumerable Map, Enumerable Set methods
    using EnumerableMap for EnumerableMap.UintToAddressMap;
    using EnumerableSet for EnumerableSet.AddressSet;
    // add Bytes32Strings methods
    using Bytes32Strings for bytes32;

    /// version of this minter filter contract
    // @dev use function minterFilterVersion to get this as a string
    bytes32 constant MINTER_FILTER_VERSION = "v2.0.0";

    /// type of this minter filter contract
    // @dev use function minterFilterType to get this as a string
    bytes32 constant MINTER_FILTER_TYPE = "MinterFilterV2";

    /// Admin ACL contract for this minter filter
    IAdminACLV0 public adminACLContract;

    /**
     * @notice Core registry, that tracks all registered core contracts
     */
    ICoreRegistryV1 public coreRegistry;

    /// minter address => qty projects across all core contracts currently
    /// using the minter
    mapping(address minterAddress => uint256 numProjects)
        public numProjectsUsingMinter;

    /**
     * Enumerable Set of globally approved minters.
     * This is a Set of addresses that are approved to mint on any
     * project, for any core contract.
     * @dev note that contract admins can extend a separate Set of minters for
     * their core contract via the `approveMinterForContract` function.
     */
    EnumerableSet.AddressSet private _globallyApprovedMinters;

    /**
     * Mapping of core contract addresses to Enumerable Sets of approved
     * minters for that core contract.
     * @dev note that contract admins can extend this Set for their core
     * contract by via the `approveMinterForContract` function, and can remove
     * minters from this Set via the `revokeMinterForContract` function.
     */
    mapping(address coreContract => EnumerableSet.AddressSet approvedMintersForContract)
        private _contractApprovedMinters;

    /**
     * Mapping of core contract addresses to Enumerable Maps of project IDs to
     * minter addresses.
     */
    mapping(address coreContract => EnumerableMap.UintToAddressMap projectIdToMinterAddress)
        private _minterForProject;

    function _onlyNonZeroAddress(address address_) internal pure {
        require(address_ != address(0), "Only non-zero address");
    }

    /**
     * @notice Function to restrict access to only AdminACL allowed calls
     * on a given core contract.
     * @dev defers to the ACL contract used by the core contract
     * @param selector function selector to be checked
     */
    function _onlyAdminACL(bytes4 selector) internal {
        require(
            adminACLAllowed(msg.sender, address(this), selector),
            "Only Admin ACL allowed"
        );
    }

    /**
     * @notice Function to restrict access to only AdminACL allowed calls
     * on a given core contract.
     * @dev defers to the ACL contract used by the core contract
     * @param coreContract core contract address
     * @param selector function selector to be checked
     */
    function _onlyCoreAdminACL(address coreContract, bytes4 selector) internal {
        require(
            IGenArt721CoreContractV3_Base(coreContract).adminACLAllowed(
                msg.sender,
                address(this),
                selector
            ),
            "Only Core AdminACL allowed"
        );
    }

    // function to restrict access to only core AdminACL or the project artist
    function _onlyCoreAdminACLOrArtist(
        uint256 projectId,
        address coreContract,
        bytes4 selector
    ) internal {
        IGenArt721CoreContractV3_Base genArtCoreContract_Base = IGenArt721CoreContractV3_Base(
                coreContract
            );
        require(
            (msg.sender ==
                genArtCoreContract_Base.projectIdToArtistAddress(projectId)) ||
                (
                    genArtCoreContract_Base.adminACLAllowed(
                        msg.sender,
                        address(this),
                        selector
                    )
                ),
            "Only Artist or Core Admin ACL"
        );
    }

    // function to restrict access to only core contracts registered with the
    // currently configured core registry. This is used to prevent
    // non-registered core contracts from being used with this minter filter.
    function _onlyRegisteredCoreContract(address coreContract) internal view {
        // @dev use core registry to check if core contract is registered
        require(
            coreRegistry.isRegisteredContract(coreContract),
            "Only registered core contract"
        );
    }

    // function to restrict access to only valid project IDs
    function _onlyValidProjectId(
        uint256 projectId,
        address coreContract
    ) internal view {
        IGenArt721CoreContractV3_Base genArtCoreContract = IGenArt721CoreContractV3_Base(
                coreContract
            );
        require(
            (projectId >= genArtCoreContract.startingProjectId()) &&
                (projectId < genArtCoreContract.nextProjectId()),
            "Only valid project ID"
        );
    }

    // checks if minter is globally approved or approved for a core contract
    function _onlyApprovedMinter(
        address coreContract,
        address minter
    ) internal view {
        require(
            isApprovedMinterForContract(coreContract, minter),
            "Only approved minters"
        );
    }

    /**
     * @notice Initializes contract to be a Minter for `genArt721Address`.
     * @param adminACLContract_ Address of admin access control contract, to be
     * set as contract owner.
     * @param coreRegistry_ Address of core registry contract.
     */
    constructor(address adminACLContract_, address coreRegistry_) {
        // set AdminACL management contract as owner
        _transferOwnership(adminACLContract_);
        // set core registry contract
        _updateCoreRegistry(coreRegistry_);
        emit Deployed();
    }

    /**
     * @notice returns the version of this minter filter contract
     */
    function minterFilterVersion() external pure returns (string memory) {
        return MINTER_FILTER_VERSION.toString();
    }

    /**
     * @notice returns the type of this minter filter contract
     */
    function minterFilterType() external pure returns (string memory) {
        return MINTER_FILTER_TYPE.toString();
    }

    /**
     * @notice Updates the core registry contract to be used by this contract.
     * Only callable as allowed by AdminACL of this contract.
     * @param coreRegistry_ Address of the new core registry contract.
     */
    function updateCoreRegistry(address coreRegistry_) external {
        _onlyAdminACL(this.updateCoreRegistry.selector);
        _updateCoreRegistry(coreRegistry_);
    }

    /**
     * @notice Globally approves minter `minter` to be available for
     * minting on any project, for any core contract.
     * Only callable as allowed by AdminACL of this contract.
     * @dev Reverts if minter is already globally approved, or does not
     * implement minterType().
     * @param minter Minter to be approved.
     */
    function approveMinterGlobally(address minter) external {
        _onlyAdminACL(this.approveMinterGlobally.selector);
        // @dev add() returns true only if the value was not already in the Set
        require(
            _globallyApprovedMinters.add(minter),
            "Minter already approved"
        );
        emit MinterApprovedGlobally(
            minter,
            ISharedMinterV0(minter).minterType()
        );
    }

    /**
     * @notice Removes previously globally approved minter `minter`
     * from the list of globally approved minters.
     * Only callable as allowed by AdminACL of this contract.
     * Reverts if minter is not globally approved, or if minter is still
     * in use by any project.
     * @dev intentionally do not check if minter is still in use by any
     * project, meaning that any projects currently using the minter will
     * continue to be able to use it. If existing projects should be forced
     * to discontinue using a minter, the minter may be removed by the minter
     * filter admin in bulk via the `removeMintersForProjectsOnContract`
     * function.
     * @param minter Minter to remove.
     */
    function revokeMinterGlobally(address minter) external {
        _onlyAdminACL(this.revokeMinterGlobally.selector);
        // @dev remove() returns true only if the value was already in the Set
        require(
            _globallyApprovedMinters.remove(minter),
            "Only previously approved minter"
        );
        emit MinterRevokedGlobally(minter);
    }

    /**
     * @notice Approves minter `minter` to be available for minting on
     * any project on core contarct `coreContract`.
     * Only callable as allowed by AdminACL of core contract `coreContract`.
     * Reverts if core contract is not registered, if minter is already
     * approved for the contract, or if minter does not implement minterType().
     * @param coreContract Core contract to approve minter for.
     * @param minter Minter to be approved.
     */
    function approveMinterForContract(
        address coreContract,
        address minter
    ) external {
        _onlyRegisteredCoreContract(coreContract);
        _onlyCoreAdminACL(coreContract, this.approveMinterForContract.selector);
        // @dev add() returns true only if the value was not already in the Set
        require(
            _contractApprovedMinters[coreContract].add(minter),
            "Minter already approved"
        );
        emit MinterApprovedForContract({
            coreContract: coreContract,
            minter: minter,
            minterType: ISharedMinterV0(minter).minterType()
        });
    }

    /**
     * @notice Removes previously approved minter `minter` from the
     * list of approved minters on core contract `coreContract`.
     * Only callable as allowed by AdminACL of core contract `coreContract`.
     * Reverts if core contract is not registered, or if minter is not approved
     * on contract.
     * @dev intentionally does not check if minter is still in use by any
     * project, meaning that any projects currently using the minter will
     * continue to be able to use it. If existing projects should be forced
     * to discontinue using a minter, the minter may be removed by the contract
     * admin in bulk via the `removeMintersForProjectsOnContract` function.
     * @param coreContract Core contract to remove minter from.
     * @param minter Minter to remove.
     */
    function revokeMinterForContract(
        address coreContract,
        address minter
    ) external {
        _onlyRegisteredCoreContract(coreContract);
        _onlyCoreAdminACL(coreContract, this.revokeMinterForContract.selector);
        // @dev intentionally do not check if minter is still in use by any
        // project, since it is possible that a different contract's project is
        // using the minter
        // @dev remove() returns true only if the value was already in the Set
        require(
            _contractApprovedMinters[coreContract].remove(minter),
            "Only previously approved minter"
        );
        emit MinterRevokedForContract({
            coreContract: coreContract,
            minter: minter
        });
    }

    /**
     * @notice Sets minter for project `projectId` on contract `coreContract`
     * to minter `minter`.
     * Only callable by the project's artist or as allowed by AdminACL of
     * core contract `coreContract`.
     * Reverts if:
     *  - core contract is not registered
     *  - minter is not approved globally on this minter filter or for the
     *    project's core contract
     *  - project is not valid on the core contract
     *  - function is called by an address other than the project's artist
     *    or a sender allowed by the core contract's admin ACL
     *  - minter does not implement minterType()
     * @param projectId Project ID to set minter for.
     * @param coreContract Core contract of project.
     * @param minter Minter to be the project's minter.
     */
    function setMinterForProject(
        uint256 projectId,
        address coreContract,
        address minter
    ) external {
        /// CHECKS
        _onlyRegisteredCoreContract(coreContract);
        _onlyCoreAdminACLOrArtist(
            projectId,
            coreContract,
            this.setMinterForProject.selector
        );
        _onlyApprovedMinter(coreContract, minter);
        _onlyValidProjectId(projectId, coreContract);
        /// EFFECTS
        // decrement number of projects using a previous minter
        (bool hasPreviousMinter, address previousMinter) = _minterForProject[
            coreContract
        ].tryGet(projectId);
        if (hasPreviousMinter) {
            numProjectsUsingMinter[previousMinter]--;
        }
        // assign new minter
        numProjectsUsingMinter[minter]++;
        _minterForProject[coreContract].set(projectId, minter);
        emit ProjectMinterRegistered({
            projectId: projectId,
            coreContract: coreContract,
            minter: minter,
            minterType: ISharedMinterV0(minter).minterType()
        });
    }

    /**
     * @notice Updates project `projectId` on contract `coreContract` to have
     * no configured minter.
     * Only callable by the project's artist or as allowed by AdminACL of
     * core contract `coreContract`.
     * Reverts if:
     *  - core contract is not registered
     *  - project does not already have a minter assigned
     *  - function is called by an address other than the project's artist
     *    or a sender allowed by the core contract's admin ACL
     * @param projectId Project ID to remove minter for.
     * @param coreContract Core contract of project.
     * @dev requires project to have an assigned minter
     */
    function removeMinterForProject(
        uint256 projectId,
        address coreContract
    ) external {
        _onlyRegisteredCoreContract(coreContract);
        _onlyCoreAdminACLOrArtist(
            projectId,
            coreContract,
            this.removeMinterForProject.selector
        );
        // @dev this will revert if project does not have a minter
        _removeMinterForProject(projectId, coreContract);
    }

    /**
     * @notice Updates an array of project IDs to have no configured minter.
     * Only callable as allowed by AdminACL of core contract `coreContract`.
     * Reverts if the core contract is not registered, or if any project does
     * not already have a minter assigned.
     * @param projectIds Array of project IDs to remove minters for.
     * @param coreContract Core contract of projects.
     * @dev caution with respect to single tx gas limits
     */
    function removeMintersForProjectsOnContract(
        uint256[] calldata projectIds,
        address coreContract
    ) external {
        _onlyRegisteredCoreContract(coreContract);
        _onlyCoreAdminACL(
            coreContract,
            this.removeMintersForProjectsOnContract.selector
        );
        uint256 numProjects = projectIds.length;
        for (uint256 i; i < numProjects; ) {
            _removeMinterForProject(projectIds[i], coreContract);
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Mint a token from project `projectId` on contract
     * `coreContract` to `to`, originally purchased by `sender`.
     * @param to The new token's owner.
     * @param projectId Project ID to mint a new token on.
     * @param sender Address purchasing a new token.
     * @param coreContract Core contract of project.
     * @return tokenId Token ID of minted token
     * @dev reverts w/nonexistent key error when project has no assigned minter
     * @dev does not check if core contract is registered, for gas efficiency
     * and because project must have already been assigned a minter, which
     * requires the core contract to have been previously registered. If core
     * contract was unregistered but the project still has an assigned minter,
     * minting will remain possible.
     * @dev function name is optimized for gas.
     */
    function mint_joo(
        address to,
        uint256 projectId,
        address coreContract,
        address sender
    ) external returns (uint256 tokenId) {
        // CHECKS
        // minter is the project's minter
        require(
            msg.sender == _minterForProject[coreContract].get(projectId),
            "Only assigned minter"
        );
        // INTERACTIONS
        tokenId = IGenArt721CoreContractV3_Base(coreContract).mint_Ecf(
            to,
            projectId,
            sender
        );
        return tokenId;
    }

    /**
     * @notice Gets the assigned minter for project `projectId` on core
     * contract `coreContract`.
     * Reverts if project does not have an assigned minter.
     * @param projectId Project ID to query.
     * @param coreContract Core contract of project.
     * @return address Minter address assigned to project
     * @dev requires project to have an assigned minter
     * @dev this function intentionally does not check that the core contract
     * is registered, since it must have been registered at the time the
     * project was assigned a minter
     */
    function getMinterForProject(
        uint256 projectId,
        address coreContract
    ) external view returns (address) {
        (bool hasMinter, address currentMinter) = _minterForProject[
            coreContract
        ].tryGet(projectId);
        require(hasMinter, "No minter assigned");
        return currentMinter;
    }

    /**
     * @notice Queries if project `projectId` on core contract `coreContract`
     * has an assigned minter.
     * @param projectId Project ID to query.
     * @param coreContract Core contract of project.
     * @return bool true if project has an assigned minter, else false
     * @dev requires project to have an assigned minter
     * @dev this function intentionally does not check that the core contract
     * is registered, since it must have been registered at the time the
     * project was assigned a minter
     */
    function projectHasMinter(
        uint256 projectId,
        address coreContract
    ) external view returns (bool) {
        (bool hasMinter, ) = _minterForProject[coreContract].tryGet(projectId);
        return hasMinter;
    }

    /**
     * @notice Gets quantity of projects on a given core contract that have
     * assigned minters.
     * @param coreContract Core contract to query.
     * @return uint256 quantity of projects that have assigned minters
     * @dev this function intentionally does not check that the core contract
     * is registered, since it must have been registered at the time the
     * project was assigned a minter
     */
    function getNumProjectsOnContractWithMinters(
        address coreContract
    ) external view returns (uint256) {
        return _minterForProject[coreContract].length();
    }

    /**
     * @notice Get project ID and minter address at index `index` of
     * enumerable map.
     * @param coreContract Core contract to query.
     * @param index enumerable map index to query.
     * @return projectId project ID at index `index`
     * @return minterAddress minter address for project at index `index`
     * @return minterType minter type of minter at minterAddress
     * @dev index must be < quantity of projects that have assigned minters,
     * otherwise reverts
     * @dev reverts if minter does not implement minterType() function
     * @dev this function intentionally does not check that the core contract
     * is registered, since it must have been registered at the time the
     * project was assigned a minter
     */
    function getProjectAndMinterInfoOnContractAt(
        address coreContract,
        uint256 index
    )
        external
        view
        returns (
            uint256 projectId,
            address minterAddress,
            string memory minterType
        )
    {
        // @dev at() reverts if index is out of bounds
        (projectId, minterAddress) = _minterForProject[coreContract].at(index);
        minterType = ISharedMinterV0(minterAddress).minterType();
        return (projectId, minterAddress, minterType);
    }

    /**
     * @notice View that returns if a core contract is registered with the
     * core registry, allowing this minter filter to service it.
     * @param coreContract core contract address to be checked
     * @return bool true if core contract is registered, else false
     */
    function isRegisteredCoreContract(
        address coreContract
    ) external view override returns (bool) {
        return coreRegistry.isRegisteredContract(coreContract);
    }

    /**
     * @notice Gets all projects on core contract `coreContract` that are
     * using minter `minter`.
     * Warning: Unbounded gas limit. This function is gas-intensive and should
     * only be used for off-chain queries. Alternatively, the subgraph indexing
     * layer may be used to query these values.
     * @param coreContract core contract to query
     * @param minter minter to query
     */
    function getProjectsOnContractUsingMinter(
        address coreContract,
        address minter
    ) external view returns (uint256[] memory projectIds) {
        // initialize arrays with maximum potential length
        // @dev use num projects using minter across all contracts since it the
        // maximum length of this array
        uint256 maxNumProjects = numProjectsUsingMinter[minter];
        projectIds = new uint256[](maxNumProjects);
        // iterate over all projects on contract, adding to array if using
        // `minter`
        EnumerableMap.UintToAddressMap storage minterMap = _minterForProject[
            coreContract
        ];
        uint256 numProjects = minterMap.length();
        uint256 numProjectsOnContractUsingMinter;
        for (uint256 i; i < numProjects; ) {
            (uint256 projectId, address minter_) = minterMap.at(i);
            if (minter_ == minter) {
                projectIds[numProjectsOnContractUsingMinter++] = projectId;
            }
            unchecked {
                ++i;
            }
        }
        // trim array if necessary
        if (maxNumProjects > numProjectsOnContractUsingMinter) {
            assembly {
                let decrease := sub(
                    maxNumProjects,
                    numProjectsOnContractUsingMinter
                )
                mstore(projectIds, sub(mload(projectIds), decrease))
            }
        }
        return projectIds;
    }

    /**
     * @notice Gets all minters that are globally approved on this minter
     * filter. Returns an array of MinterWithType structs, which contain the
     * minter address and minter type.
     * This function has unbounded gas, and should only be used for off-chain
     * queries.
     * Alternatively, the subgraph indexing layer may be used to query these
     * values.
     * @return mintersWithTypes Array of MinterWithType structs, which contain
     * the minter address and minter type.
     */
    function getAllGloballyApprovedMinters()
        external
        view
        returns (MinterWithType[] memory mintersWithTypes)
    {
        // initialize arrays with appropriate length
        uint256 numMinters = _globallyApprovedMinters.length();
        mintersWithTypes = new MinterWithType[](numMinters);
        // iterate over all globally approved minters, adding to array
        for (uint256 i; i < numMinters; ) {
            address minterAddress = _globallyApprovedMinters.at(i);
            // @dev we know minterType() does not revert, because it was called
            // when globally approving the minter
            string memory minterType = ISharedMinterV0(minterAddress)
                .minterType();
            mintersWithTypes[i] = MinterWithType({
                minterAddress: minterAddress,
                minterType: minterType
            });
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Gets all minters that are approved for a specific core contract.
     * Returns an array of MinterWithType structs, which contain the minter
     * address and minter type.
     * This function has unbounded gas, and should only be used for off-chain
     * queries.
     * @param coreContract Core contract to query.
     * @return mintersWithTypes Array of MinterWithType structs, which contain
     * the minter address and minter type.
     */
    function getAllContractApprovedMinters(
        address coreContract
    ) external view returns (MinterWithType[] memory mintersWithTypes) {
        // initialize arrays with appropriate length
        EnumerableSet.AddressSet
            storage contractApprovedMinters = _contractApprovedMinters[
                coreContract
            ];
        uint256 numMinters = contractApprovedMinters.length();
        mintersWithTypes = new MinterWithType[](numMinters);
        // iterate over all minters approved for a given contract, adding to
        // array
        for (uint256 i; i < numMinters; ) {
            address minterAddress = contractApprovedMinters.at(i);
            // @dev we know minterType() does not revert, because it was called
            // when approving the minter for a contract
            string memory minterType = ISharedMinterV0(minterAddress)
                .minterType();
            mintersWithTypes[i] = MinterWithType({
                minterAddress: minterAddress,
                minterType: minterType
            });
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Convenience function that returns whether `sender` is allowed
     * to call function with selector `selector` on contract `contract`, as
     * determined by this contract's current Admin ACL contract. Expected use
     * cases include minter contracts checking if caller is allowed to call
     * admin-gated functions on minter contracts.
     * @param sender Address of the sender calling function with selector
     * `selector` on contract `contract`.
     * @param contract_ Address of the contract being called by `sender`.
     * @param selector Function selector of the function being called by
     * `sender`.
     * @return bool Whether `sender` is allowed to call function with selector
     * `selector` on contract `contract`.
     * @dev assumes the Admin ACL contract is the owner of this contract, which
     * is expected to always be true.
     * @dev adminACLContract is expected to either be null address (if owner
     * has renounced ownership), or conform to IAdminACLV0 interface. Check for
     * null address first to avoid revert when admin has renounced ownership.
     */
    function adminACLAllowed(
        address sender,
        address contract_,
        bytes4 selector
    ) public returns (bool) {
        return
            owner() != address(0) &&
            adminACLContract.allowed(sender, contract_, selector);
    }

    /**
     * @notice Returns whether `minter` is globally approved to mint tokens
     * on any contract.
     * @param minter Address of minter to check.
     */
    function isGloballyApprovedMinter(
        address minter
    ) public view returns (bool) {
        return _globallyApprovedMinters.contains(minter);
    }

    /**
     * @notice Returns whether `minter` is approved to mint tokens on
     * core contract `coreContract`.
     * @param coreContract Address of core contract to check.
     * @param minter Address of minter to check.
     */
    function isApprovedMinterForContract(
        address coreContract,
        address minter
    ) public view returns (bool) {
        return
            isGloballyApprovedMinter(minter) ||
            _contractApprovedMinters[coreContract].contains(minter);
    }

    /**
     * @notice Returns contract owner. Set to deployer's address by default on
     * contract deployment.
     * @return address Address of contract owner.
     * @dev ref: https://docs.openzeppelin.com/contracts/4.x/api/access#Ownable
     * @dev owner role was called `admin` prior to V3 core contract
     */
    function owner()
        public
        view
        override(Ownable, IMinterFilterV1)
        returns (address)
    {
        return Ownable.owner();
    }

    /// @dev override to prevent renouncing ownership
    /// @dev not permission gated since this immediately reverts
    function renounceOwnership() public pure override {
        revert("Cannot renounce ownership");
    }

    /**
     * @notice Updates project `projectId` to have no configured minter
     * Reverts if project does not already have an assigned minter.
     * @param projectId Project ID to remove minter.
     * @param coreContract Core contract of project.
     * @dev requires project to have an assigned minter
     * @dev this function intentionally does not check that the core contract
     * is registered, since it must have been registered at the time the
     * project was assigned a minter
     */
    function _removeMinterForProject(
        uint256 projectId,
        address coreContract
    ) internal {
        // remove minter for project and emit
        // @dev `minterForProject.get()` reverts tx if no minter set for project
        numProjectsUsingMinter[
            _minterForProject[coreContract].get(projectId, "No minter assigned")
        ]--;
        _minterForProject[coreContract].remove(projectId);
        emit ProjectMinterRemoved(projectId, coreContract);
    }

    /**
     * @notice Transfers ownership of the contract to a new account (`owner`).
     * Internal function without access restriction.
     * @param owner_ New owner.
     * @dev owner role was called `admin` prior to V3 core contract.
     * @dev Overrides and wraps OpenZeppelin's _transferOwnership function to
     * also update adminACLContract for improved introspection.
     */
    function _transferOwnership(address owner_) internal override {
        Ownable._transferOwnership(owner_);
        adminACLContract = IAdminACLV0(owner_);
    }

    /**
     * @notice Updates this contract's core registry contract to
     * `coreRegistry`.
     * @param coreRegistry_ New core registry contract address.
     */
    function _updateCoreRegistry(address coreRegistry_) internal {
        _onlyNonZeroAddress(coreRegistry_);
        coreRegistry = ICoreRegistryV1(coreRegistry_);
        emit CoreRegistryUpdated(coreRegistry_);
    }
}
