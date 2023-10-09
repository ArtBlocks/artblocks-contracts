// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.19;

import {IGenArt721CoreContractV3_Base} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import {IDelegationRegistry} from "../../interfaces/v0.8.x/IDelegationRegistry.sol";
import {ISharedMinterV0} from "../../interfaces/v0.8.x/ISharedMinterV0.sol";
import {ISharedMinterHolderV0} from "../../interfaces/v0.8.x/ISharedMinterHolderV0.sol";
import {IMinterFilterV1} from "../../interfaces/v0.8.x/IMinterFilterV1.sol";

import {AuthLib} from "../../libs/v0.8.x/AuthLib.sol";
import {SplitFundsLib} from "../../libs/v0.8.x/minter-libs/SplitFundsLib.sol";
import {MaxInvocationsLib} from "../../libs/v0.8.x/minter-libs/MaxInvocationsLib.sol";
import {SetPriceLib} from "../../libs/v0.8.x/minter-libs/SetPriceLib.sol";
import {TokenHolderLib} from "../../libs/v0.8.x/minter-libs/TokenHolderLib.sol";
import {PolyptychLib} from "../../libs/v0.8.x/minter-libs/PolyptychLib.sol";

import {ReentrancyGuard} from "@openzeppelin-4.5/contracts/security/ReentrancyGuard.sol";
import {EnumerableSet} from "@openzeppelin-4.5/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title Shared, filtered Minter contract that allows tokens to be minted with
 * an artist-configured ERC20 token when purchaser owns an allowlisted ERC-721
 * NFT.
 * This contract must be used with an accompanying shared randomizer contract
 * that is configured to copy the token hash seed from the allowlisted token to
 * a corresponding newly-minted token. This minter contract must be the allowed
 * hash seed setter contract for the shared randomizer contract.
 * The source token may only be used to mint one additional polyptych "panel" if the token
 * has not yet been used to mint a panel with the currently configured panel ID. To add
 * an additional panel to a project, the panel ID may be incremented for the project
 * using the `incrementPolyptychProjectPanelId` function. Panel IDs for a project may only
 * be incremented such that panels must be minted in the order of their panel ID. Tokens
 * of the same project and panel ID may be minted in any order.
 * This is designed to be used with IGenArt721CoreContractExposesHashSeed contracts with an
 * active ISharedRandomizerV0 randomizer available for this minter to use.
 * This minter requires both a properly configured core contract and shared
 * randomizer in order to mint polyptych tokens.
 * @author Art Blocks Inc.
 * @notice Privileged Roles and Ownership:
 * This contract is designed to be managed, with limited powers.
 * Privileged roles and abilities are controlled by the project's artist, which
 * can be modified by the core contract's Admin ACL contract. Both of these
 * roles hold extensive power and can modify minter details.
 * Care must be taken to ensure that the admin ACL contract and artist
 * addresses are secure behind a multi-sig or other access control mechanism.
 * ----------------------------------------------------------------------------
 * The following functions are restricted to a project's artist:
 * - updatePricePerTokenInWei
 * - syncProjectMaxInvocationsToCore
 * - manuallyLimitProjectMaxInvocations
 * - updateProjectCurrencyInfo
 * - allowHoldersOfProjects
 * - removeHoldersOfProjects
 * - allowAndRemoveHoldersOfProjects
 * - incrementPolyptychProjectPanelId
 * ----------------------------------------------------------------------------
 * Additional admin and artist privileged roles may be described on other
 * contracts that this minter integrates with.
 * ----------------------------------------------------------------------------
 * This contract allows vaults to configure token-level or wallet-level
 * delegation of minting privileges. This allows a vault on an allowlist to
 * delegate minting privileges to a wallet that is not on the allowlist,
 * enabling the vault to remain air-gapped while still allowing minting. The
 * delegation registry contract is responsible for managing these delegations,
 * and is available at the address returned by the public immutable
 * `delegationRegistryAddress`. At the time of writing, the delegation
 * registry enables easy delegation configuring at https://delegate.cash/.
 * Art Blocks does not guarentee the security of the delegation registry, and
 * users should take care to ensure that the delegation registry is secure.
 * Token-level delegations are configured by the vault owner, and contract-
 * level delegations must be configured for the core token contract as returned
 * by the public immutable variable `genArt721CoreAddress`.
 * ----------------------------------------------------------------------------
 * @notice Caution: While Engine projects must be registered on the Art Blocks
 * Core Registry to assign this minter, this minter does not enforce that a
 * project is registered when configured or queried. This is primarily for gas
 * optimization purposes. It is, therefore, possible that fake projects may be
 * configured on this minter, but they will not be able to mint tokens due to
 * checks performed by this minter's Minter Filter.
 */
