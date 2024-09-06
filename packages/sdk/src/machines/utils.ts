import { Minter_Type_Names_Enum } from "../generated/graphql";
import {
  BaseError,
  Hex,
  TransactionExecutionError,
  UserRejectedRequestError,
} from "viem";

/**
 * List of supported minter types for the purchase machine. This is expected
 * to grow over time.
 */
export const SUPPORTED_MINTER_TYPES = [
  Minter_Type_Names_Enum.MinterSetPriceV5,
  Minter_Type_Names_Enum.MinterDaExpV5,
  Minter_Type_Names_Enum.MinterDaLinV5,
  Minter_Type_Names_Enum.MinterSetPriceMerkleV5,
  Minter_Type_Names_Enum.MinterDaLinHolderV5,
  Minter_Type_Names_Enum.MinterDaExpHolderV5,
  Minter_Type_Names_Enum.MinterSetPriceHolderV5,
  Minter_Type_Names_Enum.MinterDaExpSettlementV3,
  Minter_Type_Names_Enum.MinterRamv0,
  Minter_Type_Names_Enum.MinterSetPriceErc20V5,
  Minter_Type_Names_Enum.MinterMinPriceV0,
  Minter_Type_Names_Enum.MinterMinPriceMerkleV0,
];

export const SUPPORTED_SETTLEMENT_CLAIM_MINTER_TYPES = [
  Minter_Type_Names_Enum.MinterDaExpSettlementV0,
  Minter_Type_Names_Enum.MinterDaExpSettlementV1,
  Minter_Type_Names_Enum.MinterDaExpSettlementV2,
  Minter_Type_Names_Enum.MinterDaExpSettlementV3,
];

const MERKLE_MINTER_TYPES = [
  Minter_Type_Names_Enum.MinterSetPriceMerkleV5,
  Minter_Type_Names_Enum.MinterMinPriceMerkleV0,
];
const HOLDER_MINTER_TYPES = [
  Minter_Type_Names_Enum.MinterDaLinHolderV5,
  Minter_Type_Names_Enum.MinterDaExpHolderV5,
  Minter_Type_Names_Enum.MinterSetPriceHolderV5,
];

const ERC20_MINTER_TYPES = [Minter_Type_Names_Enum.MinterSetPriceErc20V5];

/**
 * Checks if a minter type is supported by the purchase machine.
 *
 * @param minterType - The minter type to check.
 * @returns A boolean indicating whether the minter type is supported.
 */
export function isSupportedMinterType(
  minterType: Minter_Type_Names_Enum | undefined
) {
  return (
    SUPPORTED_MINTER_TYPES as Array<Minter_Type_Names_Enum | undefined>
  ).includes(minterType);
}

/**
 * Checks if a minter type is a Merkle minter.
 *
 * @param minterType - The minter type to check.
 * @returns A boolean indicating whether the minter type is a Merkle minter.
 */
export function isMerkleMinterType(
  minterType: Minter_Type_Names_Enum | undefined
) {
  return (
    MERKLE_MINTER_TYPES as Array<Minter_Type_Names_Enum | undefined>
  ).includes(minterType);
}

/**
 * Checks if a minter type is a Holder minter.
 *
 * @param minterType - The minter type to check.
 * @returns A boolean indicating whether the minter type is a Holder minter.
 */
export function isHolderMinterType(
  minterType: Minter_Type_Names_Enum | undefined
) {
  return (
    HOLDER_MINTER_TYPES as Array<Minter_Type_Names_Enum | undefined>
  ).includes(minterType);
}

/**
 * Checks if a minter type is an ERC20 minter.
 *
 * @param minterType - The minter type to check.
 * @returns A boolean indicating whether the minter type is an ERC20 minter.
 */
export function isERC20MinterType(
  minterType: Minter_Type_Names_Enum | undefined
) {
  return (
    ERC20_MINTER_TYPES as Array<Minter_Type_Names_Enum | undefined>
  ).includes(minterType);
}

/**
 * Checks if an error is a user-rejected transaction error.
 *
 * This function is specifically designed to work with errors thrown by the Viem library,
 * particularly during transaction execution. It inspects the error to determine if it
 * originates from a user rejecting a transaction request.
 *
 * @param error - The error object to be checked, of unknown type.
 * @returns A boolean indicating whether the error is due to a user-rejected transaction.
 */
export function isUserRejectedError(error: unknown) {
  if (error instanceof TransactionExecutionError) {
    return Boolean(
      error.cause.walk((e) => e instanceof UserRejectedRequestError)
    );
  }

  if (
    error instanceof Error &&
    error.message.includes("User denied transaction")
  ) {
    return true;
  }

  return false;
}

/**
 * Extracts a user-friendly message from an error object.
 *
 * This function is tailored to handle errors from the Viem library by prioritizing
 * the `shortMessage` property for a concise description. It also supports standard
 * JavaScript `Error` objects by returning the `message` property. If the error does
 * not match known types or is undefined, a fallback message is returned, which can
 * be customized by the caller.
 *
 * @param error - The error object to extract the message from, of unknown type.
 * @param fallbackMessage - An optional custom message to return if the error does not contain a readable message.
 * @returns A string containing the error message or a fallback message if the error is unrecognized.
 */
export function getMessageFromError(error: unknown, fallbackMessage?: string) {
  // For viem errors, use the short message
  if (error instanceof BaseError) {
    return error.shortMessage;
  }

  if (
    typeof error === "object" &&
    error &&
    "shortMessage" in error &&
    typeof error.shortMessage === "string"
  ) {
    return error.shortMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage ?? "Unknown error";
}

export function getCoreContractAddressAndProjectIndexFromProjectId(
  projectId: string
) {
  const [coreContractAddress, projectIndex] = projectId.split("-");

  if (!coreContractAddress || !projectIndex) {
    throw new Error("Invalid project ID");
  }

  return {
    coreContractAddress: coreContractAddress as Hex,
    projectIndex: BigInt(projectIndex),
  };
}

// Re-export xstate utility types and createEmptyActor function for use in consuming apps
export {
  type ActorRef,
  type ActorRefFrom,
  type SnapshotFrom,
  createEmptyActor,
} from "xstate";
