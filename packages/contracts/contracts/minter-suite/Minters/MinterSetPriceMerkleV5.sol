// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../../interfaces/v0.8.x/IDelegationRegistry.sol";
import "../../interfaces/v0.8.x/ISharedMinterV0.sol";
import "../../interfaces/v0.8.x/IMinterFilterV1.sol";
import "../../interfaces/v0.8.x/ISharedMinterMerkleV0.sol";

import "../../libs/v0.8.x/AuthLib.sol";
import "../../libs/v0.8.x/minter-libs/MerkleLib.sol";
import "../../libs/v0.8.x/minter-libs/SplitFundsLib.sol";
import "../../libs/v0.8.x/minter-libs/MaxInvocationsLib.sol";
import "../../libs/v0.8.x/minter-libs/SetPriceLib.sol";

import "@openzeppelin-4.5/contracts/security/ReentrancyGuard.sol";

pragma solidity 0.8.19;

/**
 * @title Shared, filtered Minter contract that allows tokens to be minted with
 * ETH for addresses in a Merkle allowlist.
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
 * - updateMerkleRoot
 * - updatePricePerTokenInWei
 * - setProjectInvocationsPerAddress
 * - syncProjectMaxInvocationsToCore
 * - manuallyLimitProjectMaxInvocations
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
 */
