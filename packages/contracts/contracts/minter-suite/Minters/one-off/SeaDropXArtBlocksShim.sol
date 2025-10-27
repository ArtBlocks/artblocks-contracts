// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
pragma solidity 0.8.22;

import {INonFungibleSeaDropToken} from "../../../interfaces/v0.8.x/integration-refs/OpenSea/INonFungibleSeaDropToken.sol";
import {ISeaDropTokenContractMetadata} from "../../../interfaces/v0.8.x/integration-refs/OpenSea/ISeaDropTokenContractMetadata.sol";
import {ISeaDrop} from "../../../interfaces/v0.8.x/integration-refs/OpenSea/ISeaDrop.sol";
import {ERC721SeaDropStructsErrorsAndEvents} from "../../../interfaces/v0.8.x/integration-refs/OpenSea/ERC721SeaDropStructsErrorsAndEvents.sol";
import {PublicDrop, AllowListData, TokenGatedDropStage, SignedMintValidationParams} from "../../../interfaces/v0.8.x/integration-refs/OpenSea/SeaDropStructs.sol";
import {ISeaDropShimForContract} from "../../../interfaces/v0.8.x/ISeaDropShimForContract.sol";
import {IGenArt721CoreContractV3_Base} from "../../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import {IGenArt721CoreContractV3_ProjectFinance} from "../../../interfaces/v0.8.x/IGenArt721CoreContractV3_ProjectFinance.sol";
import {IMinterFilterV1} from "../../../interfaces/v0.8.x/IMinterFilterV1.sol";
import {ISharedMinterRequired} from "../../../interfaces/v0.8.x/ISharedMinterRequired.sol";

import {ERC165} from "@openzeppelin-4.7/contracts/utils/introspection/ERC165.sol";
import {IERC165} from "@openzeppelin-4.7/contracts/utils/introspection/IERC165.sol";
import {IERC2981} from "@openzeppelin-4.7/contracts/interfaces/IERC2981.sol";
import {ReentrancyGuard} from "@openzeppelin-4.7/contracts/security/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin-4.7/contracts/access/Ownable.sol";

/**
 * @title SeaDropXArtBlocksShim
 * @author Art Blocks Inc.
 * @notice A shim minter to allow OpenSea's SeaDrop system to mint Art Blocks tokens.
 * This contract is a shim layer between the SeaDrop system and the Art Blocks core contract.
 * It allows the SeaDrop system to mint Art Blocks tokens, enforcing the max supply and max mintable
 * by wallet restrictions.
 * The contract is owned by the artist, and the artist can configure the SeaDrop system to mint.
 * The contract is configured at the time of deployment to point to a single Art Blocks project, and
 * can never be updated.
 * A core contract is expected to set this contract as its minter, bypassing the typical Shared Minter Suite.
 * This contract does not support setting the baseURI, or fee recipients, as these are configured on the
 * Art Blocks core contract.
 * maxSupply is configurable on this contract, but should be less than or equal to the project's max invocations.
 * This contract does not support contractURI or provenanceHash, as these are not supported on Art Blocks contracts.
 * SeaDrop must be configured to route primary sales to the appropriate creator payout address. This will likely be a
 * splitter wallet that distributes funds to the artist and other parties such as render provider. The process is not
 * automated and must be done manually by the artist via the SeaDrop UI.
 * Any secondary fee recipients configured through SeaDrop will not be enforced on tokens minted through this shim,
 * as the fees are configured on the Art Blocks core contract for the tokens that are minted.
 */
