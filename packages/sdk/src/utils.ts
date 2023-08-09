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
import { BaseFormFieldSchema, FormFieldSchema } from "./json-schema";
import set from "lodash/set";
import get from "lodash/get";
import mapValues from "lodash/mapValues";

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
  | ZodObject<any>
  | ZodEffects<ZodNumber, number, number>
  | ZodEffects<ZodString, string, string>
  | ZodOptional<SupportedZodSchema>;

export type ZodValidationSchema = ZodObject<{
  [k in string]: ZodOptional<SupportedZodSchema>;
}>;

// export function formFieldSchemaToZod(
//   formFieldSchema: FormFieldSchema
// ): ZodValidationSchema {
//   const zodSchema: Record<string, SupportedZodSchema> = {};
//   const altZodSchema: Record<string, SupportedZodSchema> = {};

//   for (const key in formFieldSchema.properties) {
//     const prop = formFieldSchema.properties[key];
//     let zodProp: SupportedZodSchema;
//     switch (prop.type) {
//       case "integer":
//         zodProp = z.number().int();
//         if (prop.minimum !== undefined) {
//           zodProp = zodProp.min(prop.minimum);
//         }
//         if (prop.maximum !== undefined) {
//           zodProp = zodProp.max(prop.maximum);
//         }
//         break;
//       case "string":
//         zodProp = z.string();
//         break;
//       default:
//         throw new Error(`Unsupported type: ${prop.type}`);
//     }

//     if (formFieldSchema.required?.includes(key)) {
//       if (zodProp instanceof z.ZodNumber) {
//         zodProp = zodProp.refine((val) => val !== undefined);
//       } else if (zodProp instanceof z.ZodString) {
//         zodProp = zodProp.refine((val) => val !== undefined);
//       }
//     }
//     zodSchema[key] = zodProp;
//     set(altZodSchema, key, zodProp);
//   }

//   const schema = z.object(zodSchema).partial();
//   console.log(zodSchema);

//   return schema;
// }

// export function formFieldSchemaToZod(
//   formFieldSchema: FormFieldSchema
// ): z.ZodObject<any> {
//   function nestProperties(properties: Record<string, BaseFormFieldSchema>) {
//     const nested: Record<string, any> = {};
//     for (const [key, value] of Object.entries(properties)) {
//       set(nested, key, value);
//     }
//     return nested;
//   }

//   function toZod(prop: any): SupportedZodSchema {
//     switch (prop.type) {
//       case "integer": {
//         console.log("COERCE");
//         let zodProp = z.coerce.number().int();
//         if (prop.minimum !== undefined) {
//           zodProp = zodProp.min(prop.minimum);
//         }
//         if (prop.maximum !== undefined) {
//           zodProp = zodProp.max(prop.maximum);
//         }
//         return zodProp;
//       }
//       case "string":
//         return z.string();
//       case "object": {
//         const objectProps: Record<string, SupportedZodSchema> = {};
//         for (const key in prop.properties) {
//           objectProps[key] = toZod(prop.properties[key]);
//         }
//         return z.object(objectProps);
//       }
//       default:
//         throw new Error(`Unsupported type: ${prop.type}`);
//     }
//   }

//   const nestedProperties = nestProperties(formFieldSchema.properties ?? {});

//   const zodSchema: Record<string, SupportedZodSchema> = {};
//   for (const key in formFieldSchema.properties) {
//     zodSchema[key] = toZod(formFieldSchema.properties[key]);
//     if (formFieldSchema.required?.includes(key)) {
//       zodSchema[key] = zodSchema[key].optional();
//     }
//   }

//   return z.object(zodSchema);
// }

function nestDotNotationProperties(
  schema: FormFieldSchema
): BaseFormFieldSchema {
  const result: BaseFormFieldSchema = { properties: {} };

  // Iterate through each property in the schema
  for (const [key, prop] of Object.entries(schema.properties ?? {})) {
    // Split the key by dot notation into an array of keys
    const keys = key.split(".");

    // Initialize a pointer to navigate through the nested properties.
    // For example, if key is "extraMinterDetails.auctionTimestampStart", then
    // the pointer will navigate through "extraMinterDetails" to reach "auctionTimestampStart".
    let currentPropertyPointer =
      typeof result.properties === "object" ? result.properties : {};

    keys.forEach((k, idx) => {
      // If this is the last key in the array, set the property value
      if (idx === keys.length - 1) {
        currentPropertyPointer[k] = prop;
      } else {
        // If the property does not exist, initialize it as an object with nested properties
        currentPropertyPointer[k] =
          typeof currentPropertyPointer[k] === "object"
            ? currentPropertyPointer[k]
            : {
                type: "object",
                properties: {},
              };

        const newPropertyPointer = currentPropertyPointer[k];

        // Move the pointer to the next nested object
        currentPropertyPointer =
          typeof newPropertyPointer === "object"
            ? newPropertyPointer.properties ?? {}
            : {};
      }
    });
  }

  // Copy the required properties from the original schema
  result.required = schema.required;

  return result;
}

export function formFieldSchemaToZod(
  formFieldSchema: FormFieldSchema
): ZodValidationSchema {
  const transformedSchema = nestDotNotationProperties(formFieldSchema);

  function toZod(
    prop: BaseFormFieldSchema,
    fullKey: string
  ): SupportedZodSchema {
    let zodProp: SupportedZodSchema;
    switch (prop.type) {
      case "integer":
        zodProp = z.coerce.number().int();
        break;
      case "string":
        zodProp = z.string();
        break;
      case "object": {
        const objectProps: Record<string, SupportedZodSchema> = {};
        if (prop.properties && typeof prop.properties === "object") {
          for (const [key, nestedProp] of Object.entries(prop.properties)) {
            if (typeof nestedProp === "object") {
              const nestedFullKey = fullKey ? `${fullKey}.${key}` : key;
              objectProps[key] = toZod(nestedProp, nestedFullKey);
            }
          }
        }
        zodProp = z.object(objectProps);
        break;
      }
      default:
        throw new Error(`Unsupported type: ${prop.type}`);
    }

    if (formFieldSchema.required?.includes(fullKey)) {
      if (zodProp instanceof z.ZodNumber) {
        zodProp = zodProp.refine((val) => val !== undefined);
      } else if (zodProp instanceof z.ZodString) {
        zodProp = zodProp.refine((val) => val !== undefined);
      }
    }

    return zodProp;
  }

  // Usage in formFieldSchemaToZod
  const zodSchema: Record<string, SupportedZodSchema> = {};
  for (const [key, prop] of Object.entries(
    transformedSchema.properties ?? {}
  )) {
    if (prop && typeof prop === "object") {
      zodSchema[key] = toZod(prop, key);
    }
  }

  return z.object(zodSchema).partial();
}
