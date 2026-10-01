// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
// @dev 0.8.22 rather than 0.8.19 used by other set price minters, as the PMP
// interfaces depend on OpenZeppelin 5.0, which requires >=0.8.20.
pragma solidity 0.8.22;

import {ISharedMinterSimplePurchaseV0} from "../../interfaces/v0.8.x/ISharedMinterSimplePurchaseV0.sol";
import {ISharedMinterV0} from "../../interfaces/v0.8.x/ISharedMinterV0.sol";
import {IMinterFilterV1} from "../../interfaces/v0.8.x/IMinterFilterV1.sol";
import {IPMPV0} from "../../interfaces/v0.8.x/IPMPV0.sol";

import {AuthLib} from "../../libs/v0.8.x/AuthLib.sol";
import {SplitFundsLib} from "../../libs/v0.8.x/minter-libs/SplitFundsLib.sol";
import {MaxInvocationsLib} from "../../libs/v0.8.x/minter-libs/MaxInvocationsLib.sol";
import {SetPriceLib} from "../../libs/v0.8.x/minter-libs/SetPriceLib.sol";
import {RequiredPMPLib} from "../../libs/v0.8.x/minter-libs/RequiredPMPLib.sol";

import {ReentrancyGuard} from "@openzeppelin-4.5/contracts/security/ReentrancyGuard.sol";

