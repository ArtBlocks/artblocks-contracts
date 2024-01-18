// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import "../../interfaces/v0.8.x/IGenArt721CoreContractV3.sol";
import "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Engine.sol";
import "../../interfaces/v0.8.x/IMinterFilterV0.sol";
import "../../interfaces/v0.8.x/IFilteredMinterV2.sol";
import "./MinterBase_v0_1_1.sol";

import "@openzeppelin-4.5/contracts/security/ReentrancyGuard.sol";

pragma solidity 0.8.19;

/**
 * @title Filtered Minter contract that allows tokens to be minted with ETH
 * or any ERC-20 token.
 * This is designed to be used with GenArt721CoreContractV3 flagship or
 * engine contracts.
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
 * - updateProjectCurrencyInfo
 * - setProjectMaxInvocations
 * - manuallyLimitProjectMaxInvocations
 * ----------------------------------------------------------------------------
 * Additional admin and artist privileged roles may be described on other
 * contracts that this minter integrates with.
 */
contract MinterSetPriceERC20V4 is
    ReentrancyGuard,
    MinterBase,
    IFilteredMinterV2
{
    /// Core contract address this minter interacts with
    address public immutable genArt721CoreAddress;

    /// The core contract integrates with V3 contracts
    IGenArt721CoreContractV3_Base private immutable genArtCoreContract_Base;

    /// Minter filter address this minter interacts with
    address public immutable minterFilterAddress;

    /// Minter filter this minter may interact with.
    IMinterFilterV0 private immutable minterFilter;

    /// minterType for this minter
    string public constant minterType = "MinterSetPriceERC20V4";

    /// minter version for this minter
    string public constant minterVersion = "v4.1.0";

    uint256 constant ONE_MILLION = 1_000_000;

    struct ProjectConfig {
        bool maxHasBeenInvoked;
        bool priceIsConfigured;
        uint24 maxInvocations;
        address currencyAddress;
        uint256 pricePerTokenInWei;
        string currencySymbol;
    }

    mapping(uint256 => ProjectConfig) public projectConfig;

    // /// projectId => currency symbol - supersedes any defined core value
    // mapping(uint256 => string) private projectIdToCurrencySymbol;
    // /// projectId => currency address - supersedes any defined core value
    // mapping(uint256 => address) private projectIdToCurrencyAddress;

    function _onlyArtist(uint256 _projectId) internal view {
        require(
            msg.sender ==
                genArtCoreContract_Base.projectIdToArtistAddress(_projectId),
            "Only Artist"
        );
    }

    /**
     * @notice Initializes contract to be a Filtered Minter for
     * `_minterFilter`, integrated with Art Blocks core contract
     * at address `_genArt721Address`.
     * @param _genArt721Address Art Blocks core contract for which this
     * contract will be a minter.
     * @param _minterFilter Minter filter for which
     * this will a filtered minter.
     */
    constructor(
        address _genArt721Address,
        address _minterFilter
    ) ReentrancyGuard() MinterBase(_genArt721Address) {
        genArt721CoreAddress = _genArt721Address;
        // always populate immutable engine contracts, but only use appropriate
        // interface based on isEngine in the rest of the contract
        genArtCoreContract_Base = IGenArt721CoreContractV3_Base(
            _genArt721Address
        );
        minterFilterAddress = _minterFilter;
        minterFilter = IMinterFilterV0(_minterFilter);
        require(
            minterFilter.genArt721CoreAddress() == _genArt721Address,
            "Illegal contract pairing"
        );
    }

    /**
     * @notice Gets your balance of the ERC-20 token currently set
     * as the payment currency for project `_projectId`.
     * @param _projectId Project ID to be queried.
     * @return balance Balance of ERC-20
     */
    function getYourBalanceOfProjectERC20(
        uint256 _projectId
    ) external view returns (uint256 balance) {
        balance = IERC20(projectConfig[_projectId].currencyAddress).balanceOf(
            msg.sender
        );
        return balance;
    }

    /**
     * @notice Gets your allowance for this minter of the ERC-20
     * token currently set as the payment currency for project
     * `_projectId`.
     * @param _projectId Project ID to be queried.
     * @return remaining Remaining allowance of ERC-20
     */
    function checkYourAllowanceOfProjectERC20(
        uint256 _projectId
    ) external view returns (uint256 remaining) {
        remaining = IERC20(projectConfig[_projectId].currencyAddress).allowance(
            msg.sender,
            address(this)
        );
        return remaining;
    }

    /**
     * @notice Syncs local maximum invocations of project `_projectId` based on
     * the value currently defined in the core contract.
     * @param _projectId Project ID to set the maximum invocations for.
     * @dev this enables gas reduction after maxInvocations have been reached -
     * core contracts shall still enforce a maxInvocation check during mint.
     */
    function setProjectMaxInvocations(uint256 _projectId) public {
        _onlyArtist(_projectId);
        uint256 maxInvocations;
        uint256 invocations;
        (invocations, maxInvocations, , , , ) = genArtCoreContract_Base
            .projectStateData(_projectId);
        // update storage with results
        projectConfig[_projectId].maxInvocations = uint24(maxInvocations);

        // We need to ensure maxHasBeenInvoked is correctly set after manually syncing the
        // local maxInvocations value with the core contract's maxInvocations value.
        // This synced value of maxInvocations from the core contract will always be greater
        // than or equal to the previous value of maxInvocations stored locally.
        projectConfig[_projectId].maxHasBeenInvoked =
            invocations == maxInvocations;

        emit ProjectMaxInvocationsLimitUpdated(_projectId, maxInvocations);
    }

    /**
     * @notice Manually sets the local maximum invocations of project `_projectId`
     * with the provided `_maxInvocations`, checking that `_maxInvocations` is less
     * than or equal to the value of project `_project_id`'s maximum invocations that is
     * set on the core contract.
     * @dev Note that a `_maxInvocations` of 0 can only be set if the current `invocations`
     * value is also 0 and this would also set `maxHasBeenInvoked` to true, correctly short-circuiting
     * this minter's purchase function, avoiding extra gas costs from the core contract's maxInvocations check.
     * @param _projectId Project ID to set the maximum invocations for.
     * @param _maxInvocations Maximum invocations to set for the project.
     */
    function manuallyLimitProjectMaxInvocations(
        uint256 _projectId,
        uint256 _maxInvocations
    ) external {
        _onlyArtist(_projectId);
        // CHECKS
        // ensure that the manually set maxInvocations is not greater than what is set on the core contract
        uint256 maxInvocations;
        uint256 invocations;
        (invocations, maxInvocations, , , , ) = genArtCoreContract_Base
            .projectStateData(_projectId);
        require(
            _maxInvocations <= maxInvocations,
            "Cannot increase project max invocations above core contract set project max invocations"
        );
        require(
            _maxInvocations >= invocations,
            "Cannot set project max invocations to less than current invocations"
        );

        // EFFECTS
        // update storage with results
        projectConfig[_projectId].maxInvocations = uint24(_maxInvocations);
        // We need to ensure maxHasBeenInvoked is correctly set after manually setting the
        // local maxInvocations value.
        projectConfig[_projectId].maxHasBeenInvoked =
            invocations == _maxInvocations;

        emit ProjectMaxInvocationsLimitUpdated(_projectId, _maxInvocations);
    }

    /**
     * @notice Warning: Disabling purchaseTo is not supported on this minter.
     * This method exists purely for interface-conformance purposes.
     */
    function togglePurchaseToDisabled(uint256 _projectId) external view {
        _onlyArtist(_projectId);
        revert("Action not supported");
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
     * `_projectId` is an existing project ID.
     */
    function projectMaxHasBeenInvoked(
        uint256 _projectId
    ) external view returns (bool) {
        return projectConfig[_projectId].maxHasBeenInvoked;
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
     * to whether or not the input `_projectId` is an existing project ID.
     */
    function projectMaxInvocations(
        uint256 _projectId
    ) external view returns (uint256) {
        return uint256(projectConfig[_projectId].maxInvocations);
    }

    /**
     * @notice Updates this minter's price per token of project `_projectId`
     * to be '_pricePerTokenInWei`, in Wei.
     * This price supersedes any legacy core contract price per token value.
     */
    function updatePricePerTokenInWei(
        uint256 _projectId,
        uint256 _pricePerTokenInWei
    ) external {
        _onlyArtist(_projectId);
        require(_pricePerTokenInWei > 0, "Price may not be 0");
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        _projectConfig.pricePerTokenInWei = _pricePerTokenInWei;
        _projectConfig.priceIsConfigured = true;
        emit PricePerTokenInWeiUpdated(_projectId, _pricePerTokenInWei);

        // sync local max invocations if not initially populated
        // @dev if local max invocations and maxHasBeenInvoked are both
        // initial values, we know they have not been populated.
        if (
            _projectConfig.maxInvocations == 0 &&
            _projectConfig.maxHasBeenInvoked == false
        ) {
            setProjectMaxInvocations(_projectId);
        }
    }

    /**
     * @notice Updates payment currency of project `_projectId` to be
     * `_currencySymbol` at address `_currencyAddress`.
     * @param _projectId Project ID to update.
     * @param _currencySymbol Currency symbol.
     * @param _currencyAddress Currency address.
     */
    function updateProjectCurrencyInfo(
        uint256 _projectId,
        string memory _currencySymbol,
        address _currencyAddress
    ) external {
        _onlyArtist(_projectId);
        // require null address if symbol is "ETH"
        require(
            (keccak256(abi.encodePacked(_currencySymbol)) ==
                keccak256(abi.encodePacked("ETH"))) ==
                (_currencyAddress == address(0)),
            "ETH is only null address"
        );
        projectConfig[_projectId].currencySymbol = _currencySymbol;
        projectConfig[_projectId].currencyAddress = _currencyAddress;
        emit ProjectCurrencyInfoUpdated(
            _projectId,
            _currencyAddress,
            _currencySymbol
        );
    }

    /**
     * @notice Purchases a token from project `_projectId` with ETH.
     * @param _projectId Project ID to mint a token on.
     * @return tokenId Token ID of minted token
     */
    function purchase(
        uint256 _projectId
    ) external payable returns (uint256 tokenId) {
        // pass max price as msg.value, currency address as ETH
        tokenId = purchaseTo({
            _to: msg.sender,
            _projectId: _projectId,
            _maxPricePerToken: msg.value,
            _currencyAddress: address(0)
        });
        return tokenId;
    }

    /**
     * @notice Purchases a token from project `_projectId` with ETH or any ERC-20 token.
     * @param _projectId Project ID to mint a token on.
     * @param _maxPricePerToken Maximum price of token being allowed by the purchaser, no decimal places.
     * @param _currencyAddress Currency address of token. `address(0)` if minting with ETH.
     * @return tokenId Token ID of minted token
     */
    function purchase(
        uint256 _projectId,
        uint256 _maxPricePerToken,
        address _currencyAddress
    ) external payable returns (uint256 tokenId) {
        tokenId = purchaseTo({
            _to: msg.sender,
            _projectId: _projectId,
            _maxPricePerToken: _maxPricePerToken,
            _currencyAddress: _currencyAddress
        });
        return tokenId;
    }

    /**
     * @notice gas-optimized version of purchase(uint256).
     */
    function purchase_H4M(
        uint256 _projectId
    ) external payable returns (uint256 tokenId) {
        // pass max price as msg.value, currency address as ETH
        tokenId = purchaseTo({
            _to: msg.sender,
            _projectId: _projectId,
            _maxPricePerToken: msg.value,
            _currencyAddress: address(0)
        });
        return tokenId;
    }

    /**
     * @notice Purchases a token from project `_projectId` with ETH and sets
     * the token's owner to `_to`.
     * @param _to Address to be the new token's owner.
     * @param _projectId Project ID to mint a token on.
     * @return tokenId Token ID of minted token
     */
    function purchaseTo(
        address _to,
        uint256 _projectId
    ) external payable returns (uint256 tokenId) {
        // pass max price as msg.value, currency address as ETH
        return
            purchaseTo({
                _to: _to,
                _projectId: _projectId,
                _maxPricePerToken: msg.value,
                _currencyAddress: address(0)
            });
    }

    /**
     * @notice Purchases a token from project `_projectId` with ETH or any ERC-20 token and sets
     * the token's owner to `_to`.
     * @param _to Address to be the new token's owner.
     * @param _projectId Project ID to mint a token on.
     * @param _maxPricePerToken Maximum price of token being allowed by the purchaser, no decimal places. Required if currency is ERC20.
     * @param _currencyAddress Currency address of token. `address(0)` if minting with ETH.
     * @return tokenId Token ID of minted token
     */
    function purchaseTo(
        address _to,
        uint256 _projectId,
        uint256 _maxPricePerToken,
        address _currencyAddress
    ) public payable nonReentrant returns (uint256 tokenId) {
        // CHECKS
        ProjectConfig storage _projectConfig = projectConfig[_projectId];

        // Note that `maxHasBeenInvoked` is only checked here to reduce gas
        // consumption after a project has been fully minted.
        // `_projectConfig.maxHasBeenInvoked` is locally cached to reduce
        // gas consumption, but if not in sync with the core contract's value,
        // the core contract also enforces its own max invocation check during
        // minting.
        require(
            !_projectConfig.maxHasBeenInvoked,
            "Maximum number of invocations reached"
        );

        // require artist to have configured price of token on this minter
        require(_projectConfig.priceIsConfigured, "Price not configured");

        uint256 pricePerTokenInWei = _projectConfig.pricePerTokenInWei;
        address configuredCurrencyAddress = _projectConfig.currencyAddress;

        // validate that the currency address matches the project configured currency
        require(
            _currencyAddress == configuredCurrencyAddress,
            "Currency addresses must match"
        );

        // if configured currency is ETH validate that msg.value is the same as max price per token
        if (configuredCurrencyAddress == address(0)) {
            require(msg.value == _maxPricePerToken, "inconsistent msg.value");
        }

        // EFFECTS
        tokenId = minterFilter.mint(_to, _projectId, msg.sender);

        // invocation is token number plus one, and will never overflow due to
        // limit of 1e6 invocations per project. block scope for gas efficiency
        // (i.e. avoid an unnecessary var initialization to 0).
        unchecked {
            uint256 tokenInvocation = (tokenId % ONE_MILLION) + 1;
            uint256 localMaxInvocations = _projectConfig.maxInvocations;
            // handle the case where the token invocation == minter local max
            // invocations occurred on a different minter, and we have a stale
            // local maxHasBeenInvoked value returning a false negative.
            // @dev this is a CHECK after EFFECTS, so security was considered
            // in detail here.
            require(
                tokenInvocation <= localMaxInvocations,
                "Maximum invocations reached"
            );
            // in typical case, update the local maxHasBeenInvoked value
            // to true if the token invocation == minter local max invocations
            // (enables gas efficient reverts after sellout)
            if (tokenInvocation == localMaxInvocations) {
                _projectConfig.maxHasBeenInvoked = true;
            }
        }

        // INTERACTIONS
        if (configuredCurrencyAddress != address(0)) {
            // validate that the specified maximum price is greater than or equal to the price per token
            require(
                _maxPricePerToken >= pricePerTokenInWei,
                "Only max price gte token price"
            );
            require(
                msg.value == 0,
                "this project accepts a different currency and cannot accept ETH"
            );
            require(
                IERC20(configuredCurrencyAddress).allowance(
                    msg.sender,
                    address(this)
                ) >= pricePerTokenInWei,
                "Insufficient Funds Approved for TX"
            );
            require(
                IERC20(configuredCurrencyAddress).balanceOf(msg.sender) >=
                    pricePerTokenInWei,
                "Insufficient balance."
            );
            splitFundsERC20(
                _projectId,
                pricePerTokenInWei,
                configuredCurrencyAddress,
                genArt721CoreAddress
            );
        } else {
            require(
                msg.value >= pricePerTokenInWei,
                "Must send minimum value to mint!"
            );
            splitFundsETH(_projectId, pricePerTokenInWei, genArt721CoreAddress);
        }

        return tokenId;
    }

    /**
     * @notice Gets if price of token is configured, price of minting a
     * token on project `_projectId`, and currency symbol and address to be
     * used as payment. Supersedes any core contract price information.
     * @param _projectId Project ID to get price information for.
     * @return isConfigured true only if token price has been configured on
     * this minter
     * @return tokenPriceInWei current price of token on this minter - invalid
     * if price has not yet been configured
     * @return currencySymbol currency symbol for purchases of project on this
     * minter. "ETH" reserved for ether.
     * @return currencyAddress currency address for purchases of project on
     * this minter. Null address reserved for ether.
     */
    function getPriceInfo(
        uint256 _projectId
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
        ProjectConfig storage _projectConfig = projectConfig[_projectId];
        isConfigured = _projectConfig.priceIsConfigured;
        tokenPriceInWei = _projectConfig.pricePerTokenInWei;
        currencyAddress = _projectConfig.currencyAddress;
        if (currencyAddress == address(0)) {
            // defaults to ETH
            currencySymbol = "ETH";
        } else {
            currencySymbol = _projectConfig.currencySymbol;
        }
    }
}
