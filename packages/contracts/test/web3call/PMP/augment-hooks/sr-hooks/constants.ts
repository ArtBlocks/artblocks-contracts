// expected revert messages for SRHooks
export const srHooksRevertMessages = {
  invalidTokenNumber: "Invalid token number",
  onlyOwnerOrDelegate:
    "Only owner or valid delegate.xyz V2 of token owner allowed",
  atLeastOneUpdate: "At least one update must be provided",
  invalidActiveSlot: "Invalid active slot",
  newActiveSlotMustHaveImage:
    "New active slot must have image metadata when updating active slot",
  imageDataRequired: "Image data must be provided when updating",
  imageDataTooLarge:
    "Image data must be less than or equal to MAX_IMAGE_DATA_LENGTH",
  imageDataMustBeEmpty: "Image data must be empty when not updating",
  soundDataTooLarge:
    "Sound data must be less than or equal to MAX_SOUND_DATA_LENGTH",
  soundDataMustBeEmpty: "Sound data must be empty when not updating",
  tokenMustHaveImageAtActiveSlot:
    "Token must have image metadata at active slot when particpating",
  tokensSendingToMustBeNonEmpty: "tokensSendingTo must be non-empty",
  tokensSendingToMustBeEmpty: "tokensSendingTo must be empty",
  tokensSendingToTooLong:
    "tokensSendingTo must be less than or equal to MAX_SENDING_TO_LENGTH",
  tokensReceivingFromMustBeNonEmpty: "tokensReceivingFrom must be non-empty",
  tokensReceivingFromMustBeEmpty: "tokensReceivingFrom must be empty",
  tokensReceivingFromTooLong:
    "tokensReceivingFrom must be less than or equal to MAX_RECEIVING_FROM_ARRAY_LENGTH",
  blockNumberInFuture: "Block number in future - need block hash to be defined",
  blockHashNotAvailable:
    "block hash not available - must be in lastest 256 blocks",
  invalidSlot: "Invalid slot",
};

// Constants from SRHooks contract
export const SR_CONSTANTS = {
  MAX_IMAGE_DATA_LENGTH: 1024 * 15, // 15 KB
  MAX_SOUND_DATA_LENGTH: 1024 * 10, // 10 KB
  MAX_SENDING_TO_LENGTH: 25,
  MAX_RECEIVING_FROM_ARRAY_LENGTH: 1_000,
  NUM_METADATA_SLOTS: 5,
  MAX_RECEIVE_RATE_PER_BLOCK: 3 * 12, // 36
};

// SendStates enum values from SRHooks contract
export const SEND_STATES = {
  NEUTRAL: 0,
  SEND_GENERAL: 1,
  SEND_TO: 2,
} as const;

// ReceiveStates enum values from SRHooks contract
export const RECEIVE_STATES = {
  NEUTRAL: 0,
  RECEIVE_GENERAL: 1,
  RECEIVE_FROM: 2,
} as const;
