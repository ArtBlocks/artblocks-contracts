import { ProjectMinterConfigurationDetailsFragment } from "../../generated/graphql";
import { BaseFormFieldSchema } from "../../json-schema";
import { formatEther, formatUnits, Hex, PublicClient, zeroAddress } from "viem";

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
export async function processValueForDisplay(args: {
  value: unknown;
  displayProcessing?: BaseFormFieldSchema["displayProcessing"];
  minterConfiguration: ProjectMinterConfigurationDetailsFragment | null;
  publicClient: PublicClient;
}): Promise<any> {
  const { value, displayProcessing, minterConfiguration, publicClient } = args;

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

      if (value === undefined || value === null) {
        return "";
      }

      if (
        minterConfiguration?.currency_address &&
        minterConfiguration.currency_address !== zeroAddress
      ) {
        try {
          const decimals = await publicClient.readContract({
            address: minterConfiguration.currency_address as Hex,
            abi: [
              {
                inputs: [],
                name: "decimals",
                outputs: [
                  {
                    internalType: "uint8",
                    name: "",
                    type: "uint8",
                  },
                ],
                stateMutability: "view",
                type: "function",
              },
            ] as const,
            functionName: "decimals",
          });

          return Number(
            formatUnits(BigInt(value as string | number | bigint), decimals)
          );
        } catch (e) {
          console.warn(
            "Failed to fetch currency decimals, falling back to 18",
            e
          );
        }
      }

      return Number(formatEther(BigInt(value as string | number | bigint)));
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
