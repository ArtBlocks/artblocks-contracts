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
import {IGenArt721CoreContractV3_Base} from "../../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import {IGenArt721CoreContractV3_ProjectFinance} from "../../../interfaces/v0.8.x/IGenArt721CoreContractV3_ProjectFinance.sol";

import {ERC165} from "@openzeppelin-4.7/contracts/utils/introspection/ERC165.sol";
import {IERC165} from "@openzeppelin-4.7/contracts/utils/introspection/IERC165.sol";
import {IERC2981} from "@openzeppelin-4.7/contracts/interfaces/IERC2981.sol";
import {ReentrancyGuard} from "@openzeppelin-4.7/contracts/security/ReentrancyGuard.sol";

/**
 * @title SeaDropXArtBlocksShim
 * @author Art Blocks Inc.
 * @notice A shim minter to allow OpenSea's SeaDrop system to mint Art Blocks tokens.
 */
contract SeaDropXArtBlocksShim is
    INonFungibleSeaDropToken,
    ERC721SeaDropStructsErrorsAndEvents,
    ERC165,
    ReentrancyGuard
{
    uint256 private constant ASSUMED_PROJECT_ID = 0;

    ISeaDrop public allowedSeaDrop;
    IGenArt721CoreContractV3_Base public genArt721Core;

    /// @notice mapping of minter address to number of tokens minted on this contract
    mapping(address => uint256) public minterNumMinted;

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
     * @notice Reverts if `msgSender` is not the owner or self.
     * This function is inlined instead of being a modifier
     * to save contract space from being inlined N times.
     * @param msgSender The address to check if owner or self.
     */
    function _onlyArtistOrSelf(address msgSender) internal view {
        if (
            msgSender != address(this) &&
            msgSender !=
            genArt721Core.projectIdToArtistAddress(ASSUMED_PROJECT_ID)
        ) {
            revert(
                "SeaDropXArtBlocksShim: Only the artist or self may call this function"
            );
        }
    }

    function _onlyArtist(address msgSender) internal view {
        if (
            msgSender !=
            genArt721Core.projectIdToArtistAddress(ASSUMED_PROJECT_ID)
        ) {
            revert(
                "SeaDropXArtBlocksShim: Only the artist may call this function"
            );
        }
    }

    constructor(
        ISeaDrop allowedSeaDrop_,
        IGenArt721CoreContractV3_Base genArt721Core_
    ) {
        allowedSeaDrop = allowedSeaDrop_;
        genArt721Core = genArt721Core_;
        emit SeaDropTokenDeployed();
    }

    // --- external functions from INonFungibleSeaDropToken ---

    // TODO - confirm that we can not support this function, making allowedSeaDrop immutable
    function updateAllowedSeaDrop(
        address[] calldata /*allowedSeaDrop*/
    ) external pure {
        revert("SeaDropXArtBlocksShim: updateAllowedSeaDrop not supported");
    }

    /**
     * @notice Mint tokens, restricted to the SeaDrop contract.
     * @param minter   The address to mint to.
     * @param quantity The number of tokens to mint.
     */
    function mintSeaDrop(
        address minter,
        uint256 quantity
    ) external virtual override nonReentrant {
        // Ensure the caller is an allowed SeaDrop contract
        _onlyAllowedSeaDrop(msg.sender);

        // no need for max supply check - enforced by the Art Blocks core contract
        // @dev acknowledge additional gas could be used to query and surface MintQuantityExceedsMaxSupply custom error

        // EFFECTS
        // track the number of tokens minted by the minter via this contract to enforce maxTotalMintableByWallet
        minterNumMinted[minter] += quantity;
        // @dev Art Blocks core contract updates total minted - no need to track here

        // INTERACTIONS
        // Mint the quantity of tokens to the minter
        for (uint256 i = 0; i < quantity; i++) {
            genArt721Core.mint_Ecf({
                _to: minter,
                _projectId: ASSUMED_PROJECT_ID,
                _by: msg.sender
            });
        }
    }

    /**
     * @notice Update the public drop data for this nft contract on SeaDrop.
     *         Only the owner can use this function.
     *
     * @param seaDropImpl The allowed SeaDrop contract.
     * @param publicDrop  The public drop data.
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
     *         Only the owner can use this function.
     *
     * @param seaDropImpl   The allowed SeaDrop contract.
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
     * @notice Update the token gated drop stage data for this nft contract
     *         on SeaDrop.
     *         Only the owner can use this function.
     *
     *         Note: If two INonFungibleSeaDropToken tokens are doing
     *         simultaneous token gated drop promotions for each other,
     *         they can be minted by the same actor until
     *         `maxTokenSupplyForStage` is reached. Please ensure the
     *         `allowedNftToken` is not running an active drop during the
     *         `dropStage` time period.
     *
     *
     * @param seaDropImpl     The allowed SeaDrop contract.
     * @param allowedNftToken The allowed nft token.
     * @param dropStage       The token gated drop stage data.
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
     *         Only the owner can use this function.
     *
     * @param seaDropImpl The allowed SeaDrop contract.
     * @param dropURI     The new drop URI.
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
     * @notice Update the creator payout address for this nft contract on
     *         SeaDrop.
     *         Only the owner can set the creator payout address.
     *
     * @param seaDropImpl   The allowed SeaDrop contract.
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
     * @notice Update the allowed fee recipient for this nft contract
     *         on SeaDrop.
     *
     * @param seaDropImpl  The allowed SeaDrop contract.
     * @param feeRecipient The new fee recipient.
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
     * @notice Update the server-side signers for this nft contract
     *         on SeaDrop.
     *         Only the owner can use this function.
     *
     * @param seaDropImpl                The allowed SeaDrop contract.
     * @param signer                     The signer to update.
     * @param signedMintValidationParams Minimum and maximum parameters
     *                                   to enforce for signed mints.
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
     *         Only the owner can use this function.
     *
     * @param seaDropImpl The allowed SeaDrop contract.
     * @param payer       The payer to update.
     * @param allowed     Whether the payer is allowed.
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
     * @notice Sets the base URI for the token metadata and emits an event.
     * Reverts - baseURI must be configured on the Art Blocks core contract.
     */
    function setBaseURI(string calldata /*tokenURI*/) external pure {
        revert(
            "SeaDropXArtBlocksShim: baseURI must be configured on the Art Blocks core contract"
        );
    }

    /**
     * @notice Sets the contract URI for contract metadata.
     * Reverts - contractURI is not supported on the Art Blocks core contract.
     */
    function setContractURI(string calldata /*newContractURI*/) external pure {
        revert(
            "SeaDropXArtBlocksShim: contractURI is not supported on the Art Blocks core contract"
        );
    }

    /**
     * @notice Sets the max supply and emits an event.
     * Reverts - maxSupply must be configured on the Art Blocks core contract.
     */
    function setMaxSupply(uint256 /*newMaxSupply*/) external pure {
        revert(
            "SeaDropXArtBlocksShim: maxSupply must be configured on the Art Blocks core contract"
        );
    }

    /**
     * @notice Sets the provenance hash and emits an event.
     * Not supported on Art Blocks contracts.
     */
    function setProvenanceHash(bytes32 /*newProvenanceHash*/) external pure {
        revert(
            "SeaDropXArtBlocksShim: provenance hash is not supported on Art Blocks contracts"
        );
    }

    /**
     * @notice Sets the address and basis points for royalties.
     * Reverts - royalties must be configured on the Art Blocks core contract.
     */
    function setRoyaltyInfo(RoyaltyInfo calldata /*newInfo*/) external pure {
        revert(
            "SeaDropXArtBlocksShim: royalties must be configured on the Art Blocks core contract"
        );
    }

    // --- external functions from https://github.com/ProjectOpenSea/seadrop/blob/main/src/ERC721SeaDrop.sol ---

    /**
     * @notice Configure multiple properties at a time.
     * Note: The individual configure methods should be used to unset or reset any properties to zero, as this method
     * will ignore zero-value properties in the config struct.
     * The following parameters are not supported in this function, and should be configured on the Art Blocks core
     * contract directly:
     * - maxSupply
     * - baseURI
     * - contractURI
     *
     *
     * @param config The configuration struct.
     */
    function multiConfigure(MultiConfigureStruct calldata config) external {
        // CHECKS
        _onlyArtist(msg.sender);

        // INTERACTIONS w/self
        if (config.maxSupply > 0) {
            revert(
                "SeaDropXArtBlocksShim: maxSupply must be configured on the Art Blocks core contract"
            );
        }
        if (bytes(config.baseURI).length != 0) {
            revert(
                "SeaDropXArtBlocksShim: baseURI must be configured on the Art Blocks core contract"
            );
        }
        if (bytes(config.contractURI).length != 0) {
            revert(
                "SeaDropXArtBlocksShim: contractURI must be configured on the Art Blocks core contract"
            );
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
            revert(
                "SeaDropXArtBlocksShim: provenance hash not supported on Art Blocks contracts"
            );
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

    // --- public view functions from INonFungibleSeaDropToken ---

    /**
     * @notice Returns a set of mint stats for the address.
     *         This assists SeaDrop in enforcing maxSupply,
     *         maxTotalMintableByWallet, and maxTokenSupplyForStage checks.
     *
     * @param minter The minter address.
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

        // defer to the core contract for the current supply details, for assumed project
        (
            uint256 invocations,
            uint256 maxInvocations
        ) = _getInvocationsDataFromCore();
        // current supply is number of invocations for the assumed project
        currentTotalSupply = invocations;
        // max supply is the max invocations for the assumed project
        maxSupply_ = maxInvocations;
    }

    // --- public view functions from ISeaDropTokenContractMetadata ---
    /**
     * @notice Returns the base URI for token metadata.
     */
    function baseURI() external view returns (string memory) {
        return genArt721Core.projectURIInfo(ASSUMED_PROJECT_ID);
    }

    /**
     * @notice Returns the contract URI.
     * Reverts, because the contract URI is not supported on Art Blocks contracts.
     */
    function contractURI() external pure returns (string memory) {
        revert(
            "SeaDropXArtBlocksShim: contractURI is not supported on Art Blocks contracts"
        );
    }

    /**
     * @notice Returns the max token supply.
     */
    function maxSupply() external view returns (uint256) {
        // defer to the core contract for the current supply details, for assumed project
        (, uint256 maxInvocations) = _getInvocationsDataFromCore();
        // max supply is the max invocations for the assumed project
        return maxInvocations;
    }

    /**
     * @notice Returns the provenance hash.
     *         The provenance hash is used for random reveals, which
     *         is a hash of the ordered metadata to show it is unmodified
     *         after mint has started.
     */
    function provenanceHash() external pure returns (bytes32) {
        revert(
            "SeaDropXArtBlocksShim: provenance hash is not supported on Art Blocks contracts"
        );
    }

    /**
     * @notice Returns the address that receives royalties.
     */
    function royaltyAddress() external view returns (address) {
        // defer to the core contract for the royalty splitter address, for assumed project
        // @dev assumes v3.2 or later, where the ERC2981 royaltySplitter is stored in the project financials
        return
            IGenArt721CoreContractV3_ProjectFinance(address(genArt721Core))
                .projectIdToFinancials(ASSUMED_PROJECT_ID)
                .royaltySplitter;
    }

    /**
     * @notice Returns the royalty basis points out of 10_000.
     */
    function royaltyBasisPoints() external view returns (uint256) {
        // defer to the core contract for the royalty basis points, for assumed project
        // @dev assumes v3.2 or later, where the ERC2981 royaltySplitter is stored in the project financials
        IGenArt721CoreContractV3_ProjectFinance.ProjectFinance
            memory financials = IGenArt721CoreContractV3_ProjectFinance(
                address(genArt721Core)
            ).projectIdToFinancials(ASSUMED_PROJECT_ID);
        // total royalty basis points is the sum of the artist's royalty percentage converted to BPS, the platform
        // provider's secondary sales BPS, and the render provider's secondary sales BPS
        return
            (financials.secondaryMarketRoyaltyPercentage * 100) +
            financials.platformProviderSecondarySalesBPS +
            financials.renderProviderSecondarySalesBPS;
    }

    // --- public view functions from IERC2981 ---

    /**
     * @dev Returns how much royalty is owed and to whom, based on a sale price that may be denominated in any unit of
     * exchange. The royalty amount is denominated and should be paid in that same unit of exchange.
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
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165, IERC165) returns (bool) {
        // Note: do not support ERC721, ERC721Metadata in this shim layer
        return
            interfaceId == type(INonFungibleSeaDropToken).interfaceId ||
            interfaceId == type(ISeaDropTokenContractMetadata).interfaceId ||
            interfaceId == type(IERC2981).interfaceId ||
            // ERC165 returns supportsInterface true for ERC165
            super.supportsInterface(interfaceId);
    }

    /**
     * @notice Returns the invocations and max invocations for the assumed project, from the core contract.
     * @return invocations The number of invocations for the assumed project.
     * @return maxInvocations The max invocations for the assumed project.
     */
    function _getInvocationsDataFromCore()
        private
        view
        returns (uint256 invocations, uint256 maxInvocations)
    {
        (invocations, maxInvocations, , , , ) = genArt721Core.projectStateData(
            ASSUMED_PROJECT_ID
        );
    }
}
