import { PublicClient, WalletClient } from "viem";
import { Abi, AbiFunction, AbiParameter } from "abitype";
import {
  z,
  ZodEffects,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodString,
} from "zod";
import { FormFieldSchema } from "./json-schema";

export type Hex = `0x${string}`;

interface Args {
  walletClient: WalletClient;
  publicClient: PublicClient;
  contractAddress: Hex;
  contractFunctionABI: Omit<AbiFunction, "gas">;
  args: Record<string, unknown>;
}

export async function executeTransaction({
  walletClient,
  contractAddress,
  contractFunctionABI,
  args,
}: Args): Promise<Hex> {
  const argList = contractFunctionABI.inputs.map(
    (input: AbiParameter) => args[input.name || ""]
  );

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: [contractFunctionABI] as Abi,
    functionName: contractFunctionABI.name,
    account:
      walletClient.account ?? "0x0000000000000000000000000000000000000000",
    chain: walletClient.chain,
  });

  return hash;
}

export async function waitForConfirmations(
  publicClient: PublicClient,
  txHash: Hex,
  confirmations: number
): Promise<string> {
  // This is a PublicClient from Viem
  let currentConfirmations = BigInt(0);
  while (currentConfirmations < confirmations) {
    currentConfirmations = await publicClient.getTransactionConfirmations({
      hash: txHash,
    });
    if (currentConfirmations < confirmations) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // wait for 5 seconds before checking again
    }
  }
  return txHash;
}

export type SupportedZodSchema =
  | ZodNumber
  | ZodString
  | ZodEffects<ZodNumber, number, number>
  | ZodEffects<ZodString, string, string>;

export type ZodValidationSchema = ZodObject<{
  [k in string]: ZodOptional<SupportedZodSchema>;
}>;

export function formFieldSchemaToZod(
  formFieldSchema: FormFieldSchema
): ZodValidationSchema {
  const zodSchema: Record<string, SupportedZodSchema> = {};

  for (const key in formFieldSchema.properties) {
    const prop = formFieldSchema.properties[key];
    let zodProp: SupportedZodSchema;
    switch (prop.type) {
      case "integer":
        zodProp = z.number().int();
        if (prop.minimum !== undefined) {
          zodProp = zodProp.min(prop.minimum);
        }
        if (prop.maximum !== undefined) {
          zodProp = zodProp.max(prop.maximum);
        }
        break;
      case "string":
        zodProp = z.string();
        break;
      default:
        throw new Error(`Unsupported type: ${prop.type}`);
    }

    if (formFieldSchema.required?.includes(key)) {
      if (zodProp instanceof z.ZodNumber) {
        zodProp = zodProp.refine((val) => val !== undefined);
      } else if (zodProp instanceof z.ZodString) {
        zodProp = zodProp.refine((val) => val !== undefined);
      }
    }
    zodSchema[key] = zodProp;
  }

  const schema = z.object(zodSchema).partial();

  return schema;
}
