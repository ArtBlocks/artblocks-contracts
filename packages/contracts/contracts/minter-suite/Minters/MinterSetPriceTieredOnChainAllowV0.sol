// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
pragma solidity 0.8.19;

import {IGenArt721CoreContractV3_Base} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import {ISharedMinterSimplePurchaseV0} from "../../interfaces/v0.8.x/ISharedMinterSimplePurchaseV0.sol";
import {ISharedMinterV0} from "../../interfaces/v0.8.x/ISharedMinterV0.sol";
import {IMinterFilterV1} from "../../interfaces/v0.8.x/IMinterFilterV1.sol";

import {ABHelpers} from "../../libs/v0.8.x/ABHelpers.sol";
import {AuthLib} from "../../libs/v0.8.x/AuthLib.sol";
import {SplitFundsLib} from "../../libs/v0.8.x/minter-libs/SplitFundsLib.sol";
import {MaxInvocationsLib} from "../../libs/v0.8.x/minter-libs/MaxInvocationsLib.sol";
import {SetPriceLib} from "../../libs/v0.8.x/minter-libs/SetPriceLib.sol";
import {OnChainAllowlistLib} from "../../libs/v0.8.x/minter-libs/OnChainAllowlistLib.sol";
import {PolyptychLib} from "../../libs/v0.8.x/minter-libs/PolyptychLib.sol";

import {ReentrancyGuard} from "@openzeppelin-4.5/contracts/security/ReentrancyGuard.sol";

/**
 * @title Shared, filtered Minter contract that allows tokens to be minted with
 * ETH, with dual pricing for on-chain allowlisted addresses and the general
 * public.
 * Allowlisted addresses mint at the artist-configured allowlist price, while
 * non-allowlisted addresses mint at the artist-configured public price.
 * This is designed to be used with GenArt721CoreContractV3 flagship or
 * engine contracts.
 * This minter also supports an optional hash seed assignment during purchase,
 * allowing the purchaser to assign a hash seed in the same transaction as the
 * mint via the `purchaseToWithHashSeed` function.
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
 * - updatePricesPerTokenInWei
 * - syncProjectMaxInvocationsToCore
 * - manuallyLimitProjectMaxInvocations
 * - addAddressesToAllowlist
 * - removeAddressesFromAllowlist
 * - addAndRemoveAddressesFromAllowlist
 * ----------------------------------------------------------------------------
 * Additional admin and artist privileged roles may be described on other
 * contracts that this minter integrates with.
 * ----------------------------------------------------------------------------
 * @notice Caution: While Engine projects must be registered on the Art Blocks
 * Core Registry to assign this minter, this minter does not enforce that a
 * project is registered when configured or queried. This is primarily for gas
 * optimization purposes. It is, therefore, possible that fake projects may be
 * configured on this minter, but they will not be able to mint tokens due to
 * checks performed by this minter's Minter Filter.
 */
