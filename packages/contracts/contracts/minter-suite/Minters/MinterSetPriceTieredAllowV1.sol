// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
pragma solidity 0.8.19;

import {IGenArt721CoreContractV3_Base} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import {ISharedMinterV0} from "../../interfaces/v0.8.x/ISharedMinterV0.sol";
import {IMinterFilterV1} from "../../interfaces/v0.8.x/IMinterFilterV1.sol";

import {ABHelpers} from "../../libs/v0.8.x/ABHelpers.sol";
import {AuthLib} from "../../libs/v0.8.x/AuthLib.sol";
import {SplitFundsLib} from "../../libs/v0.8.x/minter-libs/SplitFundsLib.sol";
import {MaxInvocationsLib} from "../../libs/v0.8.x/minter-libs/MaxInvocationsLib.sol";
import {SetPriceLib} from "../../libs/v0.8.x/minter-libs/SetPriceLib.sol";
import {PolyptychLib} from "../../libs/v0.8.x/minter-libs/PolyptychLib.sol";

import {ReentrancyGuard} from "@openzeppelin-4.5/contracts/security/ReentrancyGuard.sol";

/**
 * @title Shared, filtered Minter contract that allows tokens to be minted with
 * USDC (ERC-20), with dual pricing for a single privileged allowlist address
 * and the general public.
 * The allowlist address mints at the artist-configured allowlist price, while
 * all other addresses mint at the artist-configured public price.
 * USDC is fixed for this minter at construction.
 * This is designed to be used with GenArt721CoreContractV3 flagship or
 * engine contracts.
 * This minter also supports an optional hash seed assignment during purchase,
 * allowing the purchaser to assign a hash seed in the same transaction as the
 * mint via the `purchaseToWithHashSeed` function.
 * ----------------------------------------------------------------------------
 * @notice Intended allowlist usage:
 * This minter uses a single, minter-wide allowlist address (typically a
 * privileged relay/executor used to integrate off-chain payment options),
 * rather than a general-purpose collector allowlist. The allowlist address is
 * configured at deploy time and may be updated by the Minter Filter's Admin
 * ACL. It is not fully featured for many typical allowlist sale scenarios
 * because it does not support multiple allowlisted wallets or enforce
 * per-wallet invocation limits. The allowlist address may mint until a
 * project's max invocations are reached (subject to the configured allowlist
 * price). Projects that need per-wallet mint caps, multi-address allowlists,
 * phases, or similar collector allowlist controls should use a different
 * minter.
 * ----------------------------------------------------------------------------
 * @author Art Blocks Inc.
 * @notice Privileged Roles and Ownership:
 * This contract is designed to be managed, with limited powers.
 * Privileged roles and abilities are controlled by the project's artist and
 * the shared Minter Filter's Admin ACL. These roles hold extensive power and
 * can modify minter details.
 * Care must be taken to ensure that the admin ACL contract and artist
 * addresses are secure behind a multi-sig or other access control mechanism.
 * ----------------------------------------------------------------------------
 * The following functions are restricted to a project's artist:
 * - updatePricesPerTokenInWei
 * - syncProjectMaxInvocationsToCore
 * - manuallyLimitProjectMaxInvocations
 * ----------------------------------------------------------------------------
 * The following functions are restricted to the shared minter filter's
 * Admin ACL:
 * - updateAllowlistAddress
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
contract MinterSetPriceTieredAllowV1 is ReentrancyGuard, ISharedMinterV0 {
    /// Minter filter address this minter interacts with
    address public immutable minterFilterAddress;

    /// Minter filter this minter may interact with.
    IMinterFilterV1 private immutable _minterFilter;

    /// USDC token address for this minter
    address public immutable usdcAddress;

    /// minterType for this minter
    string public constant minterType = "MinterSetPriceTieredAllowV1";

    /// minter version for this minter
    string public constant minterVersion = "v1.0.0";

    /// @notice Single privileged allowlist address for this minter
    address public allowlistAddress;

    // MODIFIERS
    // @dev contract uses modifier-like internal functions instead of modifiers
    // to reduce contract bytecode size
    // @dev contract uses AuthLib for some modifier-like functions

    /// @notice Mapping of core contract => projectId => allowlist price per token in USDC base units
    mapping(address coreContract => mapping(uint256 projectId => uint256 allowlistPricePerToken))
        private _allowlistPricePerToken;

    event AllowlistPricePerTokenUpdated(
        uint256 indexed projectId,
        address indexed coreContract,
        uint256 allowlistPricePerToken
    );

    event AllowlistAddressUpdated(address indexed allowlistAddress);

    /**
     * @notice Initializes contract to be a Filtered Minter for
     * `minterFilter` minter filter, with initial allowlist address
     * `allowlistAddress_` and fixed USDC token `usdcAddress_`.
     * @param minterFilter Minter filter for which this will be a
     * filtered minter.
     * @param allowlistAddress_ Initial privileged allowlist address.
     * @param usdcAddress_ Fixed USDC ERC-20 token address for this minter.
     */
    constructor(
        address minterFilter,
        address allowlistAddress_,
        address usdcAddress_
    ) ReentrancyGuard() {
        require(usdcAddress_ != address(0), "Only non-zero addresses");
        minterFilterAddress = minterFilter;
        _minterFilter = IMinterFilterV1(minterFilter);
        usdcAddress = usdcAddress_;
        _setAllowlistAddress(allowlistAddress_);
    }

    /**
     * @notice Updates the single privileged allowlist address for this minter.
     * Restricted to the shared minter filter's Admin ACL.
     * @param allowlistAddress_ New privileged allowlist address.
     */
    function updateAllowlistAddress(address allowlistAddress_) external {
        AuthLib.onlyMinterFilterAdminACL({
            minterFilterAddress: minterFilterAddress,
            sender: msg.sender,
            contract_: address(this),
            selector: this.updateAllowlistAddress.selector
        });
        _setAllowlistAddress(allowlistAddress_);
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
     * project `projectId`, in USDC base units.
     * The public price is paid by non-allowlisted addresses, and the allowlist
     * price is paid by the privileged allowlist address.
     * Also configures the project's SplitFunds currency to this minter's fixed
     * USDC token if not already configured.
     * @dev Note that it is intentionally supported here that either configured
     * price may be explicitly set to `0`.
     * @param projectId Project ID to set the prices for.
     * @param coreContract Core contract address for the given project.
     * @param publicPricePerTokenInWei Public price per token, in USDC base
     * units.
     * @param allowlistPricePerTokenInWei Allowlist price per token, in USDC
     * base units.
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

        // ensure project's SplitFunds currency is this minter's fixed USDC
        (address configuredCurrencyAddress, ) = SplitFundsLib
            .getCurrencyInfoERC20({
                projectId: projectId,
                coreContract: coreContract
            });
        if (configuredCurrencyAddress != usdcAddress) {
            SplitFundsLib.updateProjectCurrencyInfoERC20({
                projectId: projectId,
                coreContract: coreContract,
                currencySymbol: "USDC",
                currencyAddress: usdcAddress
            });
        }

        SetPriceLib.updatePricePerToken({
            projectId: projectId,
            coreContract: coreContract,
            pricePerToken: publicPricePerTokenInWei
        });
        _allowlistPricePerToken[coreContract][
            projectId
        ] = allowlistPricePerTokenInWei;
        emit AllowlistPricePerTokenUpdated(
            projectId,
            coreContract,
            allowlistPricePerTokenInWei
        );

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
     * @notice Purchases a token from project `projectId`.
     * @param projectId Project ID to mint a token on.
     * @param coreContract Core contract address for the given project.
     * @param maxPricePerToken Maximum price of token being allowed by the
     * purchaser, in USDC base units.
     * @param currencyAddress Currency address of token. Must equal this
     * minter's fixed USDC address.
     * @return tokenId Token ID of minted token
     */
    function purchase(
        uint256 projectId,
        address coreContract,
        uint256 maxPricePerToken,
        address currencyAddress
    ) external returns (uint256 tokenId) {
        tokenId = purchaseTo({
            to: msg.sender,
            projectId: projectId,
            coreContract: coreContract,
            maxPricePerToken: maxPricePerToken,
            currencyAddress: currencyAddress
        });
        return tokenId;
    }

    /**
     * @notice Purchases a token from project `projectId` and assigns a hash
     * seed to the token in the same transaction.
     * @param projectId Project ID to mint a token on.
     * @param coreContract Core contract address for the given project.
     * @param maxPricePerToken Maximum price of token being allowed by the
     * purchaser, in USDC base units.
     * @param currencyAddress Currency address of token. Must equal this
     * minter's fixed USDC address.
     * @param hashSeed Hash seed to assign to the token. Must be non-zero.
     * @return tokenId Token ID of minted token
     */
    function purchaseWithHashSeed(
        uint256 projectId,
        address coreContract,
        uint256 maxPricePerToken,
        address currencyAddress,
        bytes12 hashSeed
    ) external returns (uint256 tokenId) {
        tokenId = purchaseToWithHashSeed({
            to: msg.sender,
            projectId: projectId,
            coreContract: coreContract,
            maxPricePerToken: maxPricePerToken,
            currencyAddress: currencyAddress,
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
     * @notice Returns whether `wallet` is the privileged allowlist address
     * for this minter.
     * @param wallet The address to check.
     * @return bool True if the address is the configured allowlist address.
     */
    function isAllowlisted(address wallet) external view returns (bool) {
        return wallet == allowlistAddress;
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
     * @notice Gets your balance of this minter's fixed USDC token.
     * @return balance Balance of USDC
     */
    function getYourBalanceOfProjectERC20()
        external
        view
        returns (uint256 balance)
    {
        balance = SplitFundsLib.getERC20Balance({
            currencyAddress: usdcAddress,
            walletAddress: msg.sender
        });
        return balance;
    }

    /**
     * @notice Gets your allowance for this minter of this minter's fixed USDC
     * token.
     * @return remaining Remaining allowance of USDC
     */
    function checkYourAllowanceOfProjectERC20()
        external
        view
        returns (uint256 remaining)
    {
        remaining = SplitFundsLib.getERC20Allowance({
            currencyAddress: usdcAddress,
            walletAddress: msg.sender,
            spenderAddress: address(this)
        });
        return remaining;
    }

    /**
     * @notice Gets if price of token is configured, public price of minting a
     * token on project `projectId`, and currency symbol and address to be
     * used as payment.
     * Note that "tokenPriceInWei" is a misnomer for ERC20 tokens, but is used
     * here for ABI consistency with the ETH minters. The value returned
     * represents the price per token in USDC base units.
     * @param projectId Project ID to get price information for
     * @param coreContract Contract address of the core contract
     * @return isConfigured true only if prices have been configured on this
     * minter
     * @return tokenPriceInWei current public price of token on this minter, in
     * USDC base units - invalid if price has not yet been configured
     * @return currencySymbol currency symbol for purchases of project on this
     * minter. This minter always returns "USDC"
     * @return currencyAddress currency address for purchases of project on
     * this minter. This minter always returns its fixed USDC address.
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
        currencySymbol = "USDC";
        currencyAddress = usdcAddress;
    }

    /**
     * @notice Gets if price of token is configured, allowlist price of minting
     * a token on project `projectId`, and currency symbol and address to be
     * used as payment.
     * @param projectId Project ID to get allowlist price information for
     * @param coreContract Contract address of the core contract
     * @return isConfigured true only if prices have been configured on this
     * minter
     * @return tokenPriceInWei current allowlist price of token on this minter,
     * in USDC base units
     * @return currencySymbol currency symbol for purchases of project on this
     * minter.
     * @return currencyAddress currency address for purchases of project on
     * this minter.
     */
    function getAllowlistPriceInfo(
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
        tokenPriceInWei = _allowlistPricePerToken[coreContract][projectId];
        currencySymbol = "USDC";
        currencyAddress = usdcAddress;
    }

    /**
     * @notice Returns the effective price for a given wallet address on
     * project `projectId`. If the wallet is the privileged allowlist address,
     * returns the allowlist price; otherwise returns the public price.
     * @param projectId Project ID to get price information for
     * @param coreContract Contract address of the core contract
     * @param wallet Address to check the effective price for
     * @return isConfigured true only if prices have been configured for the
     * project
     * @return tokenPriceInWei effective price per token for the given wallet,
     * in USDC base units
     * @return currencySymbol currency symbol for purchases of project on this
     * minter.
     * @return currencyAddress currency address for purchases of project on
     * this minter.
     */
    function getPriceInfoForAddress(
        uint256 projectId,
        address coreContract,
        address wallet
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
        if (wallet == allowlistAddress) {
            tokenPriceInWei = _allowlistPricePerToken[coreContract][projectId];
        } else {
            tokenPriceInWei = setPriceProjectConfig_.pricePerToken;
        }
        currencySymbol = "USDC";
        currencyAddress = usdcAddress;
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
     * @param maxPricePerToken Maximum price of token being allowed by the
     * purchaser, in USDC base units.
     * @param currencyAddress Currency address of token. Must equal this
     * minter's fixed USDC address.
     * @return tokenId Token ID of minted token
     */
    function purchaseTo(
        address to,
        uint256 projectId,
        address coreContract,
        uint256 maxPricePerToken,
        address currencyAddress
    ) public nonReentrant returns (uint256 tokenId) {
        tokenId = _purchaseToInternal({
            to: to,
            projectId: projectId,
            coreContract: coreContract,
            maxPricePerToken: maxPricePerToken,
            currencyAddress: currencyAddress,
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
     * @param maxPricePerToken Maximum price of token being allowed by the
     * purchaser, in USDC base units.
     * @param currencyAddress Currency address of token. Must equal this
     * minter's fixed USDC address.
     * @param hashSeed Hash seed to assign to the token. Must be non-zero.
     * @return tokenId Token ID of minted token
     */
    function purchaseToWithHashSeed(
        address to,
        uint256 projectId,
        address coreContract,
        uint256 maxPricePerToken,
        address currencyAddress,
        bytes12 hashSeed
    ) public nonReentrant returns (uint256 tokenId) {
        require(hashSeed != bytes12(0), "Only non-zero hash seeds");
        tokenId = _purchaseToInternal({
            to: to,
            projectId: projectId,
            coreContract: coreContract,
            maxPricePerToken: maxPricePerToken,
            currencyAddress: currencyAddress,
            hashSeed: hashSeed
        });
        return tokenId;
    }

    /**
     * @notice Internal function to handle token purchases, with optional hash
     * seed assignment. Determines effective price based on allowlist status:
     * the privileged allowlist address pays the allowlist price, others pay
     * the public price. Payment is always in this minter's fixed USDC token.
     * @param to Address to be the new token's owner.
     * @param projectId Project ID to mint a token on.
     * @param coreContract Core contract address for the given project.
     * @param maxPricePerToken Maximum price of token being allowed by the
     * purchaser, in USDC base units.
     * @param currencyAddress Currency address of token. Must equal this
     * minter's fixed USDC address.
     * @param hashSeed Hash seed to assign to the token. If bytes12(0), no hash
     * seed assignment is performed.
     * @return tokenId Token ID of minted token
     */
    function _purchaseToInternal(
        address to,
        uint256 projectId,
        address coreContract,
        uint256 maxPricePerToken,
        address currencyAddress,
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
        uint256 publicPricePerToken = SetPriceLib.preMintChecksAndGetPrice({
            projectId: projectId,
            coreContract: coreContract
        });

        // validate that the currency address matches this minter's fixed USDC
        require(
            currencyAddress == usdcAddress,
            "Currency addresses must match"
        );

        // determine effective price based on allowlist status
        uint256 pricePerToken;
        if (msg.sender == allowlistAddress) {
            pricePerToken = _allowlistPricePerToken[coreContract][projectId];
        } else {
            pricePerToken = publicPricePerToken;
        }

        // validate that the specified maximum price is greater than or equal
        // to the effective price per token
        require(
            maxPricePerToken >= pricePerToken,
            "Only max price gte token price"
        );

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
        SplitFundsLib.splitFundsERC20({
            projectId: projectId,
            pricePerToken: pricePerToken,
            coreContract: coreContract
        });

        return tokenId;
    }

    /**
     * @notice Sets and emits the privileged allowlist address.
     * @param allowlistAddress_ New privileged allowlist address.
     */
    function _setAllowlistAddress(address allowlistAddress_) private {
        require(allowlistAddress_ != address(0), "Only non-zero addresses");
        allowlistAddress = allowlistAddress_;
        emit AllowlistAddressUpdated(allowlistAddress_);
    }
}