contract SeaDropXArtBlocksShim is
    ISeaDropShimForContract,
    INonFungibleSeaDropToken,
    ISharedMinterRequired,
    ERC721SeaDropStructsErrorsAndEvents,
    ERC165,
    Ownable,
    ReentrancyGuard
{
    /// minterType for this minter
    // @dev no version due to no plan of indexing the minter in AB subgraph
    string public constant minterType = "SeaDropXArtBlocksShim";

    /// @notice The immutable project ID for the Art Blocks project.
    uint256 public immutable projectId;

    /// @notice The SeaDrop contract allowed to mint on this shim layer.
    ISeaDrop public immutable allowedSeaDrop;

    /// @notice The Art Blocks core contract for the project.
    IGenArt721CoreContractV3_Base public immutable genArt721Core;

    /// Minter filter this minter may interact with.
    IMinterFilterV1 public immutable minterFilter;

    /// @notice mapping of minter address to number of tokens minted on this contract
    mapping(address => uint256) public minterNumMinted;

    /// @notice local max supply for this contract, enforced by this contract. Defers to core if 0 or > core max invocations
    uint256 public localMaxSupply;

    // --- internal modifier-like functions ---

    /**
     * @notice Reverts if not an allowed SeaDrop contract.
     * This function is inlined instead of being a modifier
     * to save contract space from being inlined N times.
     * @param seaDrop The SeaDrop address to check if allowed.
     */
    function _onlyAllowedSeaDrop(address seaDrop) internal view {
        if (seaDrop != address(allowedSeaDrop)) {
            revert OnlyAllowedSeaDrop();
        }
    }

    /**
     * @notice Reverts if `msgSender` is not the artist or self.
     * This function is inlined instead of being a modifier
     * to save contract space from being inlined N times.
     * @param msgSender The address to check if artist or self.
     */
    function _onlyArtistOrSelf(address msgSender) internal view {
        if (
            msgSender != address(this) &&
            msgSender != genArt721Core.projectIdToArtistAddress(projectId)
        ) {
            revert(
                "SeaDropXArtBlocksShim: Only the artist or self may call this function"
            );
        }
    }

    /**
     * @notice Reverts if `msgSender` is not the artist.
     * This function is inlined instead of being a modifier
     * to save contract space from being inlined N times.
     * @param msgSender The address to check if artist.
     */
    function _onlyArtist(address msgSender) internal view {
        if (msgSender != genArt721Core.projectIdToArtistAddress(projectId)) {
            revert(
                "SeaDropXArtBlocksShim: Only the artist may call this function"
            );
        }
    }

    /**
     * @notice Constructor for the SeaDropXArtBlocksShim contract.
     * Transfers ownership to the artist address for the project, as indicated by the core contract.
     * @dev The ownership of this contract only affects frontend displays, and does not affect the permissions of
     * configuring drop settings.
     * allowedSeaDrop, genArt721Core, and projectId are immutable and cannot be updated.
     * @param minterFilter_ Minter filter for which this will be a filtered minter.
     * @param allowedSeaDrop_ The SeaDrop contract allowed to mint on this shim layer.
     * @param genArt721Core_ The core contract for the Art Blocks project.
     * @param projectId_ The project ID for the Art Blocks project.
     */
    constructor(
        IMinterFilterV1 minterFilter_,
        ISeaDrop allowedSeaDrop_,
        IGenArt721CoreContractV3_Base genArt721Core_,
        uint256 projectId_
    ) Ownable() {
        minterFilter = minterFilter_;
        allowedSeaDrop = allowedSeaDrop_;
        genArt721Core = genArt721Core_;
        projectId = projectId_;
        // set ownership to be the artist (snapshot)
        // @dev if artist address is updated on the core contract, use the function syncOwnerToArtistAddress to update
        // the ownership of this contract to the new artist address. The ownership of this contract only affects
        // frontend displays, and does not affect the permissions of configuring drop settings.
        _transferOwnership(genArt721Core.projectIdToArtistAddress(projectId_));
        // emit SeaDrop event for indexing purposes
        emit SeaDropTokenDeployed();
        // indicate this is a shim layer that mints tokens on a different contract, for OpenSea's indexing purposes
        emit SeaDropShimForContract(address(genArt721Core_));
    }

    // -- external functions to sync ownership for UI --

    /**
     * @notice Sync the ownership of this contract to the artist address on the core contract.
     * This function is useful if the artist address is updated on the core contract.
     * The ownership of this contract only affects frontend displays, and does not affect the permissions of
     * configuring drop settings.
     * @dev intentionally unpermissioned, as this function only syncs state and is not manipulatable by untrusted
     * third parties.
     */
    function syncOwnerToArtistAddress() external {
        _transferOwnership(genArt721Core.projectIdToArtistAddress(projectId));
    }

    // --- external functions from INonFungibleSeaDropToken ---

    /**
     *
     * @notice Update the allowed SeaDrop contract.
     * Reverts - not supported on this contract.
     */
    function updateAllowedSeaDrop(
        address[] calldata /*allowedSeaDrop*/
    ) external pure {
        revert("SeaDropXArtBlocksShim: updateAllowedSeaDrop not supported");
    }

    /**
     * @notice Mint tokens, restricted to the SeaDrop contract.
     * @param minter The address to mint to.
     * @param quantity The number of tokens to mint.
     */
    function mintSeaDrop(
        address minter,
        uint256 quantity
    ) external virtual override nonReentrant {
        // Ensure the caller is an allowed SeaDrop contract
        _onlyAllowedSeaDrop(msg.sender);

        // check max supply, considering the local max supply and the core project's max invocations
        // @dev block scope to free up stack
        {
            (
                uint256 invocations,
                uint256 maxInvocations
            ) = _getInvocationsDataFromCore();
            uint256 maxSupply_ = _calcMaxSupply({
                coreMaxInvocations: maxInvocations,
                localMaxSupply_: localMaxSupply
            });
            if (invocations + quantity > maxSupply_) {
                revert MintQuantityExceedsMaxSupply(
                    invocations + quantity,
                    maxSupply_
                );
            }
        }

        // EFFECTS
        // track the number of tokens minted by the minter via this contract to enforce maxTotalMintableByWallet
        minterNumMinted[minter] += quantity;
        // @dev Art Blocks core contract updates total minted - no need to track here

        // INTERACTIONS
        // Mint the quantity of tokens to the minter
        for (uint256 i = 0; i < quantity; i++) {
            minterFilter.mint_joo({
                to: minter,
                projectId: projectId,
                coreContract: address(genArt721Core),
                sender: msg.sender
            });
        }
    }

    /**
     * @notice Update the public drop data for this nft contract on SeaDrop.
     * Only the artist can use this function.
     * @param seaDropImpl The allowed SeaDrop contract.
     * @param publicDrop The public drop data.
     */
    function updatePublicDrop(
        address seaDropImpl,
        PublicDrop calldata publicDrop
    ) external {
        // CHECKS
        // sender must be artist or contract itself
        _onlyArtistOrSelf(msg.sender);
        // only update the allowed SeaDrop contract
        _onlyAllowedSeaDrop(seaDropImpl);

        // EFFECTS
        // update the public drop data on SeeaDrop
        allowedSeaDrop.updatePublicDrop(publicDrop);
    }

    /**
     * @notice Update the allow list data for this nft contract on SeaDrop.
     * Only the artist can use this function.
     * @param seaDropImpl The allowed SeaDrop contract.
     * @param allowListData The allow list data.
     */
    function updateAllowList(
        address seaDropImpl,
        AllowListData calldata allowListData
    ) external virtual override {
        // CHECKS
        // sender must be artist or contract itself
        _onlyArtistOrSelf(msg.sender);
        // only update the allowed SeaDrop contract
        _onlyAllowedSeaDrop(seaDropImpl);

        // EFFECTS
        // Update the allow list on SeaDrop.
        ISeaDrop(seaDropImpl).updateAllowList(allowListData);
    }

    /**
     * @notice Update the token gated drop stage data for this nft contract on SeaDrop.
     * Only the artist can use this function.
     *
     * Note: If two INonFungibleSeaDropToken tokens are doing
     * simultaneous token gated drop promotions for each other,
     * they can be minted by the same actor until
     * `maxTokenSupplyForStage` is reached. Please ensure the
     * `allowedNftToken` is not running an active drop during the
     * `dropStage` time period.
     * @param seaDropImpl The allowed SeaDrop contract.
     * @param allowedNftToken The allowed nft token.
     * @param dropStage The token gated drop stage data.
     */
    function updateTokenGatedDrop(
        address seaDropImpl,
        address allowedNftToken,
        TokenGatedDropStage calldata dropStage
    ) external virtual override {
        // CHECKS
        // sender must be artist or contract itself
        _onlyArtistOrSelf(msg.sender);
        // only update the allowed SeaDrop contract
        _onlyAllowedSeaDrop(seaDropImpl);

        // EFFECTS
        // Update the token gated drop stage.
        ISeaDrop(seaDropImpl).updateTokenGatedDrop(allowedNftToken, dropStage);
    }

    /**
     * @notice Update the drop URI for this nft contract on SeaDrop.
     * Only the artist can use this function.
     * @param seaDropImpl The allowed SeaDrop contract.
     * @param dropURI The new drop URI.
     */
    function updateDropURI(
        address seaDropImpl,
        string calldata dropURI
    ) external virtual override {
        // CHECKS
        // sender must be artist or contract itself
        _onlyArtistOrSelf(msg.sender);
        // only update the allowed SeaDrop contract
        _onlyAllowedSeaDrop(seaDropImpl);

        // EFFECTS
        // Update the drop URI.
        ISeaDrop(seaDropImpl).updateDropURI(dropURI);
    }

    /**
     * @notice Update the creator payout address for this nft contract on SeaDrop.
     * Only the artist can set the creator payout address.
     * @param seaDropImpl The allowed SeaDrop contract.
     * @param payoutAddress The new payout address.
     */
    function updateCreatorPayoutAddress(
        address seaDropImpl,
        address payoutAddress
    ) external virtual override {
        // CHECKS
        // sender must be artist or contract itself
        _onlyArtistOrSelf(msg.sender);
        // only update the allowed SeaDrop contract
        _onlyAllowedSeaDrop(seaDropImpl);

        // EFFECTS
        // Update the creator payout address.
        ISeaDrop(seaDropImpl).updateCreatorPayoutAddress(payoutAddress);
    }

    /**
     * @notice Update the allowed fee recipient for this nft contract on SeaDrop.
     * Note: ERC2981 fees must be configured on the Art Blocks core contract. This setting has no effect on tokens
     * minted on the core contract that this shim layer is for.
     * @param seaDropImpl  The allowed SeaDrop contract.
     * @param feeRecipient The new fee recipient.
     * @param allowed Whether the fee recipient is allowed.
     */
    function updateAllowedFeeRecipient(
        address seaDropImpl,
        address feeRecipient,
        bool allowed
    ) external virtual override {
        // CHECKS
        // sender must be artist or contract itself
        _onlyArtistOrSelf(msg.sender);
        // only update the allowed SeaDrop contract
        _onlyAllowedSeaDrop(seaDropImpl);

        // EFFECTS
        // Update the allowed fee recipient.
        ISeaDrop(seaDropImpl).updateAllowedFeeRecipient(feeRecipient, allowed);
    }

    /**
     * @notice Update the server-side signers for this nft contract on SeaDrop.
     * Only the artist can use this function.
     * @param seaDropImpl The allowed SeaDrop contract.
     * @param signer The signer to update.
     * @param signedMintValidationParams Minimum and maximum parameters to enforce for signed mints.
     */
    function updateSignedMintValidationParams(
        address seaDropImpl,
        address signer,
        SignedMintValidationParams memory signedMintValidationParams
    ) external virtual override {
        // CHECKS
        // sender must be artist or contract itself
        _onlyArtistOrSelf(msg.sender);
        // only update the allowed SeaDrop contract
        _onlyAllowedSeaDrop(seaDropImpl);

        // EFFECTS
        // Update the signer.
        ISeaDrop(seaDropImpl).updateSignedMintValidationParams(
            signer,
            signedMintValidationParams
        );
    }

    /**
     * @notice Update the allowed payers for this nft contract on SeaDrop.
     * Only the artist can use this function.
     * @param seaDropImpl The allowed SeaDrop contract.
     * @param payer The payer to update.
     * @param allowed Whether the payer is allowed.
     */
    function updatePayer(
        address seaDropImpl,
        address payer,
        bool allowed
    ) external virtual override {
        // CHECKS
        // sender must be artist or contract itself
        _onlyArtistOrSelf(msg.sender);
        // only update the allowed SeaDrop contract
        _onlyAllowedSeaDrop(seaDropImpl);

        // EFFECTS
        // Update the payer.
        ISeaDrop(seaDropImpl).updatePayer(payer, allowed);
    }

    // --- external functions from ISeaDropTokenContractMetadata ---

    /**
     * @notice Sets the base URI for the token metadata.
     * Warning - baseURI is a no-op on this shim contract, and the baseURI must be configured
     * on the Art Blocks core contract. This function is included for compatibility with the
     * SeaDropTokenContractMetadata interface to prevent unnecessary reverts. No-op is preferred
     * over reverting.
     */
    function setBaseURI(string calldata /*tokenURI*/) external view {
        // CHECKS
        _onlyArtistOrSelf(msg.sender);

        // EFFECTS
        // no-op
    }

    /**
     * @notice Sets the contract URI for contract metadata.
     * Warning - contractURI is a no-op on this shim contract, and the contractURI must be configured
     * on the Art Blocks core contract. This function is included for compatibility with the
     * SeaDropTokenContractMetadata interface to prevent unnecessary reverts. No-op is preferred
     * over reverting.
     */
    function setContractURI(string calldata /*newContractURI*/) external view {
        // CHECKS
        _onlyArtistOrSelf(msg.sender);

        // EFFECTS
        // no-op
    }

    /**
     * @notice Sets the max supply and emits an event.
     * newMaxSupply must be less than or equal to the project's maxInvocations configured on the Art Blocks core
     * contract.
     * @dev this function enables SeaDrop to enforce a minter-local max invocations, while still deferring to the core
     * contract for the project's total max invocations.
     * @param newMaxSupply The new max supply to limit this shim minter to. Stored locally - does not affect max
     * invocations on the core contract.
     */
    function setMaxSupply(uint256 newMaxSupply) external {
        // CHECKS
        _onlyArtistOrSelf(msg.sender);

        // ensure maxSupply lte project's max invocations on core contract
        (, uint256 maxInvocationsOnCoreContract) = _getInvocationsDataFromCore();
        if (newMaxSupply > maxInvocationsOnCoreContract) {
            require(newMaxSupply == 200_000_000 && maxInvocationsOnCoreContract == 1_000_000,
                "SeaDropXArtBlocksShim: Only newMaxSupply lte max invocations on the Art Blocks core contract"
            );
        }

        // EFFECTS
        // set the local max supply
        localMaxSupply = newMaxSupply;
        emit MaxSupplyUpdated(newMaxSupply);
    }

    /**
     * @notice Sets the provenance hash.
     * Warning - provenanceHash is a no-op on this shim contract, and the provenanceHash is not supported
     * on the Art Blocks core contract. This function is included for compatibility with the
     * SeaDropTokenContractMetadata interface to prevent unnecessary reverts. No-op is preferred
     * over reverting.
     */
    function setProvenanceHash(bytes32 /*newProvenanceHash*/) external view {
        // CHECKS
        _onlyArtistOrSelf(msg.sender);

        // EFFECTS
        // no-op
    }

    /**
     * @notice Sets the address and basis points for royalties.
     * Warning - royalties are a no-op on this shim contract, and the royalties must be configured
     * on the Art Blocks core contract. This function is included for compatibility with the
     * SeaDropTokenContractMetadata interface to prevent unnecessary reverts. No-op is preferred
     * over reverting.
     */
    function setRoyaltyInfo(RoyaltyInfo calldata /*newInfo*/) external view {
        // CHECKS
        _onlyArtistOrSelf(msg.sender);

        // EFFECTS
        // no-op
    }

    // --- external functions from https://github.com/ProjectOpenSea/seadrop/blob/main/src/ERC721SeaDrop.sol ---

    /**
     * @notice Configure multiple properties at a time.
     * Note: The individual configure methods should be used to unset or reset any properties to zero, as this method
     * will ignore zero-value properties in the config struct.
     * The following parameters are not supported in this function, and will be ignored/no-op:
     * - baseURI
     * - contractURI
     * - provenanceHash
     * @dev logic for supported operations is taken from example SeaDrop implementation, and was tested end-to-end, and
     * therefore may not be covered in this repository's tests. Unsupported operations are tested for reversion.
     * @param config The configuration struct.
     */
    function multiConfigure(MultiConfigureStruct calldata config) external {
        // CHECKS
        _onlyArtist(msg.sender);

        // INTERACTIONS w/self
        if (config.maxSupply > 0) {
            this.setMaxSupply(config.maxSupply);
        }
        if (bytes(config.baseURI).length != 0) {
            // @dev this is a no-op on this shim contract
            this.setBaseURI(config.baseURI);
        }
        if (bytes(config.contractURI).length != 0) {
            // @dev this is a no-op on this shim contract
            this.setContractURI(config.contractURI);
        }
        if (
            config.publicDrop.startTime != 0 || config.publicDrop.endTime != 0
        ) {
            this.updatePublicDrop(config.seaDropImpl, config.publicDrop);
        }
        if (bytes(config.dropURI).length != 0) {
            this.updateDropURI(config.seaDropImpl, config.dropURI);
        }
        if (config.allowListData.merkleRoot != bytes32(0)) {
            this.updateAllowList(config.seaDropImpl, config.allowListData);
        }
        if (config.creatorPayoutAddress != address(0)) {
            this.updateCreatorPayoutAddress(
                config.seaDropImpl,
                config.creatorPayoutAddress
            );
        }
        if (config.provenanceHash != bytes32(0)) {
            // @dev this is a no-op on this shim contract
            this.setProvenanceHash(config.provenanceHash);
        }
        if (config.allowedFeeRecipients.length > 0) {
            for (uint256 i = 0; i < config.allowedFeeRecipients.length; ) {
                this.updateAllowedFeeRecipient(
                    config.seaDropImpl,
                    config.allowedFeeRecipients[i],
                    true
                );
                unchecked {
                    ++i;
                }
            }
        }
        if (config.disallowedFeeRecipients.length > 0) {
            for (uint256 i = 0; i < config.disallowedFeeRecipients.length; ) {
                this.updateAllowedFeeRecipient(
                    config.seaDropImpl,
                    config.disallowedFeeRecipients[i],
                    false
                );
                unchecked {
                    ++i;
                }
            }
        }
        if (config.allowedPayers.length > 0) {
            for (uint256 i = 0; i < config.allowedPayers.length; ) {
                this.updatePayer(
                    config.seaDropImpl,
                    config.allowedPayers[i],
                    true
                );
                unchecked {
                    ++i;
                }
            }
        }
        if (config.disallowedPayers.length > 0) {
            for (uint256 i = 0; i < config.disallowedPayers.length; ) {
                this.updatePayer(
                    config.seaDropImpl,
                    config.disallowedPayers[i],
                    false
                );
                unchecked {
                    ++i;
                }
            }
        }
        if (config.tokenGatedDropStages.length > 0) {
            if (
                config.tokenGatedDropStages.length !=
                config.tokenGatedAllowedNftTokens.length
            ) {
                revert TokenGatedMismatch();
            }
            for (uint256 i = 0; i < config.tokenGatedDropStages.length; ) {
                this.updateTokenGatedDrop(
                    config.seaDropImpl,
                    config.tokenGatedAllowedNftTokens[i],
                    config.tokenGatedDropStages[i]
                );
                unchecked {
                    ++i;
                }
            }
        }
        if (config.disallowedTokenGatedAllowedNftTokens.length > 0) {
            for (
                uint256 i = 0;
                i < config.disallowedTokenGatedAllowedNftTokens.length;

            ) {
                TokenGatedDropStage memory emptyStage;
                this.updateTokenGatedDrop(
                    config.seaDropImpl,
                    config.disallowedTokenGatedAllowedNftTokens[i],
                    emptyStage
                );
                unchecked {
                    ++i;
                }
            }
        }
        if (config.signedMintValidationParams.length > 0) {
            if (
                config.signedMintValidationParams.length !=
                config.signers.length
            ) {
                revert SignersMismatch();
            }
            for (
                uint256 i = 0;
                i < config.signedMintValidationParams.length;

            ) {
                this.updateSignedMintValidationParams(
                    config.seaDropImpl,
                    config.signers[i],
                    config.signedMintValidationParams[i]
                );
                unchecked {
                    ++i;
                }
            }
        }
        if (config.disallowedSigners.length > 0) {
            for (uint256 i = 0; i < config.disallowedSigners.length; ) {
                SignedMintValidationParams memory emptyParams;
                this.updateSignedMintValidationParams(
                    config.seaDropImpl,
                    config.disallowedSigners[i],
                    emptyParams
                );
                unchecked {
                    ++i;
                }
            }
        }
    }

    // -- required shared minter view functions for minter suite compatibility (ISharedMinterRequired) --

    // @dev minterType requirement satisfied by public constant minterType

    /**
     * @notice Returns the minter's associated shared minter filter address.
     * @dev used by subgraph indexing service for entity relation purposes.
     * @return The minter filter address.
     */
    function minterFilterAddress() external view returns (address) {
        return address(minterFilter);
    }

    // --- public view functions from INonFungibleSeaDropToken ---

    /**
     * @notice Returns a set of mint stats for the address. This assists SeaDrop in enforcing maxSupply,
     * maxTotalMintableByWallet, and maxTokenSupplyForStage checks.
     * @param minter The minter address.
     * @return minterNumMinted_ The number of tokens minted by the minter.
     * @return currentTotalSupply The current total supply of the project (sourced from the core contract).
     * @return maxSupply_ The max supply of the project (sourced from the core contract).
     */
    function getMintStats(
        address minter
    )
        external
        view
        override
        returns (
            uint256 minterNumMinted_,
            uint256 currentTotalSupply,
            uint256 maxSupply_
        )
    {
        // @dev only able to track mint qty performed via this contract; Art Blocks does not implement ERC721Enumerable
        minterNumMinted_ = minterNumMinted[minter];

        // defer to the core contract for the current supply details, for configured project
        (
            uint256 invocations,
            uint256 maxInvocations
        ) = _getInvocationsDataFromCore();
        // current supply is number of invocations for the configured project
        currentTotalSupply = invocations;
        // max supply depends on the local max supply and the core project's max invocations
        maxSupply_ = _calcMaxSupply({
            coreMaxInvocations: maxInvocations,
            localMaxSupply_: localMaxSupply
        });
    }

    // --- public view functions from ISeaDropTokenContractMetadata ---
    /**
     * @notice Returns the base URI for token metadata.
     * @return The base URI.
     */
    function baseURI() external view returns (string memory) {
        return genArt721Core.projectURIInfo(projectId);
    }

    /**
     * @notice Returns the contract URI.
     * Reverts, because the contract URI is not supported on Art Blocks contracts.
     */
    function contractURI() external pure returns (string memory) {
        // return "https://external-link-url.com/my-contract-metadata.json";
        revert(
            "SeaDropXArtBlocksShim: contractURI not supported on the Art Blocks core contract"
        );
    }

    /**
     * @notice Returns the max token supply for the configured project.
     */
    function maxSupply() external view returns (uint256) {
        // defer to the core contract for the current supply details, for configured project
        (, uint256 maxInvocations) = _getInvocationsDataFromCore();
        return
            _calcMaxSupply({
                coreMaxInvocations: maxInvocations,
                localMaxSupply_: localMaxSupply
            });
    }

    /**
     * @notice Returns the provenance hash.
     * Reverts - provenance hash is not supported on Art Blocks contracts.
     */
    function provenanceHash() external pure returns (bytes32) {
        revert(
            "SeaDropXArtBlocksShim: provenance hash not supported on Art Blocks contracts"
        );
    }

    /**
     * @notice Returns the address that receives royalties.
     * @dev defers to the core contract for the royalty splitter address, for configured project.
     * @return The address that receives royalties.
     */
    function royaltyAddress() external view returns (address) {
        // defer to the core contract for the royalty splitter address, for configured project
        // @dev assumes v3.2 or later, where the ERC2981 royaltySplitter is stored in the project financials
        return
            IGenArt721CoreContractV3_ProjectFinance(address(genArt721Core))
                .projectIdToFinancials(projectId)
                .royaltySplitter;
    }

    /**
     * @notice Returns the royalty basis points out of 10_000.
     * @dev defers to the core contract for the royalty basis points, for configured project.
     * @return The royalty basis points.
     */
    function royaltyBasisPoints() external view returns (uint256) {
        // defer to the core contract for the royalty basis points, for configured project
        // @dev assumes v3.2 or later, where the ERC2981 royaltySplitter is stored in the project financials
        IGenArt721CoreContractV3_ProjectFinance.ProjectFinance
            memory financials = IGenArt721CoreContractV3_ProjectFinance(
                address(genArt721Core)
            ).projectIdToFinancials(projectId);
        // total royalty basis points is the sum of the artist's royalty percentage converted to BPS, the platform
        // provider's secondary sales BPS, and the render provider's secondary sales BPS
        // @dev uint256 required to avoid overflow for reasonable royalty percentages
        return
            (uint256(financials.secondaryMarketRoyaltyPercentage) * 100) +
            financials.platformProviderSecondarySalesBPS +
            financials.renderProviderSecondarySalesBPS;
    }

    // --- public view functions from IERC2981 ---

    /**
     * @notice Returns the royalty receiver and amount for a given token ID and sale price.
     * @dev Returns how much royalty is owed and to whom, based on a sale price that may be denominated in any unit of
     * exchange. The royalty amount is denominated and should be paid in that same unit of exchange.
     * @param tokenId The token ID for which royalty information is needed.
     * @param salePrice The sale price of the token.
     * @return receiver The address of the royalty receiver.
     * @return royaltyAmount The amount of royalty that is owed.
     */
    function royaltyInfo(
        uint256 tokenId,
        uint256 salePrice
    ) external view returns (address receiver, uint256 royaltyAmount) {
        // defer to the core contract for the royalty receiver and amount, for the given token ID
        // @dev assumes v3.2 or later, where ERC2981 is supported
        return
            IERC2981(address(genArt721Core)).royaltyInfo({
                tokenId: tokenId,
                salePrice: salePrice
            });
    }

    // --- public view functions from IERC165 ---

    /**
     * @notice Returns whether the interface is supported.
     * @param interfaceId The interface id to check against.
     * @return Whether the interface is supported.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165, IERC165) returns (bool) {
        // @dev no coverage
        // Note: do not support ERC721, ERC721Metadata in this shim layer
        return
            interfaceId == type(INonFungibleSeaDropToken).interfaceId ||
            interfaceId == type(ISeaDropTokenContractMetadata).interfaceId ||
            interfaceId == type(IERC2981).interfaceId ||
            // ERC165 returns supportsInterface true for ERC165
            super.supportsInterface(interfaceId);
    }

    /**
     * @notice Returns the invocations and max invocations for the configured project, from the core contract.
     * @return invocations The number of invocations for the configured project.
     * @return maxInvocations The max invocations for the configured project.
     */
    function _getInvocationsDataFromCore()
        private
        view
        returns (uint256 invocations, uint256 maxInvocations)
    {
        (invocations, maxInvocations, , , , ) = genArt721Core.projectStateData(
            projectId
        );
    }

    /**
     * helper function to calculate the max supply for this contract, based on the core max invocations and local max
     * supply.
     * @dev if localMaxSupply is 0 or > coreMaxInvocations, defers to coreMaxInvocations
     * @param coreMaxInvocations The max invocations for the configured project on the Art Blocks core contract.
     * @param localMaxSupply_ The local max supply for this contract (configured via setMaxSupply).
     */
    function _calcMaxSupply(
        uint256 coreMaxInvocations,
        uint256 localMaxSupply_
    ) private pure returns (uint256) {
        return
            localMaxSupply_ == 0 || localMaxSupply_ > coreMaxInvocations
                ? coreMaxInvocations
                : localMaxSupply_;
    }
}
