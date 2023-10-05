// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "./MaxInvocationsLib.sol";
import "./DAExpLib.sol";
import "./SplitFundsLib.sol";
import "../AuthLib.sol";
import {GenericMinterEventsLib} from "./GenericMinterEventsLib.sol";

import "@openzeppelin-4.7/contracts/utils/math/SafeCast.sol";

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Settlement Library for Exponential Auctions
 * @notice This library manages the settlement logic for Art Blocks settlement
 * minters. It provides functionality for managing a project's settlement state
 * via the SettlementAuctionProjectConfig struct, and managing an individual's
 * settlement state on a given project via the Receipt struct.
 * @author Art Blocks Inc.
 */

library SettlementExpLib {
    using SafeCast for uint256;
    /// receipt has an updated state
    event ReceiptUpdated(
        address indexed _purchaser,
        uint256 indexed _projectId,
        address indexed _coreContract,
        uint24 _numPurchased,
        uint256 _netPosted
    );

    // position of Settlement Exp Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant SETTLEMENT_EXP_LIB_STORAGE_POSITION =
        keccak256("settlementExpLib.storage");

    bytes32 internal constant CONFIG_CURRENT_SETTLED_PRICE =
        "currentSettledPrice";
    bytes32 internal constant CONFIG_AUCTION_REVENUES_COLLECTED =
        "auctionRevenuesCollected";

    // The SettlementAuctionProjectConfig struct tracks the state of a project's
    // settlement auction. It tracks the number of tokens minted that have
    // potential of future settlement, the latest purchase price of a token on
    // the project, and whether or not the auction's revenues have been
    // collected.
    struct SettlementAuctionProjectConfig {
        // set to true only after artist + admin revenues have been collected
        bool auctionRevenuesCollected;
        // number of tokens minted that have potential of future settlement.
        // @dev max uint24 > 16.7 million tokens > 1 million tokens/project max
        uint24 numSettleableInvocations;
        // When non-zero, this value is used as a reference when an auction is
        // reset by admin, and then a new auction is configured by an artist.
        // In that case, the new auction will be required to have a starting
        // price less than or equal to this value, if one or more purchases
        // have been made on this minter.
        // @dev max uint88 ~= 3e26 Wei = ~30 million ETH, which is well above
        // the expected prices of any NFT mint in the foreseeable future.
        // This enables struct packing.
        uint88 latestPurchasePrice;
        // Track per-project fund balance, in wei. This is used as a redundant
        // backstop to prevent one project from draining the minter's balance
        // of ETH from other projects, which is a worthwhile failsafe on this
        // shared minter.
        // @dev max uint88 ~= 3e26 Wei = ~30 million ETH, which is well above
        // the expected revenues for a single auction.
        // This enables struct packing.
        uint88 projectBalance;
        // field to store the number of purchases that have been made on the
        // project, on this minter. This is used to track if unexpected mints
        // from sources other than this minter occur during an auction.
        // @dev max uint24 allows for > max project supply of 1 million tokens
        // @dev important to pack this field with other fields updated during a
        // purchase, for gas efficiency
        uint24 numPurchasesOnMinter;
        // The number of tokens to be auctioned for the project on this minter.
        // This is defined as the number of invocations remaining at the time
        // of a project's first mint.
        uint24 numTokensToBeAuctioned;
        // --- @dev end of storage slot ---
    }

    // The Receipt struct tracks the state of a user's settlement on a given
    // project. It tracks the total funds posted by the user on the project
    // and the number of tokens purchased by the user on the project.
    struct Receipt {
        // max uint232 allows for > 1e51 ETH (much more than max supply)
        uint232 netPosted;
        // max uint24 still allows for > max project supply of 1 million tokens
        uint24 numPurchased;
    }

    // Diamond storage pattern is used in this library
    struct SettlementExpLibStorage {
        mapping(address coreContract => mapping(uint256 projectId => SettlementAuctionProjectConfig)) settlementAuctionProjectConfigs;
        mapping(address walletAddress => mapping(address coreContract => mapping(uint256 projectId => Receipt))) receipts;
    }

    /**
     * This function updates the _receipt to include `msg.value` and increments
     * the number of tokens purchased by 1. It then checks that the updated
     * receipt is valid (i.e. sufficient funds have been posted for the
     * number of tokens purchased on the updated receipt), and reverts if not.
     * The new receipt net posted and num purchased are then returned to make
     * the values available in a gas-efficient manner to the caller of this
     * function.
     * @param _walletAddress Address of user to update receipt for
     * @param _projectId Project ID to update receipt for
     * @param _coreContract Core contract address
     * @param _currentPriceInWei current price of token in Wei
     * @return netPosted total funds posted by user on project (that have not
     * been yet settled), including the current transaction
     * @return numPurchased total number of tokens purchased by user on
     * project, including the current transaction
     */
    function _validateReceiptEffects(
        address _walletAddress,
        uint256 _projectId,
        address _coreContract,
        uint256 _currentPriceInWei
    ) private returns (uint232 netPosted, uint24 numPurchased) {
        Receipt storage receipt = getReceipt({
            _walletAddress: _walletAddress,
            _projectId: _projectId,
            _coreContract: _coreContract
        });
        // in memory copy + update
        netPosted = (receipt.netPosted + msg.value).toUint232();
        numPurchased = receipt.numPurchased + 1;

        // require sufficient payment on project
        require(
            netPosted >= numPurchased * _currentPriceInWei,
            "Min value to mint req."
        );

        // update Receipt in storage
        // @dev overflow checks are not required since the added values cannot
        // be enough to overflow due to maximum invocations or supply of ETH
        receipt.netPosted = netPosted;
        receipt.numPurchased = numPurchased;

        // emit event indicating new receipt state
        emit ReceiptUpdated({
            _purchaser: msg.sender,
            _projectId: _projectId,
            _coreContract: _coreContract,
            _numPurchased: numPurchased,
            _netPosted: netPosted
        });
    }

    /**
     * @notice Distributes the net revenues from the project's auction, and
     * marks the auction as having had its revenues collected.
     * IMPORTANT - this affects state and distributes revenue funds, so it
     * performs all three of CHECKS, EFFECTS and INTERACTIONS.
     * This function updates a project's balance to reflect the amount of
     * revenues distributed, and will revert if underflow occurs.
     * @param _projectId Project ID to get revenues for
     * @param _coreContract Core contract address
     */
    function distributeArtistAndAdminRevenues(
        uint256 _projectId,
        address _coreContract
    ) internal {
        // load the project's settlement auction config
        SettlementAuctionProjectConfig
            storage settlementAuctionProjectConfig = getSettlementAuctionProjectConfig(
                _projectId,
                _coreContract
            );
        // require revenues to not have already been collected
        require(
            !settlementAuctionProjectConfig.auctionRevenuesCollected,
            "Revenues already collected"
        );
        // refresh max invocations, updating any local values that are
        // illogical with respect to the current core contract state, and
        // ensuring that local hasMaxBeenInvoked is accurate.
        MaxInvocationsLib.refreshMaxInvocations(_projectId, _coreContract);

        // get the current net price of the auction - reverts if no auction
        // is configured.
        // @dev we use _getPriceUnsafe here, since we just safely synced the
        // project's max invocations and maxHasBeenInvoked, which guarantees
        // an accurate price calculation from _getPriceUnsafe, while being
        // more gas efficient than getPriceSafe.
        // @dev price is guaranteed <= _projectConfig.latestPurchasePrice,
        // since this minter enforces monotonically decreasing purchase prices.
        // @dev we can trust maxHasBeenInvoked, since we just
        // refreshed it above with refreshMaxInvocations, preventing any
        // false negatives
        bool maxHasBeenInvoked = MaxInvocationsLib.getMaxHasBeenInvoked(
            _projectId,
            _coreContract
        );
        uint256 _price = getPriceUnsafe({
            _projectId: _projectId,
            _coreContract: _coreContract,
            _maxHasBeenInvoked: maxHasBeenInvoked
        });
        // if the price is not base price, require that the auction have
        // reached max invocations. This prevents premature withdrawl
        // before final auction price is possible to know.
        uint256 basePrice = DAExpLib.getAuctionBasePrice({
            _projectId: _projectId,
            _coreContract: _coreContract
        });
        if (_price != basePrice) {
            require(maxHasBeenInvoked, "Active auction not yet sold out");
            // if max has been invoked, but all tokens to be auctioned were not
            // sold, funny business has been detected (e.g. project max
            // invocations were reduced on core contract after initial
            // purchase, purchases were made on a different minter after
            // initial purchase, etc.), which could artifically inflate
            // sellout price and harm purchasers. In that case, we should
            // not revert (since max invocations have been reached), but we
            // should require admin to be the caller of this function.
            // This provides separation of powers to protect collectors who
            // participated in the auction.
            // Note that if admin determines the artist has been malicious,
            // admin should replace artist address with a wallet controlled by
            // admin on the core contract, update payee address on the core,
            // collect revenues using this function, then distribute any
            // additional settlement funds to purchasers at admin's discretion.
            if (
                !_allTokensToBeAuctionedWereSold(settlementAuctionProjectConfig)
            ) {
                AuthLib.onlyCoreAdminACL({
                    _coreContract: _coreContract,
                    _sender: msg.sender,
                    _contract: address(this),
                    _selector: bytes4(
                        keccak256(
                            "distributeArtistAndAdminRevenues(uint256,address)"
                        )
                    )
                });
            }
        } else {
            // base price of zero indicates no sales, since base price of zero
            // is not allowed when configuring an auction.
            // @dev no coverage else branch of following line because redundant
            require(basePrice > 0, "Only latestPurchasePrice > 0");
            // if the price is base price, the auction is valid and may be claimed
            // update the latest purchase price to the base price, to ensure
            // the base price is used for all future settlement calculations
            // EFFECTS
            // @dev base price value was just loaded from uint88 in storage,
            // so no safe cast required
            settlementAuctionProjectConfig.latestPurchasePrice = uint88(
                basePrice
            );
            // notify indexing service of settled price update
            // @dev acknowledge that this event may be emitted prior to
            // other state updates in this function, but that is okay because
            // the settled price is the only value updated with this event
            emit GenericMinterEventsLib.ConfigValueSet(
                _projectId,
                _coreContract,
                CONFIG_CURRENT_SETTLED_PRICE,
                basePrice
            );
        }
        settlementAuctionProjectConfig.auctionRevenuesCollected = true;
        // calculate the artist and admin revenues
        uint256 netRevenues = settlementAuctionProjectConfig
            .numSettleableInvocations * _price;

        // reduce project balance by the amount of ETH being distributed
        // @dev underflow checked automatically in solidity ^0.8
        settlementAuctionProjectConfig.projectBalance -= netRevenues.toUint88();

        // INTERACTIONS
        SplitFundsLib.splitRevenuesETHNoRefund({
            _projectId: _projectId,
            _valueInWei: netRevenues,
            _coreContract: _coreContract
        });

        emit GenericMinterEventsLib.ConfigValueSet(
            _projectId,
            _coreContract,
            CONFIG_AUCTION_REVENUES_COLLECTED,
            true
        );
    }

    /**
     * @notice Reclaims excess settlement funds for purchaser wallet
     * `_purchaserAddress` on project `_projectId`. Excess settlement funds are
     * the amount of funds posted by the purchaser that are in excess of the
     * amount required to settle the purchaser's tokens on the project.
     * Excess settlement funds are sent to address `_to`, and function reverts
     * if send fails.
     * @param _projectId Project ID to reclaim excess settlement funds for
     * @param _coreContract Core contract address
     * @param _purchaserAddress Address to reclaim excess settlement funds for
     * @param _to Address to send excess settlement funds to
     */
    function reclaimProjectExcessSettlementFundsTo(
        address payable _to,
        uint256 _projectId,
        address _coreContract,
        address _purchaserAddress
    ) internal {
        (
            uint256 excessSettlementFunds,
            uint256 requiredAmountPosted
        ) = getProjectExcessSettlementFunds({
                _projectId: _projectId,
                _coreContract: _coreContract,
                _walletAddress: _purchaserAddress
            });

        SettlementAuctionProjectConfig
            storage settlementAuctionProjectConfig = getSettlementAuctionProjectConfig({
                _projectId: _projectId,
                _coreContract: _coreContract
            });
        Receipt storage receipt = getReceipt({
            _walletAddress: _purchaserAddress,
            _coreContract: _coreContract,
            _projectId: _projectId
        });

        uint232 newNetPosted = requiredAmountPosted.toUint232();
        receipt.netPosted = newNetPosted;

        // reduce project balance by the amount of ETH being distributed
        // @dev underflow checked automatically in solidity ^0.8
        settlementAuctionProjectConfig.projectBalance -= excessSettlementFunds
            .toUint88();

        emit ReceiptUpdated({
            _purchaser: _purchaserAddress,
            _projectId: _projectId,
            _coreContract: _coreContract,
            _numPurchased: receipt.numPurchased,
            _netPosted: newNetPosted
        });

        // INTERACTIONS
        bool success_;
        (success_, ) = _to.call{value: excessSettlementFunds}("");
        require(success_, "Reclaiming failed");
    }

    /**
     * @notice Performs updates to project state prior to a mint being
     * initiated, during a purchase transaction. Specifically, this updates the
     * number of purchases on this minter (and populates expected number of
     * tokens to be auctioned if this is first purchase), increases the
     * project's balance by the amount of funds sent with the transaction,
     * updates the purchaser's receipt to reflect the new funds posted, checks
     * that the updated receipt has sufficient funds posted for the number of
     * tokens to be purchased after this transaction, and updates the project's
     * latest purchase price to the current price of the token.
     * Reverts if insuffient funds have been posted for the number of tokens to
     * be purchased after this transaction.
     * @param _projectId Project ID to perform the pre-mint effects for
     * @param _coreContract Core contract address
     * @param _currentPriceInWei current price of token in Wei
     * @param _msgValue msg.value sent with mint transaction
     * @param _purchaserAddress Wallet address of purchaser
     */
    function preMintEffects(
        uint256 _projectId,
        address _coreContract,
        uint256 _currentPriceInWei,
        uint256 _msgValue,
        address _purchaserAddress
    ) internal {
        // load the project's settlement auction config and receipt
        SettlementAuctionProjectConfig
            storage settlementAuctionProjectConfig = getSettlementAuctionProjectConfig(
                _projectId,
                _coreContract
            );

        // if this is the first purchase on this minter, set the number of
        // of tokens to be auctioned to:
        // (minter max invocations) - (current core contract invocations)
        if (settlementAuctionProjectConfig.numPurchasesOnMinter == 0) {
            // get up-to-data invocation data from core contract
            (uint256 coreInvocations, ) = MaxInvocationsLib
                .coreContractInvocationData(_projectId, _coreContract);
            // snap chalkline on the number of tokens to be auctioned on this
            // minter
            // @dev ackgnowledge that this value may be stale if the core
            // contract's max invocations were reduced since the last time
            // the minter's max invocations were updated, but that is desired.
            // That case would be classified as "funny business", so we want
            // to require admin to be the withdrawer of revenues in that case.
            uint256 maxInvocations = MaxInvocationsLib.getMaxInvocations(
                _projectId,
                _coreContract
            );
            settlementAuctionProjectConfig.numTokensToBeAuctioned = uint24(
                maxInvocations - coreInvocations
            );
        }

        // increment the number of purchases on this minter during every purchase
        settlementAuctionProjectConfig.numPurchasesOnMinter++;

        // update project balance
        settlementAuctionProjectConfig.projectBalance += _msgValue.toUint88();

        _validateReceiptEffects({
            _walletAddress: _purchaserAddress,
            _projectId: _projectId,
            _coreContract: _coreContract,
            _currentPriceInWei: _currentPriceInWei
        });

        // update latest purchase price (on this minter) in storage
        // @dev this is used to enforce monotonically decreasing purchase price
        // across multiple auctions
        settlementAuctionProjectConfig.latestPurchasePrice = _currentPriceInWei
            .toUint88();
    }

    /**
     * @notice Performs updates to project state after a mint has been
     * successfully completed.
     * Specifically, this function distributes revenues if the auction revenues
     * have been collected, or increments the number of settleable invocations
     * if the auction revenues have not been collected.
     * @param _projectId Project ID to perform post-mint updates for
     * @param _coreContract Core contract address
     * @param _currentPriceInWei current price of token in Wei (the value to be
     * distributed if revenues have been collected)
     */
    function postMintInteractions(
        uint256 _projectId,
        address _coreContract,
        uint256 _currentPriceInWei
    ) internal {
        // load the project's settlement auction config
        SettlementAuctionProjectConfig
            storage settlementAuctionProjectConfig = getSettlementAuctionProjectConfig(
                _projectId,
                _coreContract
            );
        if (settlementAuctionProjectConfig.auctionRevenuesCollected) {
            // if revenues have been collected, split revenues immediately.
            // @dev note that we are guaranteed to be at auction base price,
            // since we know we didn't sellout prior to this tx.
            // note that we don't refund msg.sender here, since a separate
            // settlement mechanism is provided on this minter, unrelated to
            // msg.value

            // reduce project balance by the amount of ETH being distributed
            // @dev specifically, this is not decremented by msg.value, as
            // msg.sender is not refunded here
            // @dev underflow checked automatically in solidity ^0.8
            settlementAuctionProjectConfig.projectBalance -= _currentPriceInWei
                .toUint88();

            // INTERACTIONS
            SplitFundsLib.splitRevenuesETHNoRefund({
                _projectId: _projectId,
                _valueInWei: _currentPriceInWei,
                _coreContract: _coreContract
            });
        } else {
            // increment the number of settleable invocations that will be
            // claimable by the artist and admin once auction is validated.
            // do not split revenue here since will be claimed at a later time.
            settlementAuctionProjectConfig.numSettleableInvocations++;
            // @dev project balance is unaffected because no funds are distributed
        }
    }

    /**
     * Returns number of purchases that have been made on the minter, for a
     * given project.
     * @param _projectId The id of the project.
     * @param _coreContract The address of the core contract.
     */
    function getNumPurchasesOnMinter(
        uint256 _projectId,
        address _coreContract
    ) internal view returns (uint256) {
        SettlementAuctionProjectConfig
            storage settlementAuctionProjectConfig = getSettlementAuctionProjectConfig({
                _projectId: _projectId,
                _coreContract: _coreContract
            });
        return settlementAuctionProjectConfig.numPurchasesOnMinter;
    }

    /**
     * @notice Returns the excess settlement funds for purchaser wallet
     * `_walletAddress` on project `_projectId`. Excess settlement funds are
     * the amount of funds posted by the purchaser that are in excess of the
     * amount required to settle the purchaser's tokens on the project.
     * @param _projectId Project ID to get revenues for
     * @param _coreContract Core contract address
     * @param _walletAddress Address to get excess settlement funds for
     * @return excessSettlementFunds excess settlement funds, in wei
     * @return requiredAmountPosted required amount to be posted by user, in wei
     */
    function getProjectExcessSettlementFunds(
        uint256 _projectId,
        address _coreContract,
        address _walletAddress
    )
        internal
        view
        returns (uint256 excessSettlementFunds, uint256 requiredAmountPosted)
    {
        // load the project's settlement auction config
        SettlementAuctionProjectConfig
            storage _settlementAuctionProjectConfig = getSettlementAuctionProjectConfig(
                _projectId,
                _coreContract
            );
        // load the user's receipt
        Receipt storage _receipt = getReceipt({
            _walletAddress: _walletAddress,
            _projectId: _projectId,
            _coreContract: _coreContract
        });
        // require that a user has purchased at least one token on this project
        uint256 numPurchased = _receipt.numPurchased;
        require(numPurchased > 0, "No purchases made by this address");

        uint256 currentSettledTokenPrice = _settlementAuctionProjectConfig
            .latestPurchasePrice;

        // calculate the excess settlement funds amount
        // implicit overflow/underflow checks in solidity ^0.8
        requiredAmountPosted = numPurchased * currentSettledTokenPrice;
        excessSettlementFunds = _receipt.netPosted - requiredAmountPosted;
        return (excessSettlementFunds, requiredAmountPosted);
    }

    /**
     * @notice Gets price of minting a token on project `_projectId` given
     * the project's AuctionParameters and current block timestamp.
     * Reverts if auction has not yet started or auction is unconfigured, and
     * local hasMaxBeenInvoked is false and revenues have not been withdrawn.
     * Price is guaranteed to be accurate unless the minter's local
     * hasMaxBeenInvoked is stale and returning a false negative.
     * @dev when an accurate price is required regardless of the current state
     * state of the locally cached minter max invocations, use the less gas
     * efficient function `getPriceSafe`.
     * @param _projectId Project ID to get price of token for.
     * @param _coreContract Core contract address to get price for.
     * @param _maxHasBeenInvoked Bool representing if maxHasBeenInvoked for the
     * project.
     * @return uint256 current price of token in Wei, accurate if minter max
     * invocations are up to date
     * @dev This method calculates price decay using a linear interpolation
     * of exponential decay based on the artist-provided half-life for price
     * decay, `_priceDecayHalfLifeSeconds`.
     */
    function getPriceUnsafe(
        uint256 _projectId,
        address _coreContract,
        bool _maxHasBeenInvoked
    ) internal view returns (uint256) {
        // load the project's settlement auction config
        SettlementAuctionProjectConfig
            storage _settlementAuctionProjectConfig = getSettlementAuctionProjectConfig(
                _projectId,
                _coreContract
            );
        // return latest purchase price if:
        // - minter is aware of a sold-out auction (without updating max
        // invocation value)
        // - auction revenues have been collected, at which point the latest
        // purchase price will never change again
        if (
            _maxHasBeenInvoked ||
            _settlementAuctionProjectConfig.auctionRevenuesCollected
        ) {
            return _settlementAuctionProjectConfig.latestPurchasePrice;
        }
        // otherwise calculate price based on current block timestamp and
        // auction configuration
        // @dev this will revert if auction has not yet started or auction is
        // unconfigured, which is relied upon for security.
        return
            DAExpLib.getPriceExp({
                _projectId: _projectId,
                _coreContract: _coreContract
            });
    }

    /**
     * @notice Gets price of minting a token on project `_projectId` given
     * the project's AuctionParameters and current block timestamp.
     * This is labeled as "safe", because price is guaranteed to be accurate
     * even in the case of a stale locally cached minter max invocations.
     * Reverts if auction has not yet started or auction is unconfigured, and
     * auction has not sold out or revenues have not been withdrawn.
     * @dev This method is less gas efficient than `getPriceUnsafe`, but is
     * guaranteed to be accurate.
     * @param _projectId Project ID to get price of token for.
     * @return tokenPriceInWei current price of token in Wei
     * @dev This method calculates price decay using a linear interpolation
     * of exponential decay based on the artist-provided half-life for price
     * decay, `_priceDecayHalfLifeSeconds`.
     */
    function getPriceSafe(
        uint256 _projectId,
        address _coreContract
    ) internal view returns (uint256 tokenPriceInWei) {
        // load the project's settlement auction config
        SettlementAuctionProjectConfig
            storage settlementAuctionProjectConfig = getSettlementAuctionProjectConfig(
                _projectId,
                _coreContract
            );
        // accurately check if project has sold out
        if (
            MaxInvocationsLib.projectMaxHasBeenInvokedSafe({
                _projectId: _projectId,
                _coreContract: _coreContract
            })
        ) {
            // max invocations have been reached, return the latest purchased
            // price
            tokenPriceInWei = settlementAuctionProjectConfig
                .latestPurchasePrice;
        } else {
            // if not sold out, return the current price via getPriceUnsafe
            tokenPriceInWei = getPriceUnsafe({
                _projectId: _projectId,
                _coreContract: _coreContract,
                _maxHasBeenInvoked: false // this branch is only reached if max invocations have not been reached
            });
        }
        return tokenPriceInWei;
    }

    /**
     * Returns if a new auction's start price is valid, given the current
     * state of the project's settlement auction configuration.
     * @param _projectId Project ID to check start price for
     * @param _coreContract Core contract address to check start price for
     * @param _startPrice starting price of new auction, in wei
     */
    function isValidStartPrice(
        uint256 _projectId,
        address _coreContract,
        uint256 _startPrice
    ) internal view returns (bool) {
        // load the project's settlement auction config
        SettlementAuctionProjectConfig
            storage _settlementAuctionProjectConfig = getSettlementAuctionProjectConfig(
                _projectId,
                _coreContract
            );
        // If previous purchases have been made, require monotonically
        // decreasing purchase prices to preserve settlement and revenue
        // claiming logic. Since base price is always non-zero, if
        // latestPurchasePrice is zero, then no previous purchases have been
        // made, and startPrice may be set to any value.
        return (_settlementAuctionProjectConfig.latestPurchasePrice == 0 || // never purchased
            _startPrice <= _settlementAuctionProjectConfig.latestPurchasePrice);
    }

    /**
     * Loads the SettlementAuctionProjectConfig for a given project and core
     * contract.
     * @param _projectId Project Id to get config for
     * @param _coreContract Core contract address to get config for
     */
    function getSettlementAuctionProjectConfig(
        uint256 _projectId,
        address _coreContract
    ) internal view returns (SettlementAuctionProjectConfig storage) {
        return s().settlementAuctionProjectConfigs[_coreContract][_projectId];
    }

    /**
     * Loads the Receipt for a given user, project and core contract.
     * @param _walletAddress User address to get receipt for
     * @param _projectId Project Id to get config for
     * @param _coreContract Core contract address to get config for
     */
    function getReceipt(
        address _walletAddress,
        uint256 _projectId,
        address _coreContract
    ) internal view returns (Receipt storage) {
        return s().receipts[_walletAddress][_coreContract][_projectId];
    }

    /**
     * @notice Return the storage struct for reading and writing. This library
     * uses a diamond storage pattern when managing storage.
     * @return storageStruct The SettlementExpLibStorage struct.
     */
    function s()
        internal
        pure
        returns (SettlementExpLibStorage storage storageStruct)
    {
        bytes32 position = SETTLEMENT_EXP_LIB_STORAGE_POSITION;
        assembly {
            storageStruct.slot := position
        }
    }

    /**
     * Returns if all tokens to be auctioned were sold, for a given project.
     * Returns false if the number of tokens to be auctioned is zero, since
     * that is the default value for unconfigured values.
     * @param _settlementAuctionProjectConfig The SettlementAuctionProjectConfig
     * struct of the project to check.
     */
    function _allTokensToBeAuctionedWereSold(
        SettlementAuctionProjectConfig storage _settlementAuctionProjectConfig
    ) private view returns (bool) {
        // @dev load numAllocations into memory for gas efficiency
        uint256 numTokensToBeAuctioned = _settlementAuctionProjectConfig
            .numTokensToBeAuctioned;
        return
            numTokensToBeAuctioned > 0 &&
            _settlementAuctionProjectConfig.numPurchasesOnMinter ==
            numTokensToBeAuctioned;
    }
}
