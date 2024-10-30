// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
pragma solidity ^0.8.22;

interface IGenArt721GeneratorV0 {
    event DependencyRegistryUpdated(address indexed _dependencyRegistry);
    event ScriptyBuilderUpdated(address indexed _scriptyBuilder);
    event GunzipScriptBytecodeAddressUpdated(
        address indexed _gunzipScriptBytecodeAddress
    );
}
