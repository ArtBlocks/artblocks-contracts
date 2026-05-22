// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.22;

import {AbstractPMPAugmentHook} from "./AbstractPMPAugmentHook.sol";

import {IWeb3Call} from "../../interfaces/v0.8.x/IWeb3Call.sol";
import {SSTORE2} from "../../libs/v0.8.x/SSTORE2.sol";
import {ABHelpers} from "../../libs/v0.8.x/ABHelpers.sol";

import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";
import {Ownable} from "@openzeppelin-5.0/contracts/access/Ownable.sol";

/**
 * @title InjectBytesPerToken
 * @author Art Blocks Inc.
 * @notice This hook injects uploaded bytes per token, into a token's PMPs.
 */
contract InjectBytesPerToken is AbstractPMPAugmentHook, Ownable {
    using Strings for uint256;

    event TokenDataUploadedAtIndex(
        uint256 indexed tokenNumber,
        uint256 indexed chunkIndex,
        address dataPointer
    );
    event TokenDataClearedAtIndex(
        uint256 indexed tokenNumber,
        uint256 indexed chunkIndex
    );

    // mapping of token number to chunk index to data pointer (SSTORE2 pointer)
    mapping(uint256 tokenNumber => mapping(uint256 chunkIndex => address dataPointer))
        public tokenDataPointers;

    // mapping of token number to highest chunk index
    mapping(uint256 tokenNumber => uint256 numChunks) public numChunksOfToken;

    /**
     * @notice Constructor
     * @param owner_ The owner of the contract.
     */
    constructor(address owner_) Ownable(owner_) {}

    /**
     * @notice Augment the token parameters for a given token.
     * Appends uploaded bytes per token into a tokens PMPs.
     * @dev This hook is called when a token's PMPs are read.
     * @dev This must return all desired tokenParams, not just additional data.
     * @param tokenParams The token parameters for the queried token.
     * @return augmentedTokenParams The augmented token parameters.
     */
    function onTokenPMPReadAugmentation(
        address /* coreContract */,
        uint256 tokenId,
        IWeb3Call.TokenParam[] calldata tokenParams
    )
        external
        view
        override
        returns (IWeb3Call.TokenParam[] memory augmentedTokenParams)
    {
        // create a new tokenParam array with one extra element
        uint256 originalLength = tokenParams.length;
        uint256 newLength = originalLength + 1;
        augmentedTokenParams = new IWeb3Call.TokenParam[](newLength);

        // copy the original tokenParams into the new array
        for (uint256 i = 0; i < originalLength; i++) {
            augmentedTokenParams[i] = tokenParams[i];
        }

        // get + inject the uploaded bytes per token into the new array
        uint256 tokenNumber = ABHelpers.tokenIdToTokenNumber(tokenId);
        augmentedTokenParams[originalLength] = IWeb3Call.TokenParam({
            key: "tokenData",
            value: getAllTokenDataAsHexString(tokenNumber)
        });

        // return the augmented tokenParams
        return augmentedTokenParams;
    }

    /**
     * @notice Upload token data at a specific chunk index
     * @param tokenNumber The token number (not token ID) - derived from tokenId % 1,000,000
     * @param chunkIndex The chunk index (must be sequential - either append to end or overwrite existing)
     * @param data The bytes to store (deployed as SSTORE2 contract)
     * @dev Can overwrite existing chunks. Old SSTORE2 contract remains deployed but orphaned.
     * @dev Only owner can call this function.
     * @dev Emits TokenDataUploadedAtIndex event.
     */
    function uploadTokenDataAtIndex(
        uint256 tokenNumber,
        uint256 chunkIndex,
        bytes memory data
    ) external onlyOwner {
        // CHECKS
        // only allow appending to the end of the data
        uint256 numChunksBefore = numChunksOfToken[tokenNumber];
        require(
            chunkIndex <= numChunksBefore,
            "Must append to end of current array of chunks"
        );

        // EFFECTS
        // update the number of chunks for the token
        if (chunkIndex == numChunksBefore) {
            numChunksOfToken[tokenNumber] = chunkIndex + 1;
        }

        // upload the data to SSTORE2
        address dataPointer = SSTORE2.write(data);
        tokenDataPointers[tokenNumber][chunkIndex] = dataPointer;

        // emit an event
        emit TokenDataUploadedAtIndex({
            tokenNumber: tokenNumber,
            chunkIndex: chunkIndex,
            dataPointer: dataPointer
        });
    }

    /**
     * @notice Clear token data at a specific chunk index
     * @param tokenNumber The token number (not token ID)
     * @param chunkIndex The chunk index to clear (must be an existing chunk)
     * @dev Sets the chunk pointer to address(0). Does not delete the SSTORE2 contract.
     * @dev If clearing the last chunk, numChunksOfToken is updated by searching backwards for the last non-zero chunk.
     * @dev If clearing a middle chunk, numChunksOfToken remains unchanged (gaps are allowed).
     * @dev Only owner can call this function.
     * @dev Emits TokenDataClearedAtIndex event.
     */
    function clearTokenDataAtIndex(
        uint256 tokenNumber,
        uint256 chunkIndex
    ) external onlyOwner {
        // CHECKS
        // only allow clearing existing chunks
        uint256 numChunksBefore = numChunksOfToken[tokenNumber];
        require(chunkIndex < numChunksBefore, "Must clear an existing chunk");

        // EFFECTS
        // clear the data from SSTORE2
        tokenDataPointers[tokenNumber][chunkIndex] = address(0);

        // update the number of chunks for the token if this was the last chunk
        if (chunkIndex == numChunksBefore - 1) {
            // Search backwards from the cleared chunk to find the new last non-zero chunk
            uint256 newNumChunks = 0;
            for (uint256 i = chunkIndex; i > 0; ) {
                unchecked {
                    i--;
                }
                if (tokenDataPointers[tokenNumber][i] != address(0)) {
                    newNumChunks = i + 1;
                    break;
                }
            }
            numChunksOfToken[tokenNumber] = newNumChunks;
        }

        // emit an event
        emit TokenDataClearedAtIndex({
            tokenNumber: tokenNumber,
            chunkIndex: chunkIndex
        });
    }

    /**
     * @notice Get token data at a specific chunk index
     * @param tokenNumber The token number (not token ID)
     * @param chunkIndex The chunk index to retrieve (must be less than numChunksOfToken)
     * @return The bytes stored at the given chunk index (empty bytes if chunk was cleared)
     * @dev Returns empty bytes (0x) if the chunk pointer is address(0) (cleared chunk).
     */
    function getTokenDataAtIndex(
        uint256 tokenNumber,
        uint256 chunkIndex
    ) public view returns (bytes memory) {
        // CHECKS
        // only allow getting existing chunks
        uint256 numChunks = numChunksOfToken[tokenNumber];
        require(chunkIndex < numChunks, "Must get an existing chunk");

        // get the data from SSTORE2
        address dataPointer = tokenDataPointers[tokenNumber][chunkIndex];
        // if a cleared chunk, return an empty bytes array
        if (dataPointer == address(0)) {
            return bytes("");
        }
        // return the data from SSTORE2
        return SSTORE2.read(dataPointer);
    }

    /**
     * @notice Get all token data concatenated from all chunks
     * @param tokenNumber The token number (not token ID)
     * @return All bytes concatenated from all chunks (skips cleared chunks with empty data)
     * @dev Iterates through all chunks up to numChunksOfToken and concatenates non-empty chunks.
     * @dev Gas consumption scales with number of chunks and total data size.
     */
    function getAllTokenData(
        uint256 tokenNumber
    ) public view returns (bytes memory) {
        // get the number of chunks for the token
        uint256 numChunks = numChunksOfToken[tokenNumber];
        // iterate over all chunks and get the data from SSTORE2
        bytes memory allData;
        for (uint256 i = 0; i < numChunks; i++) {
            bytes memory chunkData = getTokenDataAtIndex(tokenNumber, i);
            if (chunkData.length > 0) {
                allData = bytes.concat(allData, chunkData);
            }
        }
        return allData;
    }

    /**
     * @notice Get all token data as a hex-encoded string with "0x" prefix
     * @param tokenNumber The token number (not token ID)
     * @return Hex string representation of all concatenated token data (e.g., "0x414243" for "ABC")
     * @dev Returns "0x" if token has no data.
     * @dev Uses Solady's efficient hex encoding implementation.
     */
    function getAllTokenDataAsHexString(
        uint256 tokenNumber
    ) public view returns (string memory) {
        bytes memory data = getAllTokenData(tokenNumber);
        return toHexString(data);
    }

    // --- HELPER FUNCTIONS FROM SOLADY https://github.com/Vectorized/solady/blob/main/src/utils/LibString.sol ---

    /// @dev Returns the hex encoded string from the raw bytes.
    /// The output is encoded using 2 hexadecimal digits per byte.
    function toHexString(
        bytes memory raw
    ) internal pure returns (string memory result) {
        result = toHexStringNoPrefix(raw);
        /// @solidity memory-safe-assembly
        assembly {
            let n := add(mload(result), 2) // Compute the length.
            mstore(result, 0x3078) // Store the "0x" prefix.
            result := sub(result, 2) // Move the pointer.
            mstore(result, n) // Store the length.
        }
    }

    /// @dev Returns the hex encoded string from the raw bytes.
    /// The output is encoded using 2 hexadecimal digits per byte.
    function toHexStringNoPrefix(
        bytes memory raw
    ) internal pure returns (string memory result) {
        /// @solidity memory-safe-assembly
        assembly {
            let n := mload(raw)
            result := add(mload(0x40), 2) // Skip 2 bytes for the optional prefix.
            mstore(result, add(n, n)) // Store the length of the output.

            mstore(0x0f, 0x30313233343536373839616263646566) // Store the "0123456789abcdef" lookup.
            let o := add(result, 0x20)
            let end := add(raw, n)
            for {

            } iszero(eq(raw, end)) {

            } {
                raw := add(raw, 1)
                mstore8(add(o, 1), mload(and(mload(raw), 15)))
                mstore8(o, mload(and(shr(4, mload(raw)), 15)))
                o := add(o, 2)
            }
            mstore(o, 0) // Zeroize the slot after the string.
            mstore(0x40, add(o, 0x20)) // Allocate memory.
        }
    }
}
