// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
pragma solidity 0.8.22;

/**
 * @title LegacyDependencyDetailsV2ReaderMock
 * @notice Calls `getDependencyDetailsV2` through the `DependencyDetails` struct as it was before
 * `abxfsFileCid` was appended, compiled with the generator's compiler version. The generator live
 * on mainnet decodes `getDependencyDetailsV2` this way until it is upgraded, so this proves that
 * upgrading the registry first leaves the deployed generator working.
 */
contract LegacyDependencyDetailsV2ReaderMock {
    enum CanvasTagType {
        NoCanvasTag,
        CanvasBeforeProjectScript,
        CanvasAfterProjectScript
    }

    enum ProjectScriptTagType {
        ClassicScript,
        Module,
        SpecialType,
        RawHtml
    }

    // @dev DependencyDetails before abxfsFileCid was appended
    struct LegacyDependencyDetails {
        string nameAndVersion;
        string licenseType;
        string preferredCDN;
        uint24 additionalCDNCount;
        string preferredRepository;
        uint24 additionalRepositoryCount;
        string dependencyWebsite;
        bool availableOnChain;
        uint24 scriptCount;
        bool loadAsModule;
        CanvasTagType canvasTagType;
        ProjectScriptTagType projectScriptTagType;
        string projectScriptSpecialType;
    }

    function getLegacyDependencyDetailsV2(
        address dependencyRegistry,
        bytes32 dependencyNameAndVersion
    ) external view returns (LegacyDependencyDetails memory) {
        return
            ILegacyDependencyRegistryV0(dependencyRegistry)
                .getDependencyDetailsV2(dependencyNameAndVersion);
    }
}

interface ILegacyDependencyRegistryV0 {
    function getDependencyDetailsV2(
        bytes32 dependencyNameAndVersion
    )
        external
        view
        returns (
            LegacyDependencyDetailsV2ReaderMock.LegacyDependencyDetails memory
        );
}