contract MinterSetPriceMerkleV5 is
    ReentrancyGuard,
    ISharedMinterV0,
    ISharedMinterMerkleV0
{
    /// Minter filter address this minter interacts with
    address public immutable minterFilterAddress;

    /// Minter filter this minter may interact with.
    IMinterFilterV1 private immutable minterFilter;

    /// minterType for this minter
    string public constant minterType = "MinterSetPriceMerkleV5";

    /// minter version for this minter
    string public constant minterVersion = "v5.0.0";

    /// Delegation registry address
    address public immutable delegationRegistryAddress;
    /// Delegation registry address
    IDelegationRegistry private immutable delegationRegistryContract;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // STATE VARIABLES FOR SetPriceLib begin here
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /// contractAddress => projectId => set price project config
    mapping(address => mapping(uint256 => SetPriceLib.SetPriceProjectConfig))
        private _setPriceProjectConfigMapping;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // STATE VARIABLES FOR SetPriceLib end here
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // STATE VARIABLES FOR SplitFundsLib begin here
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // contractAddress => IsEngineCache
    mapping(address => SplitFundsLib.IsEngineCache) private _isEngineCaches;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // STATE VARIABLES FOR SplitFundsLib end here
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // MODIFIERS
    // @dev contract uses modifier-like internal functions instead of modifiers
    // to reduce contract bytecode size
    // @dev contract uses AuthLib for some modifier-like functions

    /**
     * @notice Initializes contract to be a Filtered Minter for
     * `_minterFilter` minter filter.
     * @param _minterFilter Minter filter for which this will be a
     * filtered minter.
     * @param _delegationRegistryAddress Delegation registry contract address.
     */
    constructor(
        address _minterFilter,
        address _delegationRegistryAddress
    ) ReentrancyGuard() {
        minterFilterAddress = _minterFilter;
        minterFilter = IMinterFilterV1(_minterFilter);

        delegationRegistryAddress = _delegationRegistryAddress;
        delegationRegistryContract = IDelegationRegistry(
            _delegationRegistryAddress
        );
        emit MerkleLib.DelegationRegistryUpdated(_delegationRegistryAddress);
        // broadcast default max invocations per address for this minter
        emit MerkleLib.DefaultMaxInvocationsPerAddress(
            MerkleLib.DEFAULT_MAX_INVOCATIONS_PER_ADDRESS
        );
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
     * @param _coreContract Core contract address for the given project.
     * @param _maxInvocations Maximum invocations to set for the project.
     */
    function manuallyLimitProjectMaxInvocations(
        uint256 _projectId,
        address _coreContract,
        uint24 _maxInvocations
    ) external {
        AuthLib.onlyArtist({
            _projectId: _projectId,
            _coreContract: _coreContract,
            _sender: msg.sender
        });
        MaxInvocationsLib.manuallyLimitProjectMaxInvocations(
            _projectId,
            _coreContract,
            _maxInvocations
        );
    }

    /**
     * @notice Updates this minter's price per token of project `_projectId`
     * to be '_pricePerTokenInWei`, in Wei.
     * @dev Note that it is intentionally supported here that the configured
     * price may be explicitly set to `0`.
     * @param _projectId Project ID to set the price per token for.
     * @param _coreContract Core contract address for the given project.
     * @param _pricePerTokenInWei Price per token to set for the project, in Wei.
     */
    function updatePricePerTokenInWei(
        uint256 _projectId,
        address _coreContract,
        uint248 _pricePerTokenInWei
    ) external {
        AuthLib.onlyArtist({
            _projectId: _projectId,
            _coreContract: _coreContract,
            _sender: msg.sender
        });
        SetPriceLib.SetPriceProjectConfig
            storage _setPriceProjectConfig = _setPriceProjectConfigMapping[
                _coreContract
            ][_projectId];
        SetPriceLib.updatePricePerTokenInWei(
            _pricePerTokenInWei,
            _setPriceProjectConfig
        );
        emit PricePerTokenInWeiUpdated(
            _projectId,
            _coreContract,
            _pricePerTokenInWei
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
                _projectId,
                _coreContract
            )
        ) {
            syncProjectMaxInvocationsToCore(_projectId, _coreContract);
        }
    }

    /**
     * @notice Update the Merkle root for project `_projectId` on core contract `_coreContract`.
     * @param _projectId Project ID to be updated.
     * @param _coreContract Core contract address for the given project.
     * @param _root root of Merkle tree defining addresses allowed to mint
     * on project `_projectId`.
     */
    function updateMerkleRoot(
        uint256 _projectId,
        address _coreContract,
        bytes32 _root
    ) external {
        AuthLib.onlyArtist({
            _projectId: _projectId,
            _coreContract: _coreContract,
            _sender: msg.sender
        });
        require(_root != bytes32(0), "Root must be provided");
        MerkleLib.updateMerkleRoot(_projectId, _coreContract, _root);
    }

    /**
     * @notice Sets maximum allowed invocations per allowlisted address for
     * project `_project` to `limit`. If `limit` is set to 0, allowlisted
     * addresses will be able to mint as many times as desired, until the
     * project reaches its maximum invocations.
     * Default is a value of 1 if never configured by artist.
     * @param _projectId Project ID to toggle the mint limit.
     * @param _coreContract Core contract address for the given project.
     * @param _maxInvocationsPerAddress Maximum allowed invocations per
     * allowlisted address.
     * @dev default value stated above must be updated if the value of
     * CONFIG_USE_MAX_INVOCATIONS_PER_ADDRESS_OVERRIDE is changed.
     */
    function setProjectInvocationsPerAddress(
        uint256 _projectId,
        address _coreContract,
        uint24 _maxInvocationsPerAddress
    ) external {
        AuthLib.onlyArtist({
            _projectId: _projectId,
            _coreContract: _coreContract,
            _sender: msg.sender
        });
        MerkleLib.setProjectInvocationsPerAddress(
            _projectId,
            _coreContract,
            _maxInvocationsPerAddress
        );
    }

    /**
     * @notice Purchases a token from project `_projectId`.
     * @param _projectId Project ID to mint a token on.
     * @param _coreContract Core contract address for the given project.
     * @param _proof Merkle proof for the given project.
     * @return tokenId Token ID of minted token
     */
    function purchase(
        uint256 _projectId,
        address _coreContract,
        bytes32[] calldata _proof
    ) external payable returns (uint256 tokenId) {
        tokenId = purchaseTo(
            msg.sender,
            _projectId,
            _coreContract,
            _proof,
            address(0)
        );
        return tokenId;
    }

    /**
     * @notice Purchases a token from project `_projectId` and sets
     * the token's owner to `_to`.
     * @param _to Address to be the new token's owner.
     * @param _projectId Project ID to mint a token on.
     * @param _coreContract Contract address of the core contract.
     * @param _proof Merkle proof for the given project.
     * @return tokenId Token ID of minted token
     */
    function purchaseTo(
        address _to,
        uint256 _projectId,
        address _coreContract,
        bytes32[] calldata _proof
    ) external payable returns (uint256 tokenId) {
        return purchaseTo(_to, _projectId, _coreContract, _proof, address(0));
    }

    // public getter functions
    /**
     * @notice Gets the maximum invocations project configuration.
     * @param _projectId The ID of the project whose data needs to be fetched.
     * @param _coreContract The address of the core contract.
     * @return MaxInvocationsLib.MaxInvocationsProjectConfig instance with the
     * configuration data.
     */
    function maxInvocationsProjectConfig(
        uint256 _projectId,
        address _coreContract
    )
        external
        view
        returns (MaxInvocationsLib.MaxInvocationsProjectConfig memory)
    {
        return
            MaxInvocationsLib.getMaxInvocationsProjectConfig(
                _projectId,
                _coreContract
            );
    }

    /**
     * @notice Gets the set price project configuration.
     * @param _projectId The ID of the project whose data needs to be fetched.
     * @param _coreContract The address of the core contract.
     * @return SetPriceProjectConfig struct with the fixed price project
     * configuration data.
     */
    function setPriceProjectConfig(
        uint256 _projectId,
        address _coreContract
    ) external view returns (SetPriceLib.SetPriceProjectConfig memory) {
        return _setPriceProjectConfigMapping[_coreContract][_projectId];
    }

    /**
     * @notice Retrieves the Merkle project configuration for a given contract and project.
     * @dev This function fetches the Merkle project configuration from the
     * merkleProjectConfigMapping using the provided core contract address and project ID.
     * @param _projectId The ID of the project.
     * @param _coreContract The address of the core contract.
     * @return MerkleLib.MerkleProjectConfig The Merkle project configuration.
     */
    function merkleProjectConfig(
        uint256 _projectId,
        address _coreContract
    ) external view returns (bool, uint24, bytes32) {
        MerkleLib.MerkleProjectConfig storage _merkleProjectConfig = MerkleLib
            .getMerkleProjectConfig(_projectId, _coreContract);
        return (
            _merkleProjectConfig.useMaxInvocationsPerAddressOverride,
            _merkleProjectConfig.maxInvocationsPerAddressOverride,
            _merkleProjectConfig.merkleRoot
        );
    }

    /**
     * @notice Retrieves the mint invocation count for a specific project and purchaser.
     * @dev This function retrieves the number of times a purchaser has minted
     * in a specific project from the projectUserMintInvocationsMapping.
     * @param _projectId The ID of the project.
     * @param _coreContract The address of the core contract.
     * @param _purchaser The address of the purchaser.
     * @return uint256 The number of times the purchaser has minted in the given project.
     */
    function projectUserMintInvocations(
        uint256 _projectId,
        address _coreContract,
        address _purchaser
    ) external view returns (uint256) {
        return
            MerkleLib.projectUserMintInvocations(
                _projectId,
                _coreContract,
                _purchaser
            );
    }

    /**
     * @notice Checks if the specified `_coreContract` is a valid engine contract.
     * @dev This function retrieves the cached value of `_isEngine` from
     * the `isEngineCache` mapping. If the cached value is already set, it
     * returns the cached value. Otherwise, it calls the `getV3CoreIsEngine`
     * function from the `SplitFundsLib` library to check if `_coreContract`
     * is a valid engine contract.
     * @dev This function will revert if the provided `_coreContract` is not
     * a valid Engine or V3 Flagship contract.
     * @param _coreContract The address of the contract to check.
     * @return bool indicating if `_coreContract` is a valid engine contract.
     */
    function isEngineView(address _coreContract) external view returns (bool) {
        SplitFundsLib.IsEngineCache storage isEngineCache = _isEngineCaches[
            _coreContract
        ];
        if (isEngineCache.isCached) {
            return isEngineCache.isEngine;
        } else {
            // @dev this calls the non-modifying variant of getV3CoreIsEngine
            return SplitFundsLib.getV3CoreIsEngineView(_coreContract);
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
     * @param `_projectId` is an existing project ID.
     * @param `_coreContract` is an existing core contract address.
     */
    function projectMaxHasBeenInvoked(
        uint256 _projectId,
        address _coreContract
    ) external view returns (bool) {
        return
            MaxInvocationsLib.getMaxHasBeenInvoked(_projectId, _coreContract);
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
     * @param `_projectId` is an existing project ID.
     * @param `_coreContract` is an existing core contract address.
     */
    function projectMaxInvocations(
        uint256 _projectId,
        address _coreContract
    ) external view returns (uint256) {
        return MaxInvocationsLib.getMaxInvocations(_projectId, _coreContract);
    }

    /**
     * @notice Gets if price of token is configured, price of minting a
     * token on project `_projectId`, and currency symbol and address to be
     * used as payment.
     * @param _projectId Project ID to get price information for
     * @param _coreContract Contract address of the core contract
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
        uint256 _projectId,
        address _coreContract
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
            storage _setPriceProjectConfig = _setPriceProjectConfigMapping[
                _coreContract
            ][_projectId];
        isConfigured = _setPriceProjectConfig.priceIsConfigured;
        tokenPriceInWei = _setPriceProjectConfig.pricePerTokenInWei;
        currencySymbol = "ETH";
        currencyAddress = address(0);
    }

    /**
     * @notice Returns remaining invocations for a given address.
     * If `projectLimitsMintInvocationsPerAddress` is false, individual
     * addresses are only limited by the project's maximum invocations, and a
     * dummy value of zero is returned for `mintInvocationsRemaining`.
     * If `projectLimitsMintInvocationsPerAddress` is true, the quantity of
     * remaining mint invocations for address `_address` is returned as
     * `mintInvocationsRemaining`.
     * Note that mint invocations per address can be changed at any time by the
     * artist of a project.
     * Also note that all mint invocations are limited by a project's maximum
     * invocations as defined on the core contract. This function may return
     * a value greater than the project's remaining invocations.
     * @param _projectId Project ID to get remaining invocations for.
     * @param _coreContract Contract address of the core contract.
     * @param _address Wallet address to get remaining invocations for.
     * @return projectLimitsMintInvocationsPerAddress true if project limits
     * mint invocations per address, false if project does not limit mint
     * invocations per address.
     * @return mintInvocationsRemaining quantity of remaining mint invocations
     * for wallet at `_address`.
     */
    function projectRemainingInvocationsForAddress(
        uint256 _projectId,
        address _coreContract,
        address _address
    )
        external
        view
        returns (
            bool projectLimitsMintInvocationsPerAddress,
            uint256 mintInvocationsRemaining
        )
    {
        return
            MerkleLib.projectRemainingInvocationsForAddress(
                _projectId,
                _coreContract,
                _address
            );
    }

    /**
     * @notice projectId => maximum invocations per allowlisted address. If a
     * a value of 0 is returned, there is no limit on the number of mints per
     * allowlisted address.
     * Default behavior is limit 1 mint per address.
     * This value can be changed at any time by the artist.
     * @dev default value stated above must be updated if the value of
     * CONFIG_USE_MAX_INVOCATIONS_PER_ADDRESS_OVERRIDE is changed.
     * @param _projectId Project ID to get maximum invocations per address for.
     * @param _coreContract Contract address of the core contract.
     * @return Maximum number of invocations per address for project.
     */
    function projectMaxInvocationsPerAddress(
        uint256 _projectId,
        address _coreContract
    ) external view returns (uint256) {
        return
            MerkleLib.projectMaxInvocationsPerAddress(
                _projectId,
                _coreContract
            );
    }

    /**
     * @notice Processes a proof for an address.
     * @param _proof The proof to process.
     * @param _address The address to process the proof for.
     * @return The resulting hash from processing the proof.
     */
    function processProofForAddress(
        bytes32[] calldata _proof,
        address _address
    ) external pure returns (bytes32) {
        return MerkleLib.processProofForAddress(_proof, _address);
    }

    /**
     * @notice Returns hashed address (to be used as merkle tree leaf).
     * Included as a public function to enable users to calculate their hashed
     * address in Solidity when generating proofs off-chain.
     * @param _address address to be hashed
     * @return bytes32 hashed address, via keccak256 (using encodePacked)
     */
    function hashAddress(address _address) external pure returns (bytes32) {
        return MerkleLib.hashAddress(_address);
    }

    /**
     * @notice Syncs local maximum invocations of project `_projectId` based on
     * the value currently defined in the core contract.
     * @param _projectId Project ID to set the maximum invocations for.
     * @param _coreContract Core contract address for the given project.
     * @dev this enables gas reduction after maxInvocations have been reached -
     * core contracts shall still enforce a maxInvocation check during mint.
     */
    function syncProjectMaxInvocationsToCore(
        uint256 _projectId,
        address _coreContract
    ) public {
        AuthLib.onlyArtist({
            _projectId: _projectId,
            _coreContract: _coreContract,
            _sender: msg.sender
        });

        MaxInvocationsLib.syncProjectMaxInvocationsToCore(
            _projectId,
            _coreContract
        );
    }

    /**
     * @notice Purchases a token from project `_projectId` and sets
     * the token's owner to `_to`.
     * @param _to Address to be the new token's owner.
     * @param _projectId Project ID to mint a token on.
     * @param _coreContract Core contract address for the given project.
     * @param _proof Merkle proof for the given project.
     * @param _vault Vault being purchased on behalf of. Acceptable to be
     * `address(0)` if no vault.
     * @return tokenId Token ID of minted token
     */
    function purchaseTo(
        address _to,
        uint256 _projectId,
        address _coreContract,
        bytes32[] calldata _proof,
        address _vault // acceptable to be `address(0)` if no vault
    ) public payable nonReentrant returns (uint256 tokenId) {
        // CHECKS
        SetPriceLib.SetPriceProjectConfig
            storage _setPriceProjectConfig = _setPriceProjectConfigMapping[
                _coreContract
            ][_projectId];

        // pre-mint MaxInvocationsLib checks
        // Note that `maxHasBeenInvoked` is only checked here to reduce gas
        // consumption after a project has been fully minted.
        // `_maxInvocationsProjectConfig.maxHasBeenInvoked` is locally cached to reduce
        // gas consumption, but if not in sync with the core contract's value,
        // the core contract also enforces its own max invocation check during
        // minting.
        MaxInvocationsLib.preMintChecks(_projectId, _coreContract);

        // require artist to have configured price of token on this minter
        require(
            _setPriceProjectConfig.priceIsConfigured,
            "Price not configured"
        );

        // load price of token into memory
        uint256 pricePerTokenInWei = _setPriceProjectConfig.pricePerTokenInWei;

        require(msg.value >= pricePerTokenInWei, "Min value to mint req.");

        // NOTE: delegate-vault handling **begins here**.

        // handle that the vault may be either the `msg.sender` in the case
        // that there is not a true vault, or may be `_vault` if one is
        // provided explicitly (and it is valid).
        address vault = msg.sender;
        if (_vault != address(0)) {
            // If a vault is provided, it must be valid, otherwise throw rather
            // than optimistically-minting with original `msg.sender`.
            // Note, we do not check `checkDelegateForAll` as well, as it is known
            // to be implicitly checked by calling `checkDelegateForContract`.
            bool isValidDelegee = delegationRegistryContract
                .checkDelegateForContract(
                    msg.sender, // delegate
                    _vault, // vault
                    _coreContract // contract
                );
            require(isValidDelegee, "Invalid delegate-vault pairing");
            vault = _vault;
        }

        // pre-mint MerkleLib checks
        MerkleLib.preMintChecks(_projectId, _coreContract, _proof, vault);

        // EFFECTS
        // mint effects for MerkleLib
        MerkleLib.mintEffects(_projectId, _coreContract, vault);

        tokenId = minterFilter.mint_joo(
            _to,
            _projectId,
            _coreContract,
            msg.sender
        );

        MaxInvocationsLib.validatePurchaseEffectsInvocations(
            tokenId,
            _coreContract
        );

        // INTERACTIONS
        bool isEngine = SplitFundsLib.isEngine(
            _coreContract,
            _isEngineCaches[_coreContract]
        );
        SplitFundsLib.splitFundsETHRefundSender({
            _projectId: _projectId,
            _pricePerTokenInWei: pricePerTokenInWei,
            _coreContract: _coreContract,
            _isEngine: isEngine
        });

        return tokenId;
    }
}