contract MinterSetPricePolyptychERC20V5 is
    ReentrancyGuard,
    ISharedMinterV0,
    ISharedMinterHolderV0
{
    // add Enumerable Set methods
    using EnumerableSet for EnumerableSet.AddressSet;

    /// Minter filter address this minter interacts with
    address public immutable minterFilterAddress;

    /// Minter filter this minter may interact with.
    IMinterFilterV1 private immutable _minterFilter;

    /// Delegation registry address
    address public immutable delegationRegistryAddress;

    /// Delegation registry address
    IDelegationRegistry private immutable _delegationRegistryContract;

    /// minterType for this minter
    string public constant minterType = "MinterSetPricePolyptychERC20V5";

    /// minter version for this minter
    string public constant minterVersion = "v5.0.0";

    uint256 internal constant ONE_MILLION = 1_000_000;

    // MODIFIERS
    // @dev contract uses modifier-like internal functions instead of modifiers
    // to reduce contract bytecode size
    // @dev contract uses AuthLib for some modifier-like functions

    /**
     * @notice Initializes contract to be a Filtered Minter for
     * `minterFilter` minter filter.
     * @param minterFilter Minter filter for which this will be a
     * filtered minter.
     * @param delegationRegistryAddress_ Delegation registry contract address.
     */
    constructor(
        address minterFilter,
        address delegationRegistryAddress_
    ) ReentrancyGuard() {
        minterFilterAddress = minterFilter;
        _minterFilter = IMinterFilterV1(minterFilter);

        delegationRegistryAddress = delegationRegistryAddress_;
        _delegationRegistryContract = IDelegationRegistry(
            delegationRegistryAddress_
        );
        emit TokenHolderLib.DelegationRegistryUpdated(
            delegationRegistryAddress_
        );
    }

    /**
     * @notice Manually sets the local maximum invocations of project `projectId`
     * with the provided `maxInvocations`, checking that `maxInvocations` is less
     * than or equal to the value of project `project_id`'s maximum invocations that is
     * set on the core contract.
     * @dev Note that a `maxInvocations` of 0 can only be set if the current `invocations`
     * value is also 0 and this would also set `maxHasBeenInvoked` to true, correctly short-circuiting
     * this minter's purchase function, avoiding extra gas costs from the core contract's maxInvocations check.
     * @param projectId Project ID to set the maximum invocations for.
     * @param coreContract Core contract address for the given project.
     * @param maxInvocations Maximum invocations to set for the project.
     */
    function manuallyLimitProjectMaxInvocations(
        uint256 projectId,
        address coreContract,
        uint24 maxInvocations
    ) external {
        AuthLib.onlyArtist({
            _projectId: projectId,
            _coreContract: coreContract,
            _sender: msg.sender
        });
        MaxInvocationsLib.manuallyLimitProjectMaxInvocations(
            projectId,
            coreContract,
            maxInvocations
        );
    }

    /**
     * @notice Updates this minter's price per token of project `projectId`
     * to be '_pricePerTokenInWei`, in Wei.
     * @dev Note that it is intentionally supported here that the configured
     * price may be explicitly set to `0`.
     * @param projectId Project ID to set the price per token for.
     * @param coreContract Core contract address for the given project.
     * @param pricePerTokenInWei Price per token to set for the project, in Wei.
     */
    function updatePricePerTokenInWei(
        uint256 projectId,
        address coreContract,
        uint248 pricePerTokenInWei
    ) external {
        AuthLib.onlyArtist({
            _projectId: projectId,
            _coreContract: coreContract,
            _sender: msg.sender
        });
        SetPriceLib.updatePricePerTokenInWei(
            projectId,
            coreContract,
            pricePerTokenInWei
        );

        // for convenience, sync local max invocations to the core contract if
        // and only if max invocations have not already been synced.
        // @dev do not sync if max invocations have already been synced, as
        // local max invocations could have been manually set to be
        // intentionally less than the core contract's max invocations.
        // @dev if local maxInvocations and maxHasBeenInvoked are both
        // initial values, we know they have not been populated on this minter
        if (
            MaxInvocationsLib.maxInvocationsIsUnconfigured(
                projectId,
                coreContract
            )
        ) {
            syncProjectMaxInvocationsToCore(projectId, coreContract);
        }
    }

    /**
     * @notice Updates payment currency of project `projectId` on core
     * contract `coreContract` to be `currencySymbol` at address
     * `currencyAddress`.
     * Only supports ERC20 tokens - for ETH minting, use a different minter.
     * @dev nonReentrant because no reentrant use cases, and to eliminate an
     * entire branch of reentrancy attack vectors.
     * @param projectId Project ID to update.
     * @param coreContract Core contract address for the given project.
     * @param currencySymbol Currency symbol.
     * @param currencyAddress Currency address.
     */
    function updateProjectCurrencyInfo(
        uint256 projectId,
        address coreContract,
        string memory currencySymbol,
        address currencyAddress
    ) external nonReentrant {
        AuthLib.onlyArtist({
            _projectId: projectId,
            _coreContract: coreContract,
            _sender: msg.sender
        });
        SplitFundsLib.updateProjectCurrencyInfoERC20({
            _projectId: projectId,
            _coreContract: coreContract,
            _currencySymbol: currencySymbol,
            _currencyAddress: currencyAddress
        });
    }

    /**
     * @notice Allows holders of NFTs at addresses `ownedNFTAddresses`,
     * project IDs `ownedNFTProjectIds` to mint on project `projectId`.
     * `ownedNFTAddresses` assumed to be aligned with `ownedNFTProjectIds`.
     * e.g. Allows holders of project `ownedNFTProjectIds[0]` on token
     * contract `ownedNFTAddresses[0]` to mint `projectId`.
     * WARNING: Only Art Blocks Core contracts are compatible with holder allowlisting,
     * due to assumptions about tokenId and projectId relationships.
     * @param projectId Project ID to enable minting on.
     * @param coreContract Core contract address for the given project.
     * @param ownedNFTAddresses NFT core addresses of projects to be
     * allowlisted. Indexes must align with `ownedNFTProjectIds`.
     * @param ownedNFTProjectIds Project IDs on `ownedNFTAddresses` whose
     * holders shall be allowlisted to mint project `projectId`. Indexes must
     * align with `ownedNFTAddresses`.
     */
    function allowHoldersOfProjects(
        uint256 projectId,
        address coreContract,
        address[] memory ownedNFTAddresses,
        uint256[] memory ownedNFTProjectIds
    ) external {
        AuthLib.onlyArtist({
            _projectId: projectId,
            _coreContract: coreContract,
            _sender: msg.sender
        });
        TokenHolderLib.allowHoldersOfProjects({
            _projectId: projectId,
            _coreContract: coreContract,
            _ownedNFTAddresses: ownedNFTAddresses,
            _ownedNFTProjectIds: ownedNFTProjectIds
        });
    }

    /**
     * @notice Removes holders of NFTs at addresses `ownedNFTAddresses`,
     * project IDs `ownedNFTProjectIds` to mint on project `projectId`. If
     * other projects owned by a holder are still allowed to mint, holder will
     * maintain ability to purchase.
     * `ownedNFTAddresses` assumed to be aligned with `ownedNFTProjectIds`.
     * e.g. Removes holders of project `ownedNFTProjectIds[0]` on token
     * contract `ownedNFTAddresses[0]` from mint allowlist of `projectId`.
     * @param projectId Project ID to enable minting on.
     * @param coreContract Core contract address for the given project.
     * @param ownedNFTAddresses NFT core addresses of projects to be removed
     * from allowlist. Indexes must align with `ownedNFTProjectIds`.
     * @param ownedNFTProjectIds Project IDs on `ownedNFTAddresses` whose
     * holders will be removed from allowlist to mint project `projectId`.
     * Indexes must align with `ownedNFTAddresses`.
     */
    function removeHoldersOfProjects(
        uint256 projectId,
        address coreContract,
        address[] memory ownedNFTAddresses,
        uint256[] memory ownedNFTProjectIds
    ) external {
        AuthLib.onlyArtist({
            _projectId: projectId,
            _coreContract: coreContract,
            _sender: msg.sender
        });
        // require same length arrays
        TokenHolderLib.removeHoldersOfProjects({
            _projectId: projectId,
            _coreContract: coreContract,
            _ownedNFTAddresses: ownedNFTAddresses,
            _ownedNFTProjectIds: ownedNFTProjectIds
        });
    }

    /**
     * @notice Allows holders of NFTs at addresses `ownedNFTAddressesAdd`,
     * project IDs `ownedNFTProjectIdsAdd` to mint on project `projectId`.
     * Also removes holders of NFTs at addresses `ownedNFTAddressesRemove`,
     * project IDs `ownedNFTProjectIdsRemove` from minting on project
     * `projectId`.
     * `ownedNFTAddressesAdd` assumed to be aligned with
     * `ownedNFTProjectIdsAdd`.
     * e.g. Allows holders of project `ownedNFTProjectIdsAdd[0]` on token
     * contract `ownedNFTAddressesAdd[0]` to mint `projectId`.
     * `ownedNFTAddressesRemove` also assumed to be aligned with
     * `ownedNFTProjectIdsRemove`.
     * WARNING: Only Art Blocks Core contracts are compatible with holder allowlisting,
     * due to assumptions about tokenId and projectId relationships.
     * @param projectId Project ID to enable minting on.
     * @param coreContract Core contract address for the given project.
     * @param ownedNFTAddressesAdd NFT core addresses of projects to be
     * allowlisted. Indexes must align with `ownedNFTProjectIdsAdd`.
     * @param ownedNFTProjectIdsAdd Project IDs on `ownedNFTAddressesAdd`
     * whose holders shall be allowlisted to mint project `projectId`. Indexes
     * must align with `ownedNFTAddressesAdd`.
     * @param ownedNFTAddressesRemove NFT core addresses of projects to be
     * removed from allowlist. Indexes must align with
     * `ownedNFTProjectIdsRemove`.
     * @param ownedNFTProjectIdsRemove Project IDs on
     * `ownedNFTAddressesRemove` whose holders will be removed from allowlist
     * to mint project `projectId`. Indexes must align with
     * `ownedNFTAddressesRemove`.
     * @dev if a project is included in both add and remove arrays, it will be
     * removed.
     */
    function allowAndRemoveHoldersOfProjects(
        uint256 projectId,
        address coreContract,
        address[] memory ownedNFTAddressesAdd,
        uint256[] memory ownedNFTProjectIdsAdd,
        address[] memory ownedNFTAddressesRemove,
        uint256[] memory ownedNFTProjectIdsRemove
    ) external {
        AuthLib.onlyArtist({
            _projectId: projectId,
            _coreContract: coreContract,
            _sender: msg.sender
        });
        TokenHolderLib.allowAndRemoveHoldersOfProjects({
            _projectId: projectId,
            _coreContract: coreContract,
            _ownedNFTAddressesAdd: ownedNFTAddressesAdd,
            _ownedNFTProjectIdsAdd: ownedNFTProjectIdsAdd,
            _ownedNFTAddressesRemove: ownedNFTAddressesRemove,
            _ownedNFTProjectIdsRemove: ownedNFTProjectIdsRemove
        });
    }

    /**
     * @notice Allows the artist to increment the minter to the next polyptych panel
     * @param projectId Project ID to increment to its next polyptych panel
     * @param coreContract Core contract address for the given project.
     */
    function incrementPolyptychProjectPanelId(
        uint256 projectId,
        address coreContract
    ) public {
        AuthLib.onlyArtist({
            _projectId: projectId,
            _coreContract: coreContract,
            _sender: msg.sender
        });
        PolyptychLib.incrementPolyptychProjectPanelId({
            _projectId: projectId,
            _coreContract: coreContract
        });
    }

    /**
     * @notice Purchases a token from project `projectId` on core contract
     * `coreContract` using an owned NFT at address `ownedNFTAddress` and
     * token ID `ownedNFTTokenId` as the parent token.
     * @param projectId Project ID to mint a token on.
     * @param coreContract Core contract address for the given project.
     * @param ownedNFTAddress ERC-721 NFT address holding the project token
     * owned by msg.sender being used as the parent token.
     * @param ownedNFTTokenId ERC-721 NFT token ID owned by msg.sender to be
     * used as the parent token.
     * @return tokenId Token ID of minted token
     */
    function purchase(
        uint256 projectId,
        address coreContract,
        address ownedNFTAddress,
        uint256 ownedNFTTokenId
    ) external payable returns (uint256 tokenId) {
        tokenId = purchaseTo(
            msg.sender,
            projectId,
            coreContract,
            ownedNFTAddress,
            ownedNFTTokenId,
            address(0)
        );
        return tokenId;
    }

    /**
     * @notice Purchases a token from project `projectId` on core contract
     * `coreContract` using an owned NFT at address `ownedNFTAddress` and
     * token ID `ownedNFTTokenId` as the parent token.
     * Sets the token's owner to `to`.
     * @param to Address to be the new token's owner.
     * @param projectId Project ID to mint a token on.
     * @param coreContract Core contract address for the given project.
     * @param ownedNFTAddress ERC-721 NFT holding the project token owned by
     * msg.sender being used as the parent token.
     * @param ownedNFTTokenId ERC-721 NFT token ID owned by msg.sender being used
     * as the parent token.
     * @return tokenId Token ID of minted token
     */
    function purchaseTo(
        address to,
        uint256 projectId,
        address coreContract,
        address ownedNFTAddress,
        uint256 ownedNFTTokenId
    ) external payable returns (uint256 tokenId) {
        return
            purchaseTo(
                to,
                projectId,
                coreContract,
                ownedNFTAddress,
                ownedNFTTokenId,
                address(0)
            );
    }

    // public getter functions
    /**
     * @notice Gets the maximum invocations project configuration.
     * @param projectId The ID of the project whose data needs to be fetched.
     * @param coreContract The address of the core contract.
     * @return MaxInvocationsLib.MaxInvocationsProjectConfig instance with the
     * configuration data.
     */
    function maxInvocationsProjectConfig(
        uint256 projectId,
        address coreContract
    )
        external
        view
        returns (MaxInvocationsLib.MaxInvocationsProjectConfig memory)
    {
        return
            MaxInvocationsLib.getMaxInvocationsProjectConfig(
                projectId,
                coreContract
            );
    }

    /**
     * @notice Gets the set price project configuration.
     * @param projectId The ID of the project whose data needs to be fetched.
     * @param coreContract The address of the core contract.
     * @return SetPriceProjectConfig struct with the fixed price project
     * configuration data.
     */
    function setPriceProjectConfig(
        uint256 projectId,
        address coreContract
    ) external view returns (SetPriceLib.SetPriceProjectConfig memory) {
        return SetPriceLib.getSetPriceProjectConfig(projectId, coreContract);
    }

    /**
     * @notice Checks if a specific NFT owner is allowed in a given project.
     * @dev This function retrieves the allowance status of an NFT owner
     * within a specific project from the allowedProjectHoldersMapping.
     * @param projectId The ID of the project to check.
     * @param coreContract Core contract address for the given project.
     * @param ownedNFTAddress The address of the owned NFT contract.
     * @param ownedNFTProjectId The ID of the owned NFT project.
     * @return bool True if the NFT owner is allowed in the given project, False otherwise.
     */
    function allowedProjectHolders(
        uint256 projectId,
        address coreContract,
        address ownedNFTAddress,
        uint256 ownedNFTProjectId
    ) external view returns (bool) {
        return
            TokenHolderLib
                .getHolderProjectConfig(projectId, coreContract)
                .allowedProjectHolders[ownedNFTAddress][ownedNFTProjectId];
    }

    /**
     * @notice Returns if token is an allowlisted NFT for project `projectId`.
     * @param projectId Project ID to be checked.
     * @param coreContract Core contract address for the given project.
     * @param ownedNFTAddress ERC-721 NFT token address to be checked.
     * @param ownedNFTTokenId ERC-721 NFT token ID to be checked.
     * @return bool Token is allowlisted
     * @dev does not check if token has been used to purchase
     * @dev assumes project ID can be derived from tokenId / 1_000_000
     */
    function isAllowlistedNFT(
        uint256 projectId,
        address coreContract,
        address ownedNFTAddress,
        uint256 ownedNFTTokenId
    ) external view returns (bool) {
        return
            TokenHolderLib.isAllowlistedNFT({
                _projectId: projectId,
                _coreContract: coreContract,
                _ownedNFTAddress: ownedNFTAddress,
                _ownedNFTTokenId: ownedNFTTokenId
            });
    }

    /**
     * @notice Checks if the specified `coreContract` is a valid engine contract.
     * @dev This function retrieves the cached value of `isEngine` from
     * the `isEngineCache` mapping. If the cached value is already set, it
     * returns the cached value. Otherwise, it calls the `getV3CoreIsEngine`
     * function from the `SplitFundsLib` library to check if `coreContract`
     * is a valid engine contract.
     * @dev This function will revert if the provided `coreContract` is not
     * a valid Engine or V3 Flagship contract.
     * @param coreContract The address of the contract to check.
     * @return bool indicating if `coreContract` is a valid engine contract.
     */
    function isEngineView(address coreContract) external view returns (bool) {
        SplitFundsLib.IsEngineCache storage isEngineCache = SplitFundsLib
            .getIsEngineCacheConfig(coreContract);
        if (isEngineCache.isCached) {
            return isEngineCache.isEngine;
        } else {
            // @dev this calls the non-modifying variant of getV3CoreIsEngine
            return SplitFundsLib.getV3CoreIsEngineView(coreContract);
        }
    }

    /**
     * @notice projectId => has project reached its maximum number of
     * invocations? Note that this returns a local cache of the core contract's
     * state, and may be out of sync with the core contract. This is
     * intentional, as it only enables gas optimization of mints after a
     * project's maximum invocations has been reached. A false negative will
     * only result in a gas cost increase, since the core contract will still
     * enforce a maxInvocation check during minting. A false positive is not
     * possible because the V3 core contract only allows maximum invocations
     * to be reduced, not increased. Based on this rationale, we intentionally
     * do not do input validation in this method as to whether or not the input
     * @param `projectId` is an existing project ID.
     * @param `coreContract` is an existing core contract address.
     */
    function projectMaxHasBeenInvoked(
        uint256 projectId,
        address coreContract
    ) external view returns (bool) {
        return MaxInvocationsLib.getMaxHasBeenInvoked(projectId, coreContract);
    }

    /**
     * @notice projectId => project's maximum number of invocations.
     * Optionally synced with core contract value, for gas optimization.
     * Note that this returns a local cache of the core contract's
     * state, and may be out of sync with the core contract. This is
     * intentional, as it only enables gas optimization of mints after a
     * project's maximum invocations has been reached.
     * @dev A number greater than the core contract's project max invocations
     * will only result in a gas cost increase, since the core contract will
     * still enforce a maxInvocation check during minting. A number less than
     * the core contract's project max invocations is only possible when the
     * project's max invocations have not been synced on this minter, since the
     * V3 core contract only allows maximum invocations to be reduced, not
     * increased. When this happens, the minter will enable minting, allowing
     * the core contract to enforce the max invocations check. Based on this
     * rationale, we intentionally do not do input validation in this method as
     * to whether or not the input `projectId` is an existing project ID.
     * @param `projectId` is an existing project ID.
     * @param `coreContract` is an existing core contract address.
     */
    function projectMaxInvocations(
        uint256 projectId,
        address coreContract
    ) external view returns (uint256) {
        return MaxInvocationsLib.getMaxInvocations(projectId, coreContract);
    }

    /**
     * @notice Gets your balance of the ERC20 token currently set
     * as the payment currency for project `projectId` in the core
     * contract `coreContract`.
     * @param projectId Project ID to be queried.
     * @param coreContract The address of the core contract.
     * @return balance Balance of ERC20
     */
    function getYourBalanceOfProjectERC20(
        uint256 projectId,
        address coreContract
    ) external view returns (uint256 balance) {
        (address currencyAddress, ) = SplitFundsLib.getCurrencyInfoERC20(
            projectId,
            coreContract
        );
        balance = SplitFundsLib.getERC20Balance(currencyAddress, msg.sender);
        return balance;
    }

    /**
     * @notice Gets your allowance for this minter of the ERC20
     * token currently set as the payment currency for project
     * `projectId`.
     * @param projectId Project ID to be queried.
     * @param coreContract The address of the core contract.
     * @return remaining Remaining allowance of ERC20
     */
    function checkYourAllowanceOfProjectERC20(
        uint256 projectId,
        address coreContract
    ) external view returns (uint256 remaining) {
        (address currencyAddress, ) = SplitFundsLib.getCurrencyInfoERC20(
            projectId,
            coreContract
        );
        remaining = SplitFundsLib.getERC20Allowance({
            _currencyAddress: currencyAddress,
            _walletAddress: msg.sender,
            _spenderAddress: address(this)
        });
        return remaining;
    }

    /**
     * @notice Gets if price of token is configured, price of minting a
     * token on project `projectId`, and currency symbol and address to be
     * used as payment.
     * `isConfigured` is only true if a price has been configured, and an ERC20
     * token has been configured.
     * @param projectId Project ID to get price information for
     * @param coreContract Contract address of the core contract
     * @return isConfigured true only if token price has been configured on
     * this minter and an ERC20 token has been configured
     * @return tokenPriceInWei current price of token on this minter - invalid
     * if price has not yet been configured
     * @return currencySymbol currency symbol for purchases of project on this
     * minter. "UNCONFIG" if not yet configured. Note that currency symbol is
     * defined by the artist, and is not necessarily the same as the ERC20
     * token symbol on-chain.
     * @return currencyAddress currency address for purchases of project on
     * this minter. Null address if not yet configured.
     */
    function getPriceInfo(
        uint256 projectId,
        address coreContract
    )
        external
        view
        returns (
            bool isConfigured,
            uint256 tokenPriceInWei,
            string memory currencySymbol,
            address currencyAddress
        )
    {
        SetPriceLib.SetPriceProjectConfig
            storage _setPriceProjectConfig = SetPriceLib
                .getSetPriceProjectConfig(projectId, coreContract);
        tokenPriceInWei = _setPriceProjectConfig.pricePerTokenInWei;
        // get currency info from SplitFundsLib
        (currencyAddress, currencySymbol) = SplitFundsLib.getCurrencyInfoERC20(
            projectId,
            coreContract
        );
        // report if price and ERC20 token are configured
        // @dev currencyAddress is non-zero if an ERC20 token is configured
        isConfigured =
            _setPriceProjectConfig.priceIsConfigured &&
            currencyAddress != address(0);
    }

    /**
     * Gets the current polyptych panel ID for the given project.
     * @param projectId Project ID to be queried
     * @param coreContract Contract address of the core contract
     * @return uint256 representing the current polyptych panel ID for the
     * given project
     */
    function getCurrentPolyptychPanelId(
        uint256 projectId,
        address coreContract
    ) external view returns (uint256) {
        return
            PolyptychLib.getPolyptychPanelId({
                _projectId: projectId,
                _coreContract: coreContract
            });
    }

    /**
     * Gets if the hash seed for the given project has been used on a given
     * polyptych panel id. The current polyptych panel ID for a given project
     * can be queried via the view function `getCurrentPolyptychPanelId`.
     * @param projectId Project ID to be queried
     * @param coreContract Contract address of the core contract
     * @param panelId Panel ID to be queried
     * @param hashSeed Hash seed to be queried
     * @return bool representing if the hash seed has been used on the given
     * polyptych panel ID
     */
    function getPolyptychPanelHashSeedIsMinted(
        uint256 projectId,
        address coreContract,
        uint256 panelId,
        bytes12 hashSeed
    ) external view returns (bool) {
        return
            PolyptychLib.getPolyptychPanelHashSeedIsMinted({
                _projectId: projectId,
                _coreContract: coreContract,
                _panelId: panelId,
                _hashSeed: hashSeed
            });
    }

    /**
     * @notice Syncs local maximum invocations of project `projectId` based on
     * the value currently defined in the core contract.
     * @param projectId Project ID to set the maximum invocations for.
     * @param coreContract Core contract address for the given project.
     * @dev this enables gas reduction after maxInvocations have been reached -
     * core contracts shall still enforce a maxInvocation check during mint.
     */
    function syncProjectMaxInvocationsToCore(
        uint256 projectId,
        address coreContract
    ) public {
        AuthLib.onlyArtist({
            _projectId: projectId,
            _coreContract: coreContract,
            _sender: msg.sender
        });

        MaxInvocationsLib.syncProjectMaxInvocationsToCore(
            projectId,
            coreContract
        );
    }

    /**
     * @notice Purchases a token from project `projectId` on core contract
     * `coreContract` using an owned NFT at address `ownedNFTAddress` and
     * token ID `ownedNFTTokenId` as the parent token.
     * Sets the token's owner to `to`.
     * Parent token must be owned by `msg.sender`, or `vault` if `msg.sender`
     * is a valid delegate for `vault`.
     * @param to Address to be the new token's owner.
     * @param projectId Project ID to mint a token on.
     * @param coreContract Core contract address for the given project.
     * @param ownedNFTAddress ERC-721 NFT holding the project token owned by
     * msg.sender or `vault` being used as the parent token.
     * @param ownedNFTTokenId ERC-721 NFT token ID owned by msg.sender or
     * `vault` being used as the parent token.
     * @return tokenId Token ID of minted token
     */
    function purchaseTo(
        address to,
        uint256 projectId,
        address coreContract,
        address ownedNFTAddress,
        uint256 ownedNFTTokenId,
        address vault
    ) public payable nonReentrant returns (uint256 tokenId) {
        // CHECKS
        // pre-mint MaxInvocationsLib checks
        // Note that `maxHasBeenInvoked` is only checked here to reduce gas
        // consumption after a project has been fully minted.
        // `maxInvocationsProjectConfig.maxHasBeenInvoked` is locally cached to reduce
        // gas consumption, but if not in sync with the core contract's value,
        // the core contract also enforces its own max invocation check during
        // minting.
        MaxInvocationsLib.preMintChecks(projectId, coreContract);

        // pre-mint checks for set price lib, and get price per token in wei
        // @dev price per token is loaded into memory here for gas efficiency
        uint256 pricePerTokenInWei = SetPriceLib.preMintChecksAndGetPrice(
            projectId,
            coreContract
        );
        // @dev revert occurs during payment split if ERC20 token is not
        // configured (i.e. address(0)), so check is not performed here

        // require token used to claim to be in set of allowlisted NFTs
        require(
            TokenHolderLib.isAllowlistedNFT({
                _projectId: projectId,
                _coreContract: coreContract,
                _ownedNFTAddress: ownedNFTAddress,
                _ownedNFTTokenId: ownedNFTTokenId
            }),
            "Only allowlisted NFTs"
        );

        // NOTE: delegate-vault handling **begins here**.

        // handle that the vault may be either the `msg.sender` in the case
        // that there is not a true vault, or may be `vault` if one is
        // provided explicitly (and it is valid).
        address vault_ = msg.sender;
        if (vault != address(0)) {
            // If a vault is provided, it must be valid, otherwise throw rather
            // than optimistically-minting with original `msg.sender`.
            // Note, we do not check `checkDelegateForAll` or `checkDelegateForContract` as well,
            // as they are known to be implicitly checked by calling `checkDelegateForToken`.
            bool isValidVault = _delegationRegistryContract
                .checkDelegateForToken(
                    msg.sender, // delegate
                    vault, // vault
                    coreContract, // contract
                    ownedNFTTokenId // tokenId
                );
            require(isValidVault, "Invalid delegate-vault pairing");
            vault_ = vault;
        }

        // we need the new token ID in advance of the randomizer setting a token hash
        IGenArt721CoreContractV3_Base genArtCoreContract = IGenArt721CoreContractV3_Base(
                coreContract
            );
        (uint256 _invocations, , , , , ) = genArtCoreContract.projectStateData(
            projectId
        );

        // EFFECTS

        // we need to store the new token ID before it is minted so the randomizer can query it
        // block scope to avoid stack too deep error
        {
            bytes12 _targetHashSeed = PolyptychLib.getTokenHashSeed(
                ownedNFTAddress,
                ownedNFTTokenId
            );

            PolyptychLib.validatePolyptychEffects({
                _projectId: projectId,
                _coreContract: coreContract,
                _tokenHashSeed: _targetHashSeed
            });

            uint256 _newTokenId = (projectId * ONE_MILLION) + _invocations;
            PolyptychLib.setPolyptychHashSeed({
                _coreContract: coreContract,
                _tokenId: _newTokenId, // new token ID
                _hashSeed: _targetHashSeed
            });

            // once mint() is called, the polyptych randomizer will either:
            // 1) assign a random token hash
            // 2) if configured, obtain the token hash from the `polyptychSeedHashes` mapping
            tokenId = _minterFilter.mint_joo(
                to,
                projectId,
                coreContract,
                vault_
            );

            // NOTE: delegate-vault handling **ends here**.

            // redundant check against reentrancy
            PolyptychLib.validateAssignedHashSeed({
                _coreContract: coreContract,
                _tokenId: tokenId,
                _targetHashSeed: _targetHashSeed
            });
        }

        MaxInvocationsLib.validatePurchaseEffectsInvocations(
            tokenId,
            coreContract
        );

        // INTERACTIONS
        // block scope to avoid stack too deep error
        {
            // require proper ownership of NFT used to redeem
            /**
             * @dev Considered an interaction because calling ownerOf on an NFT
             * contract. Plan is to only integrate with AB/PBAB NFTs on the minter, but
             * in case other NFTs are registered, better to check here. Also,
             * function is non-reentrant, so this is extra cautious.
             */
            // @dev if the artist is the sender, then the NFT must be owned by the
            // recipient, otherwise the NFT must be owned by the vault_
            address _artist = genArtCoreContract.projectIdToArtistAddress(
                projectId
            );
            address targetOwner = (msg.sender == _artist) ? to : vault_;
            TokenHolderLib.validateNFTOwnership({
                _ownedNFTAddress: ownedNFTAddress,
                _ownedNFTTokenId: ownedNFTTokenId,
                _targetOwner: targetOwner
            });
        }

        // split funds
        // process payment in ERC20
        SplitFundsLib.splitFundsERC20({
            _projectId: projectId,
            _pricePerTokenInWei: pricePerTokenInWei,
            _coreContract: coreContract
        });

        return tokenId;
    }
}
