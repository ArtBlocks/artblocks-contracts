// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.22;

import {IPMPConfigureHook} from "../interfaces/v0.8.x/IPMPConfigureHook.sol";
import {IPMPV0} from "../interfaces/v0.8.x/IPMPV0.sol";
import {ERC165} from "@openzeppelin-5.0/contracts/utils/introspection/ERC165.sol";
import {IERC165} from "@openzeppelin-5.0/contracts/interfaces/IERC165.sol";

/**
 * @title Mock reentrant PMP configure hook
 * @notice Configure hook that attempts to write a PostParam on another token
 * from inside `onTokenPMPConfigure`. Exists to pin down the protocol behavior
 * that `FormPaletteBindingHooks` is designed around: `configureTokenParams` is
 * `nonReentrant`, so a configure hook can never write a PostParam, and a
 * binding scheme cannot re-render a second token in one transaction.
 */
contract MockPMPReentrantConfigureHook is IPMPConfigureHook, ERC165 {
    IPMPV0 public immutable pmp;
    address public immutable targetCoreContract;
    uint256 public immutable targetTokenId;
    string public targetKey;

    constructor(
        address pmp_,
        address targetCoreContract_,
        uint256 targetTokenId_,
        string memory targetKey_
    ) {
        pmp = IPMPV0(pmp_);
        targetCoreContract = targetCoreContract_;
        targetTokenId = targetTokenId_;
        targetKey = targetKey_;
    }

    function onTokenPMPConfigure(
        address /* coreContract */,
        uint256 /* tokenId */,
        IPMPV0.PMPInput calldata /* pmpInput */
    ) external override {
        IPMPV0.PMPInput[] memory pmpInputs = new IPMPV0.PMPInput[](1);
        pmpInputs[0] = IPMPV0.PMPInput({
            key: targetKey,
            configuredParamType: IPMPV0.ParamType.Uint256Range,
            configuredValue: bytes32(uint256(0)),
            configuringArtistString: false,
            configuredValueString: ""
        });
        // @dev reverts with ReentrancyGuardReentrantCall
        pmp.configureTokenParams(targetCoreContract, targetTokenId, pmpInputs);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IPMPConfigureHook).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
