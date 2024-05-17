import { Hex, parseUnits, zeroAddress } from "viem";
import { TransformProjectMinterConfigurationFormValuesArgs } from "../types";

export async function processEthToWei(
  value: unknown,
  args: TransformProjectMinterConfigurationFormValuesArgs
): Promise<bigint> {
  const { minterConfiguration, clientContext } = args;

  const { publicClient } = clientContext;

  if (
    typeof value !== "string" &&
    typeof value !== "number" &&
    typeof value !== "bigint"
  ) {
    throw new Error(
      "Value must be a string, number, or bigint to convert to wei"
    );
  }

  const valueString = value.toString();

  if (minterConfiguration.currency_address !== zeroAddress) {
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

      return parseUnits(valueString, decimals);
    } catch (e) {
      console.warn("Failed to fetch currency decimals, falling back to 18", e);
    }
  }

  return parseUnits(valueString, 18);
}
