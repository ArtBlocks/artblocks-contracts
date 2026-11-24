// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.17;

/**
 * @title AbxfsCanonical
 * @notice The ABX FS contracts the dependency registry and generator read. ABX FS contracts are
 * immutable or stateless and deployed by CREATE2 through the keyless deployer, so each address is
 * the same on every chain ABX FS supports. See https://github.com/ArtBlocks/abxfs.
 * @author Art Blocks Inc.
 */
library AbxfsCanonical {
    /// @notice ABX FS FileStore: file records (size, codec) and their chunks.
    address internal constant FILE_STORE =
        0x8b6077a1d6953D96687005B9408D56A655b4d155;
    /// @notice ABX FS FileDataReader companion: a file's stored data, whole or by range, raw or
    /// base64-encoded, every chunk checked against its recorded content hash.
    address internal constant FILE_DATA_READER =
        0xb13D24967aB9B41787E2280D22d1d43a286c197a;
    /// @notice ABX FS file-level codec token for gzip (an IANA content-coding token as bytes32).
    bytes32 internal constant GZIP_CODEC = "gzip";
}
