import { ethers } from "hardhat";
import { SRHooks } from "../../../../../scripts/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

/**
 * Test helper utilities for SRHooks tests
 * Reduces boilerplate and improves test readability
 */

// ============================================================================
// Data Helpers
// ============================================================================

/**
 * Shorthand for ethers.utils.toUtf8Bytes
 */
export function bytes(str: string): Uint8Array {
  return ethers.utils.toUtf8Bytes(str);
}

/**
 * Returns empty bytes array (commonly used)
 */
export function emptyBytes(): Uint8Array {
  return bytes("");
}

/**
 * Calculate full token ID from project ID and token number
 */
export function tokenId(projectId: number, tokenNumber: number): number {
  return projectId * 1000000 + tokenNumber;
}

// ============================================================================
// Metadata Object Builders
// ============================================================================

export interface MetadataUpdate {
  updateImage: boolean;
  imageDataCompressed: Uint8Array;
  updateSound: boolean;
  soundDataCompressed: Uint8Array;
}

/**
 * Create metadata object with only image update
 */
export function imageOnly(imageData: string | Uint8Array): MetadataUpdate {
  return {
    updateImage: true,
    imageDataCompressed: typeof imageData === "string" ? bytes(imageData) : imageData,
    updateSound: false,
    soundDataCompressed: emptyBytes(),
  };
}

/**
 * Create metadata object with only sound update
 */
export function soundOnly(soundData: string | Uint8Array): MetadataUpdate {
  return {
    updateImage: false,
    imageDataCompressed: emptyBytes(),
    updateSound: true,
    soundDataCompressed: typeof soundData === "string" ? bytes(soundData) : soundData,
  };
}

/**
 * Create metadata object with both image and sound updates
 */
export function imageAndSound(
  imageData: string | Uint8Array,
  soundData: string | Uint8Array
): MetadataUpdate {
  return {
    updateImage: true,
    imageDataCompressed: typeof imageData === "string" ? bytes(imageData) : imageData,
    updateSound: true,
    soundDataCompressed: typeof soundData === "string" ? bytes(soundData) : soundData,
  };
}

/**
 * Create metadata object with no updates
 */
export function noMetadata(): MetadataUpdate {
  return {
    updateImage: false,
    imageDataCompressed: emptyBytes(),
    updateSound: false,
    soundDataCompressed: emptyBytes(),
  };
}

// ============================================================================
// updateTokenStateAndMetadata Helpers
// ============================================================================

/**
 * Update only image metadata for a token
 */
export async function updateImage(
  contract: SRHooks,
  tokenNumber: number,
  imageData: string | Uint8Array,
  slot: number,
  owner: SignerWithAddress
) {
  return contract
    .connect(owner)
    .updateTokenStateAndMetadata(
      tokenNumber,
      false, // updateSendState
      0, // newSendState
      [], // tokensSendingTo
      false, // updateReceiveState
      0, // newReceiveState
      [], // tokensReceivingFrom
      true, // updateActiveSlot
      slot,
      imageOnly(imageData)
    );
}

/**
 * Update only sound metadata for a token
 */
export async function updateSound(
  contract: SRHooks,
  tokenNumber: number,
  soundData: string | Uint8Array,
  slot: number,
  owner: SignerWithAddress
) {
  return contract
    .connect(owner)
    .updateTokenStateAndMetadata(
      tokenNumber,
      false, // updateSendState
      0, // newSendState
      [], // tokensSendingTo
      false, // updateReceiveState
      0, // newReceiveState
      [], // tokensReceivingFrom
      true, // updateActiveSlot
      slot,
      soundOnly(soundData)
    );
}

/**
 * Update both image and sound metadata for a token
 */
export async function updateImageAndSound(
  contract: SRHooks,
  tokenNumber: number,
  imageData: string | Uint8Array,
  soundData: string | Uint8Array,
  slot: number,
  owner: SignerWithAddress
) {
  return contract
    .connect(owner)
    .updateTokenStateAndMetadata(
      tokenNumber,
      false, // updateSendState
      0, // newSendState
      [], // tokensSendingTo
      false, // updateReceiveState
      0, // newReceiveState
      [], // tokensReceivingFrom
      true, // updateActiveSlot
      slot,
      imageAndSound(imageData, soundData)
    );
}

/**
 * Update only send state for a token
 */
export async function updateSendState(
  contract: SRHooks,
  tokenNumber: number,
  newSendState: number,
  tokensSendingTo: number[],
  owner: SignerWithAddress
) {
  return contract
    .connect(owner)
    .updateTokenStateAndMetadata(
      tokenNumber,
      true, // updateSendState
      newSendState,
      tokensSendingTo,
      false, // updateReceiveState
      0, // newReceiveState
      [], // tokensReceivingFrom
      false, // updateActiveSlot
      0, // activeSlot
      noMetadata()
    );
}

/**
 * Update only receive state for a token
 */
