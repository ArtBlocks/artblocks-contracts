import { PublicClient, WalletClient } from "viem";
import { Abi, AbiFunction, AbiParameter } from "abitype";
import {
  z,
  ZodAny,
  ZodArray,
  ZodBigInt,
  ZodEffects,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodString,
  ZodUnion,
} from "zod";
import { BaseFormFieldSchema, FormFieldSchema } from "./json-schema";

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
  | ZodBigInt
  | ZodString
  | ZodObject<any>
  | ZodArray<any>
  | ZodAny
  | ZodEffects<ZodNumber, number, number>
  | ZodEffects<ZodString, string, string>
  | ZodEffects<
      ZodUnion<[ZodString, ZodNumber]>,
      string | number,
      string | number
    >
  | ZodOptional<SupportedZodSchema>;

export type ZodValidationSchema = ZodObject<{
  [k in string]: ZodOptional<SupportedZodSchema>;
}>;

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

    // Don't validate file inputs
    if ("ui:widget" in prop && prop["ui:widget"] === "file") {
      return z.any();
    }

    // Don't validate read-only inputs
    if (prop.readOnly) {
      return z.any();
    }

    switch (prop.type) {
      case "number":
      case "integer":
        if (prop.type === "integer") {
          // Depending on the input value
          zodProp = z
            .union([z.string(), z.number()])
            .superRefine((val, ctx) => {
              try {
                const transformedVal =
                  typeof val === "string" ? BigInt(val) : val;

                if (prop.minimum && transformedVal < prop.minimum) {
                  ctx.addIssue({
                    code: z.ZodIssueCode.too_small,
                    minimum: prop.minimum,
                    type: "number",
                    inclusive: true,
                    message: "Value is too small",
                  });
                }

                if (prop.maximum && transformedVal > prop.maximum) {
                  ctx.addIssue({
                    code: z.ZodIssueCode.too_big,
                    maximum: prop.maximum,
                    type: "number",
                    inclusive: true,
                    message: "Value is too big",
                  });
                }
              } catch (e) {
                ctx.addIssue({
                  code: z.ZodIssueCode.invalid_type,
                  expected: "number",
                  received: typeof val,
                });
              }
            });
        } else {
          zodProp = z.coerce.number();
          if (prop.minimum) {
            zodProp = zodProp.min(prop.minimum);
          }
          if (prop.maximum) {
            zodProp = zodProp.max(prop.maximum);
          }
          if (prop.multipleOf) {
            zodProp = zodProp.multipleOf(prop.multipleOf);
          }
        }

        break;
      case "string":
        zodProp = z.string();
        if (prop.pattern) {
          zodProp = zodProp.regex(new RegExp(prop.pattern));
        }
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
      case "array": {
        // TODO: Items can also be an array of schemas, not totally sure the use case though
        // maybe for a tuple like structure.
        if (
          prop.items &&
          !Array.isArray(prop.items) &&
          typeof prop.items === "object"
        ) {
          const itemZodSchema = toZod(prop.items, "");
          zodProp = z.array(itemZodSchema);
        } else {
          throw new Error("Unsupported items array");
        }
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

// Taken from https://gist.githubusercontent.com/douglascayers/346e061fb7c1f38da00ee98c214464ae/raw/822a12f17bc9eb51115bd148293d1dd338e08a52/async-poller.ts
/**
 * The function you pass to `asyncPoll` should return a promise
 * that resolves with object that satisfies this interface.
 *
 * The `done` property indicates to the async poller whether to
 * continue polling or not.
 *
 * When done is `true` that means you've got what you need
 * and the poller will resolve with `data`.
 *
 * When done is `false` that means you don't have what you need
 * and the poller will continue polling.
 */

export interface AsyncData<T> {
  done: boolean;
  data?: T;
}

interface AsyncFunction<T> extends Function {
  (): PromiseLike<AsyncData<T>>;
}

export async function asyncPoll<T>(
  /**
   * Function to call periodically until it resolves or rejects.
   *
   * It should resolve as soon as possible indicating if it found
   * what it was looking for or not. If not then it will be reinvoked
   * after the `pollInterval` if we haven't timed out.
   *
   * Rejections will stop the polling and be propagated.
   */
  fn: AsyncFunction<T>,
  /**
   * Milliseconds to wait before attempting to resolve the promise again.
   * The promise won't be called concurrently. This is the wait period
   * after the promise has resolved/rejected before trying again for a
   * successful resolve so long as we haven't timed out.
   *
   * Default 5 seconds.
   */
  pollInterval = 5000,
  /**
   * Max time to keep polling to receive a successful resolved response.
   * If the promise never resolves before the timeout then this method
   * rejects with a timeout error.
   *
   * Default 30 seconds.
   */
  pollTimeout = 30000
): Promise<T> {
  const endTime = new Date().getTime() + pollTimeout;
  const checkCondition = (
    resolve: (value: T | PromiseLike<T>) => void,
    reject: (reason?: Error) => void
  ): void => {
    Promise.resolve(fn())
      .then((result) => {
        const currentTime = new Date().getTime();
        if (result.done) {
          resolve(result.data as T);
        } else if (currentTime < endTime) {
          setTimeout(checkCondition, pollInterval, resolve, reject);
        } else {
          reject(new Error("Timeout reached in async poller"));
        }
      })
      .catch((err) => {
        reject(err);
      });
  };
  return new Promise(checkCondition);
}
