import { BigNumber, constants } from "ethers";
import { AbiCoder } from "ethers/lib/utils";

const abiCoder = new AbiCoder();

export type PMPConfig = {
  authOption: number;
  paramType: number;
  pmpLockedAfterTimestamp: number;
  authAddress: string;
  selectOptions: string[];
  minRange: string;
  maxRange: string;
};

export type PMPInput = {
  key: string;
  configuredParamType: number;
  configuredValue: string;
  configuringArtistString: boolean;
  configuredValueString: string;
};

export type PMPInputConfig = {
  key: string;
  pmpConfig: PMPConfig;
};

// @dev max timestamp value, as defined in the PMP contract
export const PMP_TIMESTAMP_MAX = BigNumber.from(2).pow(64).sub(1);
// @dev max hex color value, as defined in the PMP contract
export const PMP_HEX_COLOR_MAX = BigNumber.from("16777215"); // 0xFFFFFF

/**
 * Formats a token ID with project number for logs or test outputs
 * @param projectNumber The project number
 * @param tokenNumber The token number
 * @returns Formatted string like "1_000_000_0" for project 1, token 0
 */
export function formatTokenId(
  projectNumber: number,
  tokenNumber: number
): string {
  return `${projectNumber}_000_000_${tokenNumber}`;
}

/**
 * Utility to help with non-null assertions in TypeScript
 * @param value The value to assert as non-null
 * @param message Optional error message
 * @returns The value, asserted as non-null
 */
export function assertDefined<T>(
  value: T | undefined | null,
  message?: string
): T {
  if (value === undefined || value === null) {
    throw new Error(
      message || "Expected value to be defined, but got undefined or null"
    );
  }
  return value;
}

/**
 * Converts a hex string to a boolean
 * @param hexValue A hex string representing a boolean (0 or 1)
 * @returns The boolean value
 */
export function hexToBool(hexValue: string): boolean {
  const num = parseInt(hexValue, 16);
  return num !== 0;
}

/**
 * Converts a hex string to a number
 * @param hexValue A hex string
 * @returns The number value
 */
export function hexToNumber(hexValue: string): number {
  return parseInt(hexValue, 16);
}

// converts a BigNumber to bytes32 input for PMPConfig struct
export function BigNumberToBytes32(bigNumber: BigNumber): string {
  return abiCoder.encode(["uint256"], [bigNumber.toString()]);
}

// converts a non-negative number to bytes32 input for PMPConfig struct
export function uint256ToBytes32(uint256Value: number): string {
  if (uint256Value < 0) {
    throw new Error("uint256Value must be non-negative");
  }
  return abiCoder.encode(["uint256"], [uint256Value]);
}

// converts an integer to properly formatted bytes32 input for PMPConfig struct
export function int256ToBytes32(int256Value: number): string {
  // return the abi-encoded int256 value
  return abiCoder.encode(["int256"], [int256Value]);
}

export function getPMPInput(
  key: string,
  configuredParamType: number,
  configuredValue: string,
  configuringArtistString: boolean,
  configuredValueString: string
): PMPInput {
  return {
    key: key,
    configuredParamType: configuredParamType,
    configuredValue: configuredValue,
    configuringArtistString: configuringArtistString,
    configuredValueString: configuredValueString,
  };
}

export function getPMPInputConfig(
  key: string,
  authOption: number,
  paramType: number,
  pmpLockedAfterTimestamp: number,
  authAddress: string,
  selectOptions: string[],
  minRange: string,
  maxRange: string
): PMPInputConfig {
  return {
    key: key,
    pmpConfig: {
      authOption,
      paramType,
      pmpLockedAfterTimestamp,
      authAddress,
      selectOptions,
      minRange,
      maxRange,
    },
  };
}

export function getDefaultPMPInputConfig(key: string): PMPInputConfig {
  return getPMPInputConfig(
    key,
    PMP_AUTH_ENUM.Artist,
    PMP_PARAM_TYPE_ENUM.Bool,
    0,
    constants.AddressZero,
    [],
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000"
  );
}

/**
 * Wrapper function to handle promise rejections in a more readable way
 * @param block The function that may throw
 * @returns The result of the function or undefined if it throws
 */
export async function tryCatch<T>(
  block: () => Promise<T>
): Promise<T | undefined> {
  try {
    return await block();
  } catch (e) {
    return undefined;
  }
}

export const PMP_AUTH_ENUM = {
  Artist: 0,
  TokenOwner: 1,
  Address: 2,
  ArtistAndTokenOwner: 3,
  ArtistAndAddress: 4,
  TokenOwnerAndAddress: 5,
  ArtistAndTokenOwnerAndAddress: 6,
};

export const PMP_PARAM_TYPE_ENUM = {
  Unconfigured: 0,
  Select: 1,
  Bool: 2,
  Uint256Range: 3,
  Int256Range: 4,
  DecimalRange: 5,
  HexColor: 6,
  Timestamp: 7,
  String: 8,
};