export async function updateReceiveState(
  contract: SRHooks,
  tokenNumber: number,
  newReceiveState: number,
  tokensReceivingFrom: number[],
  owner: SignerWithAddress
) {
  return contract
    .connect(owner)
    .updateTokenStateAndMetadata(
      tokenNumber,
      false, // updateSendState
      0, // newSendState
      [], // tokensSendingTo
      true, // updateReceiveState
      newReceiveState,
      tokensReceivingFrom,
      false, // updateActiveSlot
      0, // activeSlot
      noMetadata()
    );
}

/**
 * Update both send and receive states for a token
 */
export async function updateBothStates(
  contract: SRHooks,
  tokenNumber: number,
  newSendState: number,
  tokensSendingTo: number[],
  newReceiveState: number,
  tokensReceivingFrom: number[],
  owner: SignerWithAddress
) {
  return contract
    .connect(owner)
    .updateTokenStateAndMetadata(
      tokenNumber,
      true, // updateSendState
      newSendState,
      tokensSendingTo,
      true, // updateReceiveState
      newReceiveState,
      tokensReceivingFrom,
      false, // updateActiveSlot
      0, // activeSlot
      noMetadata()
    );
}

/**
 * Update image and send state together
 */
export async function updateImageAndSendState(
  contract: SRHooks,
  tokenNumber: number,
  imageData: string | Uint8Array,
  slot: number,
  newSendState: number,
  tokensSendingTo: number[],
  owner: SignerWithAddress
) {
  return contract
    .connect(owner)
    .updateTokenStateAndMetadata(
      tokenNumber,
      true, // updateSendState
      newSendState,
      tokensSendingTo,
      false, // updateReceiveState
      0, // newReceiveState
      [], // tokensReceivingFrom
      true, // updateActiveSlot
      slot,
      imageOnly(imageData)
    );
}

/**
 * Update image and receive state together
 */
export async function updateImageAndReceiveState(
  contract: SRHooks,
  tokenNumber: number,
  imageData: string | Uint8Array,
  slot: number,
  newReceiveState: number,
  tokensReceivingFrom: number[],
  owner: SignerWithAddress
) {
  return contract
    .connect(owner)
    .updateTokenStateAndMetadata(
      tokenNumber,
      false, // updateSendState
      0, // newSendState
      [], // tokensSendingTo
      true, // updateReceiveState
      newReceiveState,
      tokensReceivingFrom,
      true, // updateActiveSlot
      slot,
      imageOnly(imageData)
    );
}

/**
 * Update image, sound, and both states together
 */
export async function updateImageSoundAndStates(
  contract: SRHooks,
  tokenNumber: number,
  imageData: string | Uint8Array,
  soundData: string | Uint8Array,
  slot: number,
  newSendState: number,
  tokensSendingTo: number[],
  newReceiveState: number,
  tokensReceivingFrom: number[],
  owner: SignerWithAddress
) {
  return contract
    .connect(owner)
    .updateTokenStateAndMetadata(
      tokenNumber,
      true, // updateSendState
      newSendState,
      tokensSendingTo,
      true, // updateReceiveState
      newReceiveState,
      tokensReceivingFrom,
      true, // updateActiveSlot
      slot,
      imageAndSound(imageData, soundData)
    );
}

/**
 * Change only the active slot (no metadata update, no state update)
 */
export async function changeActiveSlot(
  contract: SRHooks,
  tokenNumber: number,
  newSlot: number,
  owner: SignerWithAddress
) {
  return contract
    .connect(owner)
    .updateTokenStateAndMetadata(
      tokenNumber,
      false, // updateSendState
      0, // newSendState
      [], // tokensSendingTo
      false, // updateReceiveState
      0, // newReceiveState
      [], // tokensReceivingFrom
      true, // updateActiveSlot
      newSlot,
      noMetadata()
    );
}

// ============================================================================
// getLiveData Helpers
// ============================================================================

export interface LiveDataResult {
  sendState: number;
  receiveState: number;
  receivedTokensGeneral: any[];
  receivedTokensTo: any[];
  numSendGeneral: number;
  numReceiveGeneral: number;
  numSendingToMe: number;
  usedBlockNumber: any;
}

/**
 * Call getLiveData and return results as a named object instead of array
 * Makes test code more readable
 */
export async function getLiveData(
  contract: SRHooks,
  tokenNumber: number,
  blockNumber: number,
  maxReceive: number
): Promise<LiveDataResult> {
  const [
    sendState,
    receiveState,
    receivedTokensGeneral,
    receivedTokensTo,
    numSendGeneral,
    numReceiveGeneral,
    numSendingToMe,
    usedBlockNumber,
  ] = await contract.getLiveData(tokenNumber, blockNumber, maxReceive);

  return {
    sendState,
    receiveState,
    receivedTokensGeneral,
    receivedTokensTo,
    numSendGeneral,
    numReceiveGeneral,
    numSendingToMe,
    usedBlockNumber,
  };
}