contract MinterSetPriceTieredOnChainAllowV0 is
    ReentrancyGuard,
    ISharedMinterSimplePurchaseV0,
    ISharedMinterV0
{
    /// Minter filter address this minter interacts with
    address public immutable minterFilterAddress;

    /// Minter filter this minter may interact with.
    IMinterFilterV1 private immutable _minterFilter;

    /// minterType for this minter
    string public constant minterType = "MinterSetPriceTieredOnChainAllowV0";

    /// minter version for this minter
    string public constant minterVersion = "v0.1.0";

    // MODIFIERS
    // @dev contract uses modifier-like internal functions instead of modifiers
    // to reduce contract bytecode size
    // @dev contract uses AuthLib for some modifier-like functions

    // Diamond storage for allowlist price configuration (minter-specific)
    bytes32 constant ALLOWLIST_PRICE_STORAGE_POSITION =
        keccak256("mintersetpricetieredonchainallowv0.allowlistprice.storage");

    struct AllowlistPriceStorage {
        mapping(address coreContract => mapping(uint256 projectId => uint256 allowlistPricePerToken)) prices;
    }

    /**
     * @notice Initializes contract to be a Filtered Minter for
     * `minterFilter` minter filter.
     * @param minterFilter Minter filter for which this will be a
     * filtered minter.
     */
    constructor(address minterFilter) ReentrancyGuard() {
        minterFilterAddress = minterFilter;
        _minterFilter = IMinterFilterV1(minterFilter);
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
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender
        });
        MaxInvocationsLib.manuallyLimitProjectMaxInvocations({
            projectId: projectId,
            coreContract: coreContract,
            maxInvocations: maxInvocations
        });
    }

    /**
     * @notice Updates this minter's public and allowlist prices per token of
     * project `projectId`, in Wei. The public price is paid by
     * non-allowlisted addresses, and the allowlist price is paid by
     * allowlisted addresses.
     * @dev Note that it is intentionally supported here that either configured
     * price may be explicitly set to `0`.
     * @param projectId Project ID to set the prices for.
     * @param coreContract Core contract address for the given project.
     * @param publicPricePerTokenInWei Public price per token, in Wei.
     * @param allowlistPricePerTokenInWei Allowlist price per token, in Wei.
     */
    function updatePricesPerTokenInWei(
        uint256 projectId,
        address coreContract,
        uint248 publicPricePerTokenInWei,
        uint248 allowlistPricePerTokenInWei
    ) external {
        AuthLib.onlyArtist({
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender
        });
        SetPriceLib.updatePricePerToken({
            projectId: projectId,
            coreContract: coreContract,
            pricePerToken: publicPricePerTokenInWei
        });
        _allowlistPriceStorage().prices[coreContract][
            projectId
        ] = allowlistPricePerTokenInWei;

        // for convenience, sync local max invocations to the core contract if
        // and only if max invocations have not already been synced.
        // @dev do not sync if max invocations have already been synced, as
        // local max invocations could have been manually set to be
        // intentionally less than the core contract's max invocations.
        // @dev if local maxInvocations and maxHasBeenInvoked are both
        // initial values, we know they have not been populated on this minter
        if (
            MaxInvocationsLib.maxInvocationsIsUnconfigured({
                projectId: projectId,
                coreContract: coreContract
            })
        ) {
            MaxInvocationsLib.syncProjectMaxInvocationsToCore({
                projectId: projectId,
                coreContract: coreContract
            });
        }
    }

    /**
     * @notice Adds addresses to the allowlist for project `projectId`.
     * @param projectId Project ID to add addresses to the allowlist for.
     * @param coreContract Core contract address for the given project.
     * @param addresses Array of addresses to add to the allowlist.
     */
    function addAddressesToAllowlist(
        uint256 projectId,
        address coreContract,
        address[] calldata addresses
    ) external {
        AuthLib.onlyArtist({
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender
        });
        OnChainAllowlistLib.addAddressesToAllowlist({
            projectId: projectId,
            coreContract: coreContract,
            addresses: addresses
        });
    }

    /**
     * @notice Removes addresses from the allowlist for project `projectId`.
     * @param projectId Project ID to remove addresses from the allowlist for.
     * @param coreContract Core contract address for the given project.
     * @param addresses Array of addresses to remove from the allowlist.
     */
    function removeAddressesFromAllowlist(
        uint256 projectId,
        address coreContract,
        address[] calldata addresses
    ) external {
        AuthLib.onlyArtist({
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender
        });
        OnChainAllowlistLib.removeAddressesFromAllowlist({
            projectId: projectId,
            coreContract: coreContract,
            addresses: addresses
        });
    }

    /**
     * @notice Adds and removes addresses from the allowlist for project
     * `projectId` in a single transaction.
     * @param projectId Project ID to modify the allowlist for.
     * @param coreContract Core contract address for the given project.
     * @param addressesToAdd Array of addresses to add to the allowlist.
     * @param addressesToRemove Array of addresses to remove from the allowlist.
     * @dev if an address is included in both add and remove arrays, it will
     * be removed.
     */
    function addAndRemoveAddressesFromAllowlist(
        uint256 projectId,
        address coreContract,
        address[] calldata addressesToAdd,
        address[] calldata addressesToRemove
    ) external {
        AuthLib.onlyArtist({
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender
        });
        OnChainAllowlistLib.addAddressesToAllowlist({
            projectId: projectId,
            coreContract: coreContract,
            addresses: addressesToAdd
        });
        OnChainAllowlistLib.removeAddressesFromAllowlist({
            projectId: projectId,
            coreContract: coreContract,
            addresses: addressesToRemove
        });
    }

    /**
     * @notice Purchases a token from project `projectId`.
     * @param projectId Project ID to mint a token on.
     * @param coreContract Core contract address for the given project.
     * @return tokenId Token ID of minted token
     */
    function purchase(
        uint256 projectId,
        address coreContract
    ) external payable returns (uint256 tokenId) {
        tokenId = purchaseTo({
            to: msg.sender,
            projectId: projectId,
            coreContract: coreContract
        });
        return tokenId;
    }

    /**
     * @notice Purchases `quantity` tokens from project `projectId`.
     * Validates that msg.value is sufficient for the total cost based on the
     * caller's price tier. Refunds any excess ETH.
     * @param projectId Project ID to mint tokens on.
     * @param coreContract Core contract address for the given project.
     * @param quantity Number of tokens to purchase. Must be greater than 0.
     * @return tokenIds Array of token IDs of minted tokens
     */
    function purchaseMultiple(
        uint256 projectId,
        address coreContract,
        uint24 quantity
    ) external payable returns (uint256[] memory tokenIds) {
        tokenIds = purchaseMultipleTo({
            to: msg.sender,
            projectId: projectId,
            coreContract: coreContract,
            quantity: quantity
        });
        return tokenIds;
    }

    /**
     * @notice Purchases a token from project `projectId` and assigns a hash
     * seed to the token in the same transaction.
     * @param projectId Project ID to mint a token on.
     * @param coreContract Core contract address for the given project.
     * @param hashSeed Hash seed to assign to the token. Must be non-zero.
     * @return tokenId Token ID of minted token
     */
    function purchaseWithHashSeed(
        uint256 projectId,
        address coreContract,
        bytes12 hashSeed
    ) external payable returns (uint256 tokenId) {
        tokenId = purchaseToWithHashSeed({
            to: msg.sender,
            projectId: projectId,
            coreContract: coreContract,
            hashSeed: hashSeed
        });
        return tokenId;
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
            MaxInvocationsLib.getMaxInvocationsProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
    }

    /**
     * @notice Gets the set price project configuration (public price).
     * @param projectId The ID of the project whose data needs to be fetched.
     * @param coreContract The address of the core contract.
     * @return SetPriceProjectConfig struct with the fixed price project
     * configuration data.
     */
    function setPriceProjectConfig(
        uint256 projectId,
        address coreContract
    ) external view returns (SetPriceLib.SetPriceProjectConfig memory) {
        return
            SetPriceLib.getSetPriceProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
    }

    /**
     * @notice Returns whether an address is on the allowlist for a given
     * project.
     * @param projectId The ID of the project to check the allowlist for.
     * @param coreContract Core contract address for the given project.
     * @param wallet The address to check.
     * @return bool True if the address is on the allowlist, false otherwise.
     */
    function isAllowlisted(
        uint256 projectId,
        address coreContract,
        address wallet
    ) external view returns (bool) {
        return
            OnChainAllowlistLib.isAllowlisted({
                projectId: projectId,
                coreContract: coreContract,
                wallet: wallet
            });
    }

    /**
     * @notice Checks if the specified `coreContract` is a valid engine contract.
     * @dev This function retrieves the cached value of `isEngine` from
     * the `isEngineCache` mapping. If the cached value is already set, it
     * returns the cached value. Otherwise, it calls the `getV3CoreIsEngineView`
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
            // @dev this calls the non-state-modifying variant of isEngine
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
     * @param projectId is an existing project ID.
     * @param coreContract is an existing core contract address.
     */
    function projectMaxHasBeenInvoked(
        uint256 projectId,
        address coreContract
    ) external view returns (bool) {
        return
            MaxInvocationsLib.getMaxHasBeenInvoked({
                projectId: projectId,
                coreContract: coreContract
            });
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
     * @param projectId is an existing project ID.
     * @param coreContract is an existing core contract address.
     */
    function projectMaxInvocations(
        uint256 projectId,
        address coreContract
    ) external view returns (uint256) {
        return
            MaxInvocationsLib.getMaxInvocations({
                projectId: projectId,
                coreContract: coreContract
            });
    }

    /**
     * @notice Gets if price of token is configured, price of minting a
     * token on project `projectId`, and currency symbol and address to be
     * used as payment. Returns the public price.
     * `isConfigured` is true only if both the public price and the allowlist
     * price have been configured on this minter.
     * @param projectId Project ID to get price information for
     * @param coreContract Contract address of the core contract
     * @return isConfigured true only if both public and allowlist prices have
     * been configured on this minter
     * @return tokenPriceInWei current public price of token on this minter -
     * invalid if price has not yet been configured
     * @return currencySymbol currency symbol for purchases of project on this
     * minter. This minter always returns "ETH"
     * @return currencyAddress currency address for purchases of project on
     * this minter. This minter always returns null address, reserved for ether
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
            storage setPriceProjectConfig_ = SetPriceLib
                .getSetPriceProjectConfig({
                    projectId: projectId,
                    coreContract: coreContract
                });
        isConfigured = setPriceProjectConfig_.priceIsConfigured;
        tokenPriceInWei = setPriceProjectConfig_.pricePerToken;
        currencySymbol = "ETH";
        currencyAddress = address(0);
    }

    /**
     * @notice Gets the allowlist price for project `projectId`.
     * @param projectId Project ID to get allowlist price information for
     * @param coreContract Contract address of the core contract
     * @return allowlistPricePerTokenInWei current allowlist price per token
     * on this minter, in Wei. Only valid if prices have been configured
     * (check via `getPriceInfo`).
     */
    function getAllowlistPriceInfo(
        uint256 projectId,
        address coreContract
    ) external view returns (uint256 allowlistPricePerTokenInWei) {
        allowlistPricePerTokenInWei = _allowlistPriceStorage().prices[
            coreContract
        ][projectId];
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
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender
        });

        MaxInvocationsLib.syncProjectMaxInvocationsToCore({
            projectId: projectId,
            coreContract: coreContract
        });
    }

    /**
     * @notice Purchases a token from project `projectId` and sets
     * the token's owner to `to`.
     * @param to Address to be the new token's owner.
     * @param projectId Project ID to mint a token on.
     * @param coreContract Core contract address for the given project.
     * @return tokenId Token ID of minted token
     */
    function purchaseTo(
        address to,
        uint256 projectId,
        address coreContract
    ) public payable nonReentrant returns (uint256 tokenId) {
        tokenId = _purchaseToInternal({
            to: to,
            projectId: projectId,
            coreContract: coreContract,
            hashSeed: bytes12(0)
        });
        return tokenId;
    }

    /**
     * @notice Purchases a token from project `projectId`, sets the token's
     * owner to `to`, and assigns hash seed `hashSeed` to the token in the
     * same transaction.
     * @param to Address to be the new token's owner.
     * @param projectId Project ID to mint a token on.
     * @param coreContract Core contract address for the given project.
     * @param hashSeed Hash seed to assign to the token. Must be non-zero.
     * @return tokenId Token ID of minted token
     */
    function purchaseToWithHashSeed(
        address to,
        uint256 projectId,
        address coreContract,
        bytes12 hashSeed
    ) public payable nonReentrant returns (uint256 tokenId) {
        require(hashSeed != bytes12(0), "Only non-zero hash seeds");
        tokenId = _purchaseToInternal({
            to: to,
            projectId: projectId,
            coreContract: coreContract,
            hashSeed: hashSeed
        });
        return tokenId;
    }

    /**
     * @notice Internal function to handle token purchases, with optional hash
     * seed assignment. Determines effective price based on allowlist status:
     * allowlisted addresses pay the allowlist price, others pay the public
     * price.
     * @param to Address to be the new token's owner.
     * @param projectId Project ID to mint a token on.
     * @param coreContract Core contract address for the given project.
     * @param hashSeed Hash seed to assign to the token. If bytes12(0), no hash
     * seed assignment is performed.
     * @return tokenId Token ID of minted token
     */
    function _purchaseToInternal(
        address to,
        uint256 projectId,
        address coreContract,
        bytes12 hashSeed
    ) private returns (uint256 tokenId) {
        // CHECKS
        // pre-mint MaxInvocationsLib checks
        // Note that `maxHasBeenInvoked` is only checked here to reduce gas
        // consumption after a project has been fully minted.
        // `maxInvocationsProjectConfig.maxHasBeenInvoked` is locally cached to reduce
        // gas consumption, but if not in sync with the core contract's value,
        // the core contract also enforces its own max invocation check during
        // minting.
        MaxInvocationsLib.preMintChecks({
            projectId: projectId,
            coreContract: coreContract
        });

        // pre-mint checks for set price lib (reverts if not configured)
        // @dev since both prices are set atomically, this also confirms the
        // allowlist price has been configured
        uint256 publicPricePerTokenInWei = SetPriceLib
            .preMintChecksAndGetPrice({
                projectId: projectId,
                coreContract: coreContract
            });

        // determine effective price based on allowlist status
        uint256 pricePerTokenInWei;
        if (
            OnChainAllowlistLib.isAllowlisted({
                projectId: projectId,
                coreContract: coreContract,
                wallet: msg.sender
            })
        ) {
            pricePerTokenInWei = _allowlistPriceStorage().prices[coreContract][
                projectId
            ];
        } else {
            pricePerTokenInWei = publicPricePerTokenInWei;
        }

        require(msg.value >= pricePerTokenInWei, "Min value to mint req.");

        // EFFECTS
        // if hash seed is provided, pre-set it before minting
        if (hashSeed != bytes12(0)) {
            // get current invocations to pre-compute the new token ID
            (uint256 invocations, , , , , ) = IGenArt721CoreContractV3_Base(
                coreContract
            ).projectStateData(projectId);
            uint256 newTokenId = ABHelpers.tokenIdFromProjectIdAndTokenNumber({
                projectId: projectId,
                // @dev next token number is current invocations due to
                // number being zero-based-indexed
                tokenNumber: invocations
            });
            PolyptychLib.setPolyptychHashSeed({
                coreContract: coreContract,
                tokenId: newTokenId,
                hashSeed: hashSeed
            });
        }

        tokenId = _minterFilter.mint_joo({
            to: to,
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender
        });

        // validate hash seed was assigned correctly, if provided
        if (hashSeed != bytes12(0)) {
            PolyptychLib.validateAssignedHashSeed({
                coreContract: coreContract,
                tokenId: tokenId,
                targetHashSeed: hashSeed
            });
        }

        MaxInvocationsLib.validateMintEffectsInvocations({
            tokenId: tokenId,
            coreContract: coreContract
        });

        // INTERACTIONS
        SplitFundsLib.splitFundsETHRefundSender({
            projectId: projectId,
            pricePerTokenInWei: pricePerTokenInWei,
            coreContract: coreContract
        });

        return tokenId;
    }

    /**
     * @notice Purchases `quantity` tokens from project `projectId` and sets
     * the tokens' owner to `to`.
     * Validates that msg.value is sufficient for the total cost based on the
     * caller's price tier. Refunds any excess ETH.
     * @param to Address to be the new tokens' owner.
     * @param projectId Project ID to mint tokens on.
     * @param coreContract Core contract address for the given project.
     * @param quantity Number of tokens to purchase. Must be greater than 0.
     * @return tokenIds Array of token IDs of minted tokens
     */
    function purchaseMultipleTo(
        address to,
        uint256 projectId,
        address coreContract,
        uint24 quantity
    ) public payable nonReentrant returns (uint256[] memory tokenIds) {
        tokenIds = _purchaseMultipleToInternal({
            to: to,
            projectId: projectId,
            coreContract: coreContract,
            quantity: quantity
        });
        return tokenIds;
    }

    /**
     * @notice Internal function to handle batch token purchases. Determines
     * effective price based on allowlist status, validates total msg.value,
     * mints all tokens, splits funds per-token, and refunds any excess ETH.
     * @param to Address to be the new tokens' owner.
     * @param projectId Project ID to mint tokens on.
     * @param coreContract Core contract address for the given project.
     * @param quantity Number of tokens to purchase.
     * @return tokenIds Array of token IDs of minted tokens
     */
    function _purchaseMultipleToInternal(
        address to,
        uint256 projectId,
        address coreContract,
        uint24 quantity
    ) private returns (uint256[] memory tokenIds) {
        require(quantity > 0, "Must mint at least one token");

        // CHECKS
        MaxInvocationsLib.preMintChecks({
            projectId: projectId,
            coreContract: coreContract
        });

        // pre-mint checks for set price lib (reverts if not configured)
        // @dev since both prices are set atomically, this also confirms the
        // allowlist price has been configured
        uint256 publicPricePerTokenInWei = SetPriceLib
            .preMintChecksAndGetPrice({
                projectId: projectId,
                coreContract: coreContract
            });

        // determine effective price based on allowlist status
        uint256 pricePerTokenInWei;
        if (
            OnChainAllowlistLib.isAllowlisted({
                projectId: projectId,
                coreContract: coreContract,
                wallet: msg.sender
            })
        ) {
            pricePerTokenInWei = _allowlistPriceStorage().prices[coreContract][
                projectId
            ];
        } else {
            pricePerTokenInWei = publicPricePerTokenInWei;
        }

        // @dev overflow automatically reverts in Solidity 0.8.x
        uint256 totalCost = pricePerTokenInWei * uint256(quantity);
        require(msg.value >= totalCost, "Min value to mint req.");

        // EFFECTS
        tokenIds = new uint256[](quantity);
        for (uint256 i; i < quantity; ) {
            tokenIds[i] = _minterFilter.mint_joo({
                to: to,
                projectId: projectId,
                coreContract: coreContract,
                sender: msg.sender
            });

            MaxInvocationsLib.validateMintEffectsInvocations({
                tokenId: tokenIds[i],
                coreContract: coreContract
            });

            unchecked {
                ++i;
            }
        }

        // INTERACTIONS
        // split funds for each token individually (revenue splits are
        // calculated per-token by the core contract)
        for (uint256 i; i < quantity; ) {
            SplitFundsLib.splitRevenuesETHNoRefund({
                projectId: projectId,
                valueInWei: pricePerTokenInWei,
                coreContract: coreContract
            });
            unchecked {
                ++i;
            }
        }

        // refund any excess ETH
        uint256 refund = msg.value - totalCost;
        if (refund > 0) {
            (bool success_, ) = msg.sender.call{value: refund}("");
            require(success_, "Refund failed");
        }

        return tokenIds;
    }

    /**
     * @notice Return the storage struct for reading and writing. Uses a
     * diamond storage pattern for the allowlist price configuration.
     * @return storageStruct The AllowlistPriceStorage struct.
     */
    function _allowlistPriceStorage()
        private
        pure
        returns (AllowlistPriceStorage storage storageStruct)
    {
        bytes32 position = ALLOWLIST_PRICE_STORAGE_POSITION;
        assembly ("memory-safe") {
            storageStruct.slot := position
        }
    }
}
