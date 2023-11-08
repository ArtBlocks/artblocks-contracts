import { BaseFormFieldSchema } from "../../json-schema";
import { formatEther } from "viem";

/**
 * This function processes a value for display based on the provided displayProcessing type.
 * It currently supports two types of transformations: 'weiToEth' and 'unixTimestampToDatetime'.
 *
 * @param value - The value to be processed for display.
 * @param displayProcessing - The type of processing to be applied. It can be 'weiToEth' or 'unixTimestampToDatetime'.
 *
 * @returns The processed value ready for display.
 *
 * @throws Will throw an error if the value type is not compatible with the transformation type.
 */
export function processValueForDisplay(
  value: unknown,
  displayProcessing?: BaseFormFieldSchema["displayProcessing"]
): any {
  const valueType = typeof value;
  switch (displayProcessing) {
    case "weiToEth": {
      if (
        value &&
        valueType !== "string" &&
        valueType !== "number" &&
        valueType !== "bigint"
      ) {
        throw new Error(
          `Unexpected value type for weiToEth transformation. Expected string, number, or bigint, received ${valueType}`
        );
      }

      return Number(
        formatEther(BigInt((value as string | number | bigint) ?? 0))
      );
    }
    case "unixTimestampToDatetime": {
      if (value && valueType !== "number" && valueType !== "string") {
        throw new Error(
          `Unexpected value type for unixTimestampToDatetime transformation. Expected string or number, received ${valueType}`
        );
      }
      return value
        ? new Date(Number(value) * 1000).toISOString()
        : new Date().toISOString();
    }
    default:
      return value;
  }
}
