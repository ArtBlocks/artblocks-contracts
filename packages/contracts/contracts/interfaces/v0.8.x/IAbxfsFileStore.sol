// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
pragma solidity ^0.8.17;

/**
 * @title IAbxfsFileStore
 * @notice Minimal read interface of the ABX FS FileStore, the store-layer contract holding ABX FS
 * files. FileStore is immutable and deployed by CREATE2 at the same address on every supported
 * chain, and a file's CID is derived from its content, so a CID is valid on every chain the file
 * has been uploaded to.
 * @dev Mirrors the subset of ABX FS `IFileStore` read by the generator. See
 * https://github.com/ArtBlocks/abxfs (packages/contracts-core/src/interfaces/IFileStore.sol).
 * A file's "data" is its stored bytes (chunks joined); when `codec` is non-zero (e.g. "gzip"),
 * the file's content is `decode(codec, data)` and is decoded off chain.
 */
interface IAbxfsFileStore {
    struct FileInfo {
        bytes32 root;
        uint8 rootLevel;
        uint256 chunkCount;
        // total bytes of the joined chunk data, before any file-level codec is decoded
        uint256 size;
        string mimeType;
        bytes32 codec;
        bytes32 outputHash;
    }

    /**
     * @notice Returns the metadata of file `cid`. Returns a zero-valued struct, rather than
     * reverting, for a CID that is not a file on this chain.
     */
    function getFileInfo(
        bytes32 cid
    ) external view returns (FileInfo memory info);

    /**
     * @notice Returns the stored bytes of chunk `index` of file `cid`. ChunkStore checks each
     * chunk against its content hash on read, so these are exactly the bytes that were uploaded.
     */
    function readChunk(
        bytes32 cid,
        uint256 index
    ) external view returns (bytes memory data);
}