/**
 * @title Shared, filtered Minter contract that allows tokens to be minted with
 * ETH, optionally configuring one or more of the project's post-mint parameters
 * (PMPs) in the same transaction as the mint.
 * This is designed to be used with GenArt721CoreContractV3 flagship or
 * engine contracts.
 * @author Art Blocks Inc.
 * @notice PMP configuration during purchase:
 * In addition to the standard `purchase` and `purchaseTo` functions, this
 * minter exposes `purchaseWithPMPs` and `purchaseToWithPMPs`, which accept an
 * array of PMP inputs and forward them to the PMP contract configured on this
 * minter, in the same transaction as the mint. Any number of PMPs may be
 * configured in a single purchase, but the PMP-accepting functions require at
 * least one input and reject repeated keys; use `purchase` or `purchaseTo` to
 * mint without configuring any PMPs.
 * @dev Repeated keys are rejected because the PMP contract applies inputs in
 * order with no duplicate guard, so a later input silently overwrites an
 * earlier one for the same key.
 * @notice Required PMP keys:
 * A project's artist may additionally require that specific PMP keys be
 * configured during every mint, via `setProjectRequiredPMPKeys`. Each required
 * key is validated at the time it is set: it must be part of the project's
 * active PMP config, must authenticate this minter (see below), and must never
 * lock, because a locked key could no longer be configured and would
 * permanently halt minting. While a project has required keys, `purchase` and
 * `purchaseTo` revert, as they would otherwise bypass the requirement, and the
 * PMP-accepting functions revert unless every required key is present in the
 * submitted inputs. Additional non-required keys may still be submitted.
 * @notice WARNING - required keys depend on the project's PMP config:
 * The validation performed when required keys are set is a setup-time
 * guardrail, not a durable guarantee - the artist may reconfigure the project
 * on the PMP contract at any time afterwards. An artist who invalidates a
 * required key's PMP configuration will halt all minting on the project until
 * either the PMP configuration or the project's required keys are corrected.
 * @notice IMPORTANT - required artist setup:
 * PMP authenticates the caller of `configureTokenParams`, which is this minter
 * contract (not the purchaser). For a PMP key to be configurable during
 * purchase, the project's artist must therefore configure that key on the PMP
 * contract with an `authOption` that includes `Address`, and with `authAddress`
 * set to this minter's address. `TokenOwnerAndAddress` is the expected
 * configuration, as it additionally allows the collector to update the value
 * after the mint. Purchases that pass a PMP key which is not part of the
 * project's active PMP config, or which does not authenticate this minter,
 * will revert.
 * @notice WARNING - implications of granting this minter address auth:
 * A PMP key configured with `authAddress` set to this minter may be written by
 * this minter for any token of that project, at any time before the key's
 * `pmpLockedAfterTimestamp`, not only during a purchase. Artists should only
 * grant this auth for keys that are intended to be set at mint time.
 * @notice WARNING - artist-configured PMP hooks:
 * Configuring a token's PMPs may invoke the project's artist-configured
 * post-configuration hook, which may execute arbitrary code and may revert,
 * causing the entire purchase to revert. The artist is solely responsible for
 * configuring hooks and validating their behavior.
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
 * - setProjectRequiredPMPKeys
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
contract MinterSetPricePMPV0 is
    ReentrancyGuard,
    ISharedMinterSimplePurchaseV0,
    ISharedMinterV0
{
    /// Minter filter address this minter interacts with
    address public immutable minterFilterAddress;

    /// Minter filter this minter may interact with.
    IMinterFilterV1 private immutable _minterFilter;

    /// PMP contract this minter configures token params on.
    IPMPV0 public immutable pmpContract;

    /// minterType for this minter
    string public constant minterType = "MinterSetPricePMPV0";

    /// minter version for this minter
    string public constant minterVersion = "v0.1.0";

    // MODIFIERS
    // @dev contract uses modifier-like internal functions instead of modifiers
    // to reduce contract bytecode size
    // @dev contract uses AuthLib for some modifier-like functions

    /**
     * @notice Initializes contract to be a Filtered Minter for
     * `minterFilter` minter filter.
     * @param minterFilter Minter filter for which this will be a
     * filtered minter.
     * @param pmpContract_ PMP contract on which this minter will configure
     * token params during purchases.
     */
    constructor(address minterFilter, address pmpContract_) ReentrancyGuard() {
        minterFilterAddress = minterFilter;
        _minterFilter = IMinterFilterV1(minterFilter);
        pmpContract = IPMPV0(pmpContract_);
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
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender
        });
        SetPriceLib.updatePricePerToken({
            projectId: projectId,
            coreContract: coreContract,
            pricePerToken: pricePerTokenInWei
        });

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
     * @notice Sets the PMP keys that project `projectId` requires to be
     * configured during every mint, replacing any previously set keys.
     * @dev Each key must be part of the project's active config on this
     * minter's PMP contract, must authenticate this minter as a configuring
     * address, and must never lock. Duplicate keys are rejected.
     * @dev While a project has required keys, `purchase` and `purchaseTo`
     * revert, and the PMP-accepting purchase functions require every required
     * key to be submitted.
     * @dev Pass an empty array to clear the project's required keys.
     * @param projectId Project ID to set the required PMP keys for.
     * @param coreContract Core contract address for the given project.
     * @param requiredPMPKeys PMP keys to require during mint.
     */
    function setProjectRequiredPMPKeys(
        uint256 projectId,
        address coreContract,
        string[] calldata requiredPMPKeys
    ) external {
        AuthLib.onlyArtist({
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender
        });
        RequiredPMPLib.setRequiredPMPKeys({
            projectId: projectId,
            coreContract: coreContract,
            pmpContract: address(pmpContract),
            requiredPMPKeys: requiredPMPKeys
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
     * @notice Purchases a token from project `projectId` and configures the
     * token's post-mint params `pmpInputs` in the same transaction.
     * @param projectId Project ID to mint a token on.
     * @param coreContract Core contract address for the given project.
     * @param pmpInputs PMP inputs to configure for the minted token. Must be
     * non-empty, must not contain the same key more than once, and each key
     * must be part of the project's active PMP config and authenticate this
     * minter.
     * @return tokenId Token ID of minted token
     */
    function purchaseWithPMPs(
        uint256 projectId,
        address coreContract,
        IPMPV0.PMPInput[] calldata pmpInputs
    ) external payable returns (uint256 tokenId) {
        tokenId = purchaseToWithPMPs({
            to: msg.sender,
            projectId: projectId,
            coreContract: coreContract,
            pmpInputs: pmpInputs
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
        return
            SetPriceLib.getSetPriceProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
    }

    /**
     * @notice Gets the PMP keys that project `projectId` requires to be
     * configured during every mint.
     * @param projectId The ID of the project whose data needs to be fetched.
     * @param coreContract The address of the core contract.
     * @return The project's required PMP keys. Empty if none are required.
     */
    function projectRequiredPMPKeys(
        uint256 projectId,
        address coreContract
    ) external view returns (string[] memory) {
        return
            RequiredPMPLib.getRequiredPMPKeys({
                projectId: projectId,
                coreContract: coreContract
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
     * used as payment.
     * @param projectId Project ID to get price information for
     * @param coreContract Contract address of the core contract
     * @return isConfigured true only if token price has been configured on
     * this minter
     * @return tokenPriceInWei current price of token on this minter - invalid
     * if price has not yet been configured
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
     * @dev Reverts if the project has required PMP keys, which this function
     * would otherwise bypass. Use `purchaseToWithPMPs` for such projects.
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
        // CHECKS
        uint256 pricePerTokenInWei = _preMintChecks({
            projectId: projectId,
            coreContract: coreContract
        });

        // require the project to have no required PMP keys, which this
        // function would otherwise bypass
        RequiredPMPLib.requireNoRequiredPMPKeys({
            projectId: projectId,
            coreContract: coreContract
        });

        // EFFECTS
        tokenId = _mintToken({
            to: to,
            projectId: projectId,
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
     * @notice Purchases a token from project `projectId`, sets the token's
     * owner to `to`, and configures the token's post-mint params `pmpInputs`
     * in the same transaction.
     * @param to Address to be the new token's owner.
     * @param projectId Project ID to mint a token on.
     * @param coreContract Core contract address for the given project.
     * @param pmpInputs PMP inputs to configure for the minted token. Must be
     * non-empty, must not contain the same key more than once, and each key
     * must be part of the project's active PMP config and authenticate this
     * minter.
     * @return tokenId Token ID of minted token
     */
    function purchaseToWithPMPs(
        address to,
        uint256 projectId,
        address coreContract,
        IPMPV0.PMPInput[] calldata pmpInputs
    ) public payable nonReentrant returns (uint256 tokenId) {
        // CHECKS
        // @dev use `purchase` or `purchaseTo` to mint without configuring PMPs
        require(pmpInputs.length > 0, "No PMP inputs");

        uint256 pricePerTokenInWei = _preMintChecks({
            projectId: projectId,
            coreContract: coreContract
        });

        // require every PMP key the project requires at mint to be submitted
        RequiredPMPLib.preMintChecks({
            projectId: projectId,
            coreContract: coreContract,
            pmpInputs: pmpInputs
        });

        // EFFECTS
        tokenId = _mintToken({
            to: to,
            projectId: projectId,
            coreContract: coreContract
        });

        // INTERACTIONS
        // configure the minted token's PMPs
        // @dev reverts if any key is not part of the project's active PMP
        // config, or does not authenticate this minter's address
        // @dev may invoke the project's artist-configured post-config hook
        pmpContract.configureTokenParams({
            coreContract: coreContract,
            tokenId: tokenId,
            pmpInputs: pmpInputs
        });

        SplitFundsLib.splitFundsETHRefundSender({
            projectId: projectId,
            pricePerTokenInWei: pricePerTokenInWei,
            coreContract: coreContract
        });

        return tokenId;
    }

    /**
     * @notice Internal function to perform pre-mint checks for project
     * `projectId` and return its price per token.
     * @dev Any additional, minter-specific checks are performed by the calling
     * function after this one, so that callers of a sold-out or unconfigured
     * project receive the more relevant revert reason.
     * @param projectId Project ID to mint a token on.
     * @param coreContract Core contract address for the given project.
     * @return pricePerTokenInWei Price per token of the project, in Wei
     */
    function _preMintChecks(
        uint256 projectId,
        address coreContract
    ) private view returns (uint256 pricePerTokenInWei) {
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

        // pre-mint checks for set price lib, and get price per token in wei
        // @dev price per token is loaded into memory here for gas efficiency
        pricePerTokenInWei = SetPriceLib.preMintChecksAndGetPrice({
            projectId: projectId,
            coreContract: coreContract
        });

        require(msg.value >= pricePerTokenInWei, "Min value to mint req.");

        return pricePerTokenInWei;
    }

    /**
     * @notice Internal function to mint a token from project `projectId` to
     * `to`. Does not perform pre-mint checks or split funds, both of which
     * must be handled by the calling function.
     * @param to Address to be the new token's owner.
     * @param projectId Project ID to mint a token on.
     * @param coreContract Core contract address for the given project.
     * @return tokenId Token ID of minted token
     */
    function _mintToken(
        address to,
        uint256 projectId,
        address coreContract
    ) private returns (uint256 tokenId) {
        tokenId = _minterFilter.mint_joo({
            to: to,
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender
        });

        MaxInvocationsLib.validateMintEffectsInvocations({
            tokenId: tokenId,
            coreContract: coreContract
        });

        return tokenId;
    }
}
