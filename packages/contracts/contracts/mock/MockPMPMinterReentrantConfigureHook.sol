// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.22;

import {IPMPConfigureHook} from "../interfaces/v0.8.x/IPMPConfigureHook.sol";
import {IPMPV0} from "../interfaces/v0.8.x/IPMPV0.sol";
import {ERC165} from "@openzeppelin-5.0/contracts/utils/introspection/ERC165.sol";
import {IERC165} from "@openzeppelin-5.0/contracts/interfaces/IERC165.sol";

interface IMinterPMPPurchase {
    function purchase(
        uint256 projectId,
        address coreContract
    ) external payable returns (uint256 tokenId);

    function purchaseWithPMPs(
        uint256 projectId,
        address coreContract,
        IPMPV0.PMPInput[] calldata pmpInputs
    ) external payable returns (uint256 tokenId);
}

/**
 * @title Mock minter-reentrant PMP configure hook
 * @notice Configure hook that attempts to re-enter a purchase function on
 * `MinterSetPricePMPV0` from inside `onTokenPMPConfigure`, which the PMP
 * contract invokes while the minter's purchase is still in progress. Exists to
 * prove that the minter's `nonReentrant` guard blocks an artist-configured
 * hook from minting a second token in the same transaction.
 * @dev Funded with ETH by the test so that the reentrant call is fully paid
 * for, leaving the minter's reentrancy guard as the only thing that can stop
 * it.
 */
contract MockPMPMinterReentrantConfigureHook is IPMPConfigureHook, ERC165 {
    address public immutable minter;
    uint256 public immutable projectId;
    address public immutable coreContract;
    uint256 public immutable pricePerTokenInWei;
    // when true, re-enters `purchaseWithPMPs` rather than `purchase`
    bool public immutable reenterWithPMPs;

    constructor(
        address minter_,
        uint256 projectId_,
        address coreContract_,
        uint256 pricePerTokenInWei_,
        bool reenterWithPMPs_
    ) {
        minter = minter_;
        projectId = projectId_;
        coreContract = coreContract_;
        pricePerTokenInWei = pricePerTokenInWei_;
        reenterWithPMPs = reenterWithPMPs_;
    }

    function onTokenPMPConfigure(
        address /* coreContract */,
        uint256 /* tokenId */,
        IPMPV0.PMPInput calldata pmpInput
    ) external override {
        if (reenterWithPMPs) {
            // @dev forward the same input back through the PMP purchase path
            IPMPV0.PMPInput[] memory pmpInputs = new IPMPV0.PMPInput[](1);
            pmpInputs[0] = pmpInput;
            IMinterPMPPurchase(minter).purchaseWithPMPs{
                value: pricePerTokenInWei
            }(projectId, coreContract, pmpInputs);
        } else {
            IMinterPMPPurchase(minter).purchase{value: pricePerTokenInWei}(
                projectId,
                coreContract
            );
        }
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IPMPConfigureHook).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    // @dev allows the test to fund the reentrant purchase
    receive() external payable {}
}
