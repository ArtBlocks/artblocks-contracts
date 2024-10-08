// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IMinterBaseV0} from "../../../interfaces/v0.8.x/IMinterBaseV0.sol";
import {IGenArt721CoreContractV3_Base} from "../../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import {IGenArt721CoreContractV3} from "../../../interfaces/v0.8.x/IGenArt721CoreContractV3.sol";
import {IGenArt721CoreContractV3_Engine} from "../../../interfaces/v0.8.x/IGenArt721CoreContractV3_Engine.sol";

import {IERC20} from "@openzeppelin-4.7/contracts/token/ERC20/IERC20.sol";

/**
 * @title Art Blocks Split Funds Library
 * @notice This library is designed for the Art Blocks platform. It splits
 * Ether (ETH) and ERC20 token funds among stakeholders, such as sender
 * (if refund is applicable), providers, artists, and artists' additional
 * payees.
 * @author Art Blocks Inc.
 */

library SplitFundsLib {
    /**
     * @notice Currency updated for project `projectId` to symbol
     * `currencySymbol` and address `currencyAddress`.
     * @param projectId Project ID currency was updated for
     * @param coreContract Core contract address currency was updated for
     * @param currencyAddress Currency address
     * @param currencySymbol Currency symbol
     */
    event ProjectCurrencyInfoUpdated(
        uint256 indexed projectId,
        address indexed coreContract,
        address indexed currencyAddress,
        string currencySymbol
    );

    // position of Split Funds Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant SPLIT_FUNDS_LIB_STORAGE_POSITION =
        keccak256("splitfundslib.storage");

    // contract-level variables
    struct IsEngineCache {
        bool isEngine;
        bool isCached;
    }

    // project-level variables
    struct SplitFundsProjectConfig {
        address currencyAddress; // address(0) if ETH
        string currencySymbol; // Assumed to be ETH if null
    }

    // Diamond storage pattern is used in this library
    struct SplitFundsLibStorage {
        mapping(address coreContract => mapping(uint256 projectId => SplitFundsProjectConfig)) splitFundsProjectConfigs;
        mapping(address coreContract => IsEngineCache) isEngineCacheConfigs;
    }

    /**
     * @notice splits ETH funds between sender (if refund), providers,
     * artist, and artist's additional payee for a token purchased on
     * project `projectId`.
     * WARNING: This function uses msg.value and msg.sender to determine
     * refund amounts, and therefore may not be applicable to all use cases
     * (e.g. do not use with Dutch Auctions with on-chain settlement).
     * @dev This function relies on msg.sender and msg.value, so it must be
     * called directly from the contract that is receiving the payment.
     * @dev possible DoS during splits is acknowledged, and mitigated by
     * business practices, including end-to-end testing on mainnet, and
     * admin-accepted artist payment addresses.
     * @param projectId Project ID for which funds shall be split.
     * @param pricePerTokenInWei Current price of token, in Wei.
     * @param coreContract Address of the GenArt721CoreContract associated
     * with the project.
     */
    function splitFundsETHRefundSender(
        uint256 projectId,
        uint256 pricePerTokenInWei,
        address coreContract
    ) internal {
        if (msg.value > 0) {
            // send refund to sender
            uint256 refund = msg.value - pricePerTokenInWei;
            if (refund > 0) {
                (bool success_, ) = msg.sender.call{value: refund}("");
                require(success_, "Refund failed");
            }
            // split revenues
            splitRevenuesETHNoRefund({
                projectId: projectId,
                valueInWei: pricePerTokenInWei,
                coreContract: coreContract
            });
        }
    }

    /**
     * @notice pays ETH funds to sender (if refund), with all of token price
     * being sent to the render provider for a token purchased on project
     * `projectId`.
     * WARNING: This function uses msg.value and msg.sender to determine
     * refund amounts, and therefore may not be applicable to all use cases
     * (e.g. do not use with Dutch Auctions with on-chain settlement).
     * @dev This function relies on msg.sender and msg.value, so it must be
     * called directly from the contract that is receiving the payment.
     * @dev possible DoS during splits is acknowledged, and mitigated by
     * business practices, including end-to-end testing on mainnet, and
     * admin-accepted artist payment addresses.
     * @param projectId Project ID for which funds shall be split.
     * @param pricePerTokenInWei Current price of token, in Wei.
     * @param coreContract Address of the GenArt721CoreContract associated
     * with the project.
     */
    function sendAllToRenderProviderETHRefundSender(
        uint256 projectId,
        uint256 pricePerTokenInWei,
        address coreContract
    ) internal {
        if (msg.value > 0) {
            // send refund to sender
            uint256 refund = msg.value - pricePerTokenInWei;
            if (refund > 0) {
                (bool success_, ) = msg.sender.call{value: refund}("");
                require(success_, "Refund failed");
            }
            // send remaining to render provider
            sendAllToRenderProviderETHNoRefund({
                projectId: projectId,
                valueInWei: pricePerTokenInWei,
                coreContract: coreContract
            });
        }
    }

    /**
     * @notice Splits ETH revenues between providers, artist, and artist's
     * additional payee for revenue generated by project `projectId`.
     * This function does NOT refund msg.sender, and does NOT use msg.value
     * when determining the value to be split.
     * @dev possible DoS during splits is acknowledged, and mitigated by
     * business practices, including end-to-end testing on mainnet, and
     * admin-accepted artist payment addresses.
     * @param projectId Project ID for which funds shall be split.
     * @param valueInWei Value to be split, in Wei.
     * @param coreContract Address of the GenArt721CoreContract
     * associated with the project.
     */
    function splitRevenuesETHNoRefund(
        uint256 projectId,
        uint256 valueInWei,
        address coreContract
    ) internal {
        if (valueInWei == 0) {
            return; // return early
        }
        // split funds between platforms, artist, and artist's
        // additional payee
        bool isEngine_ = isEngine(coreContract);
        uint256 renderProviderRevenue;
        address payable renderProviderAddress;
        uint256 platformProviderRevenue;
        address payable platformProviderAddress;
        uint256 artistRevenue;
        address payable artistAddress;
        uint256 additionalPayeePrimaryRevenue;
        address payable additionalPayeePrimaryAddress;
        if (isEngine_) {
            // get engine splits
            (
                renderProviderRevenue,
                renderProviderAddress,
                platformProviderRevenue,
                platformProviderAddress,
                artistRevenue,
                artistAddress,
                additionalPayeePrimaryRevenue,
                additionalPayeePrimaryAddress
            ) = IGenArt721CoreContractV3_Engine(coreContract)
                .getPrimaryRevenueSplits({
                    _projectId: projectId,
                    _price: valueInWei
                });
        } else {
            // get flagship splits
            // @dev note that platformProviderAddress and
            // platformProviderRevenue remain 0 for flagship
            (
                renderProviderRevenue, // artblocks revenue
                renderProviderAddress, // artblocks address
                artistRevenue,
                artistAddress,
                additionalPayeePrimaryRevenue,
                additionalPayeePrimaryAddress
            ) = IGenArt721CoreContractV3(coreContract).getPrimaryRevenueSplits({
                _projectId: projectId,
                _price: valueInWei
            });
        }
        // require total revenue split is 100%
        // @dev note that platformProviderRevenue remains 0 for flagship
        require(
            renderProviderRevenue +
                platformProviderRevenue +
                artistRevenue +
                additionalPayeePrimaryRevenue ==
                valueInWei,
            "Invalid revenue split totals"
        );
        // distribute revenues
        // @dev note that platformProviderAddress and platformProviderRevenue
        // remain 0 for flagship
        _sendPaymentsETH({
            platformProviderRevenue: platformProviderRevenue,
            platformProviderAddress: platformProviderAddress,
            renderProviderRevenue: renderProviderRevenue,
            renderProviderAddress: renderProviderAddress,
            artistRevenue: artistRevenue,
            artistAddress: artistAddress,
            additionalPayeePrimaryRevenue: additionalPayeePrimaryRevenue,
            additionalPayeePrimaryAddress: additionalPayeePrimaryAddress
        });
    }

    /**
     * @notice Sends all revenue generated by project `projectId` to render
     * provider.
     * This function does NOT refund msg.sender, and does NOT use msg.value
     * when determining the value to be split.
     * @dev possible DoS during splits is acknowledged, and mitigated by
     * business practices, including end-to-end testing on mainnet, and
     * admin-accepted payment addresses.
     * @param projectId Project ID for which funds shall be sent.
     * @param valueInWei Value to be sent, in Wei.
     * @param coreContract Address of the GenArt721CoreContract
     * associated with the project.
     */
    function sendAllToRenderProviderETHNoRefund(
        uint256 projectId,
        uint256 valueInWei,
        address coreContract
    ) internal {
        if (valueInWei == 0) {
            return; // return early
        }
        // split funds between platforms, artist, and artist's
        // additional payee
        bool isEngine_ = isEngine(coreContract);
        address payable renderProviderAddress;
        if (isEngine_) {
            // get engine splits
            (
                ,
                renderProviderAddress,
                ,
                ,
                ,
                ,
                ,

            ) = IGenArt721CoreContractV3_Engine(coreContract)
                .getPrimaryRevenueSplits({
                    _projectId: projectId,
                    _price: valueInWei
                });
        } else {
            // get flagship splits
            // @dev note that platformProviderAddress and
            // platformProviderRevenue remain 0 for flagship
            (
                ,
                // artblocks revenue
                renderProviderAddress, // artblocks address
                ,
                ,
                ,

            ) = IGenArt721CoreContractV3(coreContract).getPrimaryRevenueSplits({
                _projectId: projectId,
                _price: valueInWei
            });
        }
        require(
            renderProviderAddress != address(0),
            "Render Provider address not set"
        );
        // distribute revenue
        // Render Provider / Art Blocks payment
        // @dev previous conditional ensures valueInWei is non-zero
        (bool success, ) = renderProviderAddress.call{value: valueInWei}("");
        require(success, "Render Provider payment failed");
    }

    /**
     * @notice Splits ERC20 funds between providers, artist, and artist's
     * additional payee, for a token purchased on project `projectId`.
     * The function performs checks to ensure that the ERC20 token is
     * approved for transfer, and that a non-zero ERC20 token address is
     * configured.
     * @dev This function relies on msg.sender, so it must be
     * called directly from the contract that is receiving the payment.
     * @dev possible DoS during splits is acknowledged, and mitigated by
     * business practices, including end-to-end testing on mainnet, and
     * admin-accepted artist payment addresses.
     * @param projectId Project ID for which funds shall be split.
     * @param pricePerToken Current price of token, in base units. For example,
     * if the ERC20 token has 6 decimals, an input value of `1_000_000` would
     * represent a price of `1.000000` tokens.
     * @param coreContract Core contract address.
     */
    function splitFundsERC20(
        uint256 projectId,
        uint256 pricePerToken,
        address coreContract
    ) internal {
        if (pricePerToken == 0) {
            return; // nothing to split, return early
        }
        IERC20 projectCurrency;
        // block scope to avoid stack too deep error
        {
            SplitFundsProjectConfig
                storage splitFundsProjectConfig = getSplitFundsProjectConfig({
                    projectId: projectId,
                    coreContract: coreContract
                });
            address currencyAddress = splitFundsProjectConfig.currencyAddress;
            require(
                currencyAddress != address(0),
                "ERC20: payment not configured"
            );
            // ERC20 token is used for payment
            validateERC20Approvals({
                msgSender: msg.sender,
                currencyAddress: currencyAddress,
                pricePerToken: pricePerToken
            });
            projectCurrency = IERC20(currencyAddress);
        }
        // split remaining funds between foundation, artist, and artist's additional payee
        bool isEngine_ = isEngine(coreContract);
        uint256 renderProviderRevenue;
        address payable renderProviderAddress;
        uint256 platformProviderRevenue;
        address payable platformProviderAddress;
        uint256 artistRevenue;
        address payable artistAddress;
        uint256 additionalPayeePrimaryRevenue;
        address payable additionalPayeePrimaryAddress;
        if (isEngine_) {
            // get engine splits
            (
                renderProviderRevenue,
                renderProviderAddress,
                platformProviderRevenue,
                platformProviderAddress,
                artistRevenue,
                artistAddress,
                additionalPayeePrimaryRevenue,
                additionalPayeePrimaryAddress
            ) = IGenArt721CoreContractV3_Engine(coreContract)
                .getPrimaryRevenueSplits({
                    _projectId: projectId,
                    _price: pricePerToken
                });
        } else {
            // get flagship splits
            // @dev note that platformProviderAddress and
            // platformProviderRevenue remain 0 for flagship
            (
                renderProviderRevenue, // artblocks revenue
                renderProviderAddress, // artblocks address
                artistRevenue,
                artistAddress,
                additionalPayeePrimaryRevenue,
                additionalPayeePrimaryAddress
            ) = IGenArt721CoreContractV3(coreContract).getPrimaryRevenueSplits({
                _projectId: projectId,
                _price: pricePerToken
            });
        }
        // require total revenue split is 100%
        // @dev note that platformProviderRevenue remains 0 for flagship
        require(
            renderProviderRevenue +
                platformProviderRevenue +
                artistRevenue +
                additionalPayeePrimaryRevenue ==
                pricePerToken,
            "Invalid revenue split totals"
        );
        // distribute revenues
        // @dev note that platformProviderAddress and platformProviderRevenue
        // remain 0 for flagship
        _sendPaymentsERC20({
            projectCurrency: projectCurrency,
            platformProviderRevenue: platformProviderRevenue,
            platformProviderAddress: platformProviderAddress,
            renderProviderRevenue: renderProviderRevenue,
            renderProviderAddress: renderProviderAddress,
            artistRevenue: artistRevenue,
            artistAddress: artistAddress,
            additionalPayeePrimaryRevenue: additionalPayeePrimaryRevenue,
            additionalPayeePrimaryAddress: additionalPayeePrimaryAddress
        });
    }

    /**
     * @notice Updates payment currency of the referenced
     * SplitFundsProjectConfig to be `currencySymbol` at address
     * `currencyAddress`.
     * Only supports setting currency info of ERC20 tokens.
     * Returns bool that is true if the price should be reset after this
     * update. Price is recommended to be reset if the currency address was
     * previously configured, but is now being updated to a different currency
     * address. This is to protect accidental price reductions when changing
     * currency if an artist is changing currencies in an unpaused state.
     * @dev artist-defined currency symbol is used instead of any on-chain
     * currency symbol.
     * @param projectId Project ID to update.
     * @param coreContract Core contract address.
     * @param currencySymbol Currency symbol.
     * @param currencyAddress Currency address.
     * @return recommendPriceReset True if the price should be reset after this
     * update.
     */
    function updateProjectCurrencyInfoERC20(
        uint256 projectId,
        address coreContract,
        string memory currencySymbol,
        address currencyAddress
    ) internal returns (bool recommendPriceReset) {
        // CHECKS
        require(currencyAddress != address(0), "null address, only ERC20");
        require(bytes(currencySymbol).length > 0, "only non-null symbol");
        // EFFECTS
        SplitFundsProjectConfig
            storage splitFundsProjectConfig = getSplitFundsProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        // recommend price reset if currency address was previously configured
        recommendPriceReset = (splitFundsProjectConfig.currencyAddress !=
            address(0));
        splitFundsProjectConfig.currencySymbol = currencySymbol;
        splitFundsProjectConfig.currencyAddress = currencyAddress;

        emit ProjectCurrencyInfoUpdated({
            projectId: projectId,
            coreContract: coreContract,
            currencyAddress: currencyAddress,
            currencySymbol: currencySymbol
        });
    }

    /**
     * @notice Force sends `amount` (in wei) ETH to `to`, with a gas stipend
     * equal to `minterRefundGasLimit`.
     * If sending via the normal procedure fails, force sends the ETH by
     * creating a temporary contract which uses `SELFDESTRUCT` to force send
     * the ETH.
     * Reverts if the current contract has insufficient balance.
     * @param to The address to send ETH to.
     * @param amount The amount of ETH to send.
     * @param minterRefundGasLimit The gas limit to use when sending ETH, prior
     * to fallback.
     * @dev This function is adapted from the `forceSafeTransferETH` function
     * in the `https://github.com/Vectorized/solady` repository, with
     * modifications to not check if the current contract has sufficient
     * balance. Therefore, the contract should be checked for sufficient
     * balance before calling this function in the minter itself, if
     * applicable.
     */
    function forceSafeTransferETH(
        address to,
        uint256 amount,
        uint256 minterRefundGasLimit
    ) internal {
        // Manually inlined because the compiler doesn't inline functions with
        // branches.
        /// @solidity memory-safe-assembly
        assembly {
            // @dev intentionally do not check if this contract has sufficient
            // balance, because that is not intended to be a valid state.

            // Transfer the ETH and check if it succeeded or not.
            if iszero(call(minterRefundGasLimit, to, amount, 0, 0, 0, 0)) {
                // if the transfer failed, we create a temporary contract with
                // initialization code that uses `SELFDESTRUCT` to force send
                // the ETH.
                // note: Compatible with `SENDALL`:
                // https://eips.ethereum.org/EIPS/eip-4758

                //---------------------------------------------------------------------------------------------------------------//
                // Opcode  | Opcode + Arguments  | Description        | Stack View                                               //
                //---------------------------------------------------------------------------------------------------------------//
                // Contract creation code that uses `SELFDESTRUCT` to force send ETH to a specified address.                     //
                // Creation code summary: 0x73<20-byte toAddress>0xff                                                            //
                //---------------------------------------------------------------------------------------------------------------//
                // 0x73    |  0x73_toAddress     | PUSH20 toAddress   | toAddress                                                //
                // 0xFF    |  0xFF               | SELFDESTRUCT       |                                                          //
                //---------------------------------------------------------------------------------------------------------------//
                // Store the address in scratch space, starting at 0x00, which begins the 20-byte address at 32-20=12 in memory
                // @dev use scratch space because we have enough space for simple creation code (less than 0x40 bytes)
                mstore(0x00, to)
                // store opcode PUSH20 immediately before the address, starting at 0x0b (11) in memory
                mstore8(0x0b, 0x73)
                // store opcode SELFDESTRUCT immediately after the address, starting at 0x20 (32) in memory
                mstore8(0x20, 0xff)
                // this will always succeed because the contract creation code is
                // valid, and the address is valid because it is a 20-byte value
                if iszero(create(amount, 0x0b, 0x16)) {
                    // @dev For better gas estimation.
                    if iszero(gt(gas(), 1000000)) {
                        revert(0, 0)
                    }
                }
            }
        }
    }

    /**
     * @notice Returns whether or not the provided address `coreContract`
     * is an Art Blocks Engine core contract. Caches the result for future access.
     * @param coreContract Address of the core contract to check.
     */
    function isEngine(address coreContract) internal returns (bool) {
        IsEngineCache storage isEngineCache = getIsEngineCacheConfig(
            coreContract
        );
        // check cache, return early if cached
        if (isEngineCache.isCached) {
            return isEngineCache.isEngine;
        }
        // populate cache and return result
        bool isEngine_ = getV3CoreIsEngineView(coreContract);
        isEngineCache.isCached = true;
        isEngineCache.isEngine = isEngine_;
        return isEngine_;
    }

    /**
     * @notice Returns whether a V3 core contract is an Art Blocks Engine
     * contract or not. Return value of false indicates that the core is a
     * flagship contract. This function does not update the cache state for the
     * given V3 core contract.
     * @dev this function reverts if a core contract does not return the
     * expected number of return values from getPrimaryRevenueSplits() for
     * either a flagship or engine core contract.
     * @dev this function uses the length of the return data (in bytes) to
     * determine whether the core is an engine or not.
     * @param coreContract The address of the deployed core contract.
     */
    function getV3CoreIsEngineView(
        address coreContract
    ) internal view returns (bool) {
        // call getPrimaryRevenueSplits() on core contract
        bytes memory payload = abi.encodeWithSignature(
            "getPrimaryRevenueSplits(uint256,uint256)",
            0,
            0
        );
        (bool success, bytes memory returnData) = coreContract.staticcall(
            payload
        );
        require(success, "getPrimaryRevenueSplits() call failed");
        // determine whether core is engine or not, based on return data length
        uint256 returnDataLength = returnData.length;
        if (returnDataLength == 6 * 32) {
            // 6 32-byte words returned if flagship (not engine)
            // @dev 6 32-byte words are expected because the non-engine core
            // contracts return a payout address and uint256 payment value for
            // the artist, and artist's additional payee, and Art Blocks.
            // also note that per Solidity ABI encoding, the address return
            // values are padded to 32 bytes.

            return false;
        } else if (returnDataLength == 8 * 32) {
            // 8 32-byte words returned if engine
            // @dev 8 32-byte words are expected because the engine core
            // contracts return a payout address and uint256 payment value for
            // the artist, artist's additional payee, render provider
            // typically Art Blocks, and platform provider (partner).
            // also note that per Solidity ABI encoding, the address return
            // values are padded to 32 bytes.
            return true;
        }
        // unexpected return value length
        revert("Unexpected revenue split bytes");
    }

    /**
     * @notice Gets the currency address and symbol for the referenced
     * SplitFundsProjectConfig.
     * Only supports ERC20 tokens - returns currencySymbol of `UNCONFIG` if
     * `currencyAddress` is zero.
     * @param projectId Project ID to get config for
     * @param coreContract Core contract address to get config for
     * @return currencyAddress currency address for the referenced SplitFundsProjectConfig.
     * @return currencySymbol currency symbol for the referenced SplitFundsProjectConfig.
     */
    function getCurrencyInfoERC20(
        uint256 projectId,
        address coreContract
    )
        internal
        view
        returns (address currencyAddress, string memory currencySymbol)
    {
        SplitFundsProjectConfig
            storage splitFundsProjectConfig = getSplitFundsProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        currencyAddress = splitFundsProjectConfig.currencyAddress;
        // default to "UNCONFIG" if project currency address is initial value
        currencySymbol = currencyAddress == address(0)
            ? "UNCONFIG"
            : splitFundsProjectConfig.currencySymbol;
    }

    /**
     * @notice Gets the balance of `currencyAddress` ERC20 tokens for `walletAddress`.
     * @param currencyAddress ERC20 token address.
     * @param walletAddress wallet address.
     * @return balance Balance of ERC-20
     */
    function getERC20Balance(
        address currencyAddress,
        address walletAddress
    ) internal view returns (uint256) {
        return IERC20(currencyAddress).balanceOf(walletAddress);
    }

    /**
     * @notice Gets the allowance of `spenderAddress` to spend `walletAddress`'s
     * `currencyAddress` ERC20 tokens.
     * @param currencyAddress ERC20 token address.
     * @param walletAddress wallet address.
     * @param spenderAddress spender address.
     * @return allowance Allowance of ERC-20
     */
    function getERC20Allowance(
        address currencyAddress,
        address walletAddress,
        address spenderAddress
    ) internal view returns (uint256 allowance) {
        allowance = IERC20(currencyAddress).allowance({
            owner: walletAddress,
            spender: spenderAddress
        });
        return allowance;
    }

    /**
     * @notice Function validates that `msgSender` has approved the contract to spend at least
     * `pricePerToken` of `currencyAddress` ERC20 tokens, and that
     * `msgSender` has a balance of at least `pricePerToken` of
     * `currencyAddress` ERC20 tokens.
     * Reverts if insufficient allowance or balance.
     * @param msgSender Address of the message sender to validate.
     * @param currencyAddress Address of the ERC20 token to validate.
     * @param pricePerToken Price of token, in base units. For example,
     * if the ERC20 token has 6 decimals, an input value of `1_000_000` would
     * represent a price of `1.000000` tokens.
     */
    function validateERC20Approvals(
        address msgSender,
        address currencyAddress,
        uint256 pricePerToken
    ) private view {
        require(
            IERC20(currencyAddress).allowance({
                owner: msgSender,
                spender: address(this)
            }) >= pricePerToken,
            "Insufficient ERC20 allowance"
        );
        require(
            IERC20(currencyAddress).balanceOf(msgSender) >= pricePerToken,
            "Insufficient ERC20 balance"
        );
    }

    /**
     * @notice Sends ETH revenues between providers, artist, and artist's
     * additional payee. Reverts if any payment fails.
     * @dev This function pays priviliged addresses. DoS is acknowledged, and
     * mitigated by business practices, including end-to-end testing on
     * mainnet, and admin-accepted artist payment addresses.
     * @param platformProviderRevenue Platform Provider revenue.
     * @param platformProviderAddress Platform Provider address.
     * @param renderProviderRevenue Render Provider revenue.
     * @param renderProviderAddress Render Provider address.
     * @param artistRevenue Artist revenue.
     * @param artistAddress Artist address.
     * @param additionalPayeePrimaryRevenue Additional Payee revenue.
     * @param additionalPayeePrimaryAddress Additional Payee address.
     */
    function _sendPaymentsETH(
        uint256 platformProviderRevenue,
        address payable platformProviderAddress,
        uint256 renderProviderRevenue,
        address payable renderProviderAddress,
        uint256 artistRevenue,
        address payable artistAddress,
        uint256 additionalPayeePrimaryRevenue,
        address payable additionalPayeePrimaryAddress
    ) private {
        // Platform Provider payment (only possible if engine)
        if (platformProviderRevenue > 0) {
            (bool success, ) = platformProviderAddress.call{
                value: platformProviderRevenue
            }("");
            require(success, "Platform Provider payment failed");
        }
        // Render Provider / Art Blocks payment
        if (renderProviderRevenue > 0) {
            (bool success, ) = renderProviderAddress.call{
                value: renderProviderRevenue
            }("");
            require(success, "Render Provider payment failed");
        }
        // artist payment
        if (artistRevenue > 0) {
            (bool success, ) = artistAddress.call{value: artistRevenue}("");
            require(success, "Artist payment failed");
        }
        // additional payee payment
        if (additionalPayeePrimaryRevenue > 0) {
            (bool success, ) = additionalPayeePrimaryAddress.call{
                value: additionalPayeePrimaryRevenue
            }("");
            require(success, "Additional Payee payment failed");
        }
    }

    /**
     * @notice Sends ERC20 revenues between providers, artist, and artist's
     * additional payee. Reverts if any payment fails. All revenue values
     * should use base units. For example, if the ERC20 token has 6 decimals,
     * an input value of `1_000_000` would represent an amount of `1.000000`
     * tokens.
     * @dev This function relies on msg.sender, so it must be called from
     * the contract that is receiving the payment.
     * @param projectCurrency IERC20 payment token.
     * @param platformProviderRevenue Platform Provider revenue.
     * @param platformProviderAddress Platform Provider address.
     * @param renderProviderRevenue Render Provider revenue.
     * @param renderProviderAddress Render Provider address.
     * @param artistRevenue Artist revenue.
     * @param artistAddress Artist address.
     * @param additionalPayeePrimaryRevenue Additional Payee revenue.
     * @param additionalPayeePrimaryAddress Additional Payee address.
     */
    function _sendPaymentsERC20(
        IERC20 projectCurrency,
        uint256 platformProviderRevenue,
        address payable platformProviderAddress,
        uint256 renderProviderRevenue,
        address payable renderProviderAddress,
        uint256 artistRevenue,
        address payable artistAddress,
        uint256 additionalPayeePrimaryRevenue,
        address payable additionalPayeePrimaryAddress
    ) private {
        // Platform Provider payment (only possible if engine)
        if (platformProviderRevenue > 0) {
            require(
                projectCurrency.transferFrom({
                    from: msg.sender,
                    to: platformProviderAddress,
                    amount: platformProviderRevenue
                }),
                "Platform Provider payment failed"
            );
        }
        // Art Blocks payment
        if (renderProviderRevenue > 0) {
            require(
                projectCurrency.transferFrom({
                    from: msg.sender,
                    to: renderProviderAddress,
                    amount: renderProviderRevenue
                }),
                "Render Provider payment failed"
            );
        }
        // artist payment
        if (artistRevenue > 0) {
            require(
                projectCurrency.transferFrom({
                    from: msg.sender,
                    to: artistAddress,
                    amount: artistRevenue
                }),
                "Artist payment failed"
            );
        }
        // additional payee payment
        if (additionalPayeePrimaryRevenue > 0) {
            // @dev some ERC20 may not revert on transfer failure, so we
            // check the return value
            require(
                projectCurrency.transferFrom({
                    from: msg.sender,
                    to: additionalPayeePrimaryAddress,
                    amount: additionalPayeePrimaryRevenue
                }),
                "Additional Payee payment failed"
            );
        }
    }

    /**
     * @notice Loads the SplitFundsProjectConfig for a given project and core
     * contract.
     * @param projectId Project Id to get config for
     * @param coreContract Core contract address to get config for
     */
    function getSplitFundsProjectConfig(
        uint256 projectId,
        address coreContract
    ) internal view returns (SplitFundsProjectConfig storage) {
        return s().splitFundsProjectConfigs[coreContract][projectId];
    }

    /**
     * @notice Loads the IsEngineCache for a given core contract.
     * @param coreContract Core contract address to get config for
     */
    function getIsEngineCacheConfig(
        address coreContract
    ) internal view returns (IsEngineCache storage) {
        return s().isEngineCacheConfigs[coreContract];
    }

    /**
     * @notice Return the storage struct for reading and writing. This library
     * uses a diamond storage pattern when managing storage.
     * @return storageStruct The SetPriceLibStorage struct.
     */
    function s()
        internal
        pure
        returns (SplitFundsLibStorage storage storageStruct)
    {
        bytes32 position = SPLIT_FUNDS_LIB_STORAGE_POSITION;
        assembly ("memory-safe") {
            storageStruct.slot := position
        }
    }
}
