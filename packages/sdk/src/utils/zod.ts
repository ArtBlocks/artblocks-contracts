import {
  z,
  ZodAny,
  ZodArray,
  ZodBigInt,
  ZodDate,
  ZodEffects,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodString,
  ZodUnion,
} from "zod";
import { BaseFormFieldSchema, FormFieldSchema } from "../json-schema";

export type SupportedZodSchema =
  | ZodNumber
  | ZodBigInt
  | ZodString
  | ZodObject<any>
  | ZodArray<any>
  | ZodDate
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

                if (prop.minimum != null && transformedVal < prop.minimum) {
                  ctx.addIssue({
                    code: z.ZodIssueCode.too_small,
                    minimum: prop.minimum,
                    type: "number",
                    inclusive: true,
                    message: "Value is too small",
                  });
                }

                if (prop.maximum != null && transformedVal > prop.maximum) {
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
          if (prop.minimum != null) {
            zodProp = zodProp.min(prop.minimum);
          }
          if (prop.maximum != null) {
            zodProp = zodProp.max(prop.maximum);
          }
          if (prop.multipleOf) {
            zodProp = zodProp.multipleOf(prop.multipleOf);
          }
        }

        break;
      case "string":
        if (prop.format === "date-time") {
          zodProp = z.coerce.date();
          break;
        }

        zodProp = z.string();
        if (prop.pattern) {
          zodProp = zodProp.regex(new RegExp(prop.pattern), "Invalid format");
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
