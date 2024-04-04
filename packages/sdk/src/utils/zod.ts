import { z, ZodType } from "zod";
import {
  BaseFormFieldSchema,
  FormFieldSchema,
  ValidationConditionEnum,
} from "../json-schema";
import get from "lodash/get";

export function formFieldSchemaToZod(
  formFieldSchema: BaseFormFieldSchema
): ZodType<any, any, any> {
  // While our schema may specify properties with dot notation, we
  // expect the values to be submitted as nested objects. As such,
  // we need to create a nested Zod schema to match the structure
  // of the form data.
  function createNestedZodSchema(
    properties: Record<string, BaseFormFieldSchema>,
    parentSchema: BaseFormFieldSchema
  ): ZodType<any, any, any> {
    const zodSchema: Record<string, ZodType<any, any, any>> = {};

    for (const [key, prop] of Object.entries(properties)) {
      if (prop && typeof prop === "object") {
        const nestedKeys = key.split(".");
        let currentSchema = zodSchema;

        for (let i = 0; i < nestedKeys.length; i++) {
          const currentKey = nestedKeys[i];
          const isLastKey = i === nestedKeys.length - 1;

          if (isLastKey) {
            currentSchema[currentKey] = toZod(prop, key, parentSchema);
          } else {
            if (!currentSchema[currentKey]) {
              currentSchema[currentKey] = z.object({});
            }
            currentSchema = (currentSchema[currentKey] as z.ZodObject<any>)
              .shape;
          }
        }
      }
    }

    return z.object(zodSchema);
  }

  function toZod(
    prop: BaseFormFieldSchema,
    fullKey: string,
    parentSchema: BaseFormFieldSchema
  ): ZodType<any, any, any> {
    let zodProp: ZodType<any, any, any>;

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
      case "integer": {
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
          let zodNumberProp = z.number({
            required_error: `${prop.title} is required`,
          });
          if (prop.minimum != null) {
            zodNumberProp = zodNumberProp.min(prop.minimum);
          }
          if (prop.maximum != null) {
            zodNumberProp = zodNumberProp.max(prop.maximum);
          }
          if (prop.multipleOf) {
            zodNumberProp = zodNumberProp.multipleOf(prop.multipleOf);
          }

          zodProp = z.preprocess((val) => {
            if (val === "") {
              return undefined;
            }

            if (typeof val === "string") {
              return Number(val);
            }

            return val;
          }, zodNumberProp);
        }

        break;
      }
      case "string": {
        if (prop.format === "date-time") {
          zodProp = z.preprocess((val) => {
            if (typeof val === "string") {
              return new Date(val);
            }

            return val;
          }, z.date());
          break;
        }

        let zodStringProp = z.string();
        if (prop.pattern) {
          zodStringProp = zodStringProp.regex(
            new RegExp(prop.pattern),
            "Invalid format"
          );
        }
        zodProp = zodStringProp;
        break;
      }
      case "boolean": {
        zodProp = z.boolean();
        break;
      }
      case "object": {
        zodProp = createNestedZodSchema(prop.properties || {}, prop);
        if (prop.validationDependencies) {
          zodProp = zodProp.superRefine((data, ctx) => {
            validateDependencies(
              data,
              ctx,
              prop.validationDependencies,
              prop.properties
            );
          });
        }

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
          const itemZodSchema = toZod(prop.items, "", prop);
          zodProp = z.array(itemZodSchema);
        } else {
          throw new Error("Unsupported items array");
        }
        break;
      }
      default:
        throw new Error(`Unsupported type: ${prop.type}`);
    }

    if (parentSchema.required && !parentSchema.required.includes(fullKey)) {
      zodProp = zodProp.optional();
    }

    return zodProp;
  }

  const zodSchema = createNestedZodSchema(
    formFieldSchema.properties || {},
    formFieldSchema
  );

  let result: ZodType<any, any, any> = zodSchema;
  if (formFieldSchema.validationDependencies) {
    result = result.superRefine((data, ctx) => {
      validateDependencies(
        data,
        ctx,
        formFieldSchema.validationDependencies,
        formFieldSchema.properties
      );
    });
  }

  return result;
}

function validateDependencies(
  data: Record<string, unknown>,
  ctx: z.RefinementCtx,
  validationDependencies: FormFieldSchema["validationDependencies"],
  properties: FormFieldSchema["properties"]
): void {
  if (!validationDependencies || !properties) {
    return;
  }

  for (const validationDependency of validationDependencies) {
    const targetFieldSchema = get(properties, validationDependency.targetField);
    const referenceFieldSchema = get(
      properties,
      validationDependency.referenceField
    );

    const targetFieldValue = get(data, validationDependency.targetField);
    const targetFieldTitle = targetFieldSchema?.title;
    const referenceFieldValue = get(data, validationDependency.referenceField);
    const referenceFieldTitle = referenceFieldSchema?.title;

    if (targetFieldValue == null && referenceFieldValue == null) {
      continue;
    }

    let parsedTargetValue: Date | bigint | number | undefined;
    let parsedReferenceValue: Date | bigint | number | undefined;

    if (
      targetFieldSchema?.type === "string" &&
      targetFieldSchema.format === "date-time"
    ) {
      if (typeof targetFieldValue === "string") {
        parsedTargetValue = new Date(targetFieldValue);
      } else if (
        targetFieldValue instanceof Date &&
        !isNaN(targetFieldValue.getTime())
      ) {
        parsedTargetValue = targetFieldValue;
      }
    } else if (targetFieldSchema?.type === "integer") {
      if (
        typeof targetFieldValue === "string" ||
        typeof targetFieldValue === "number"
      ) {
        parsedTargetValue = BigInt(targetFieldValue);
      } else if (typeof targetFieldValue === "bigint") {
        parsedTargetValue = targetFieldValue;
      }
    } else if (targetFieldSchema?.type === "number") {
      if (typeof targetFieldValue === "number") {
        parsedTargetValue = targetFieldValue;
      }
    }

    if (
      referenceFieldSchema?.type === "string" &&
      referenceFieldSchema.format === "date-time"
    ) {
      if (typeof referenceFieldValue === "string") {
        parsedReferenceValue = new Date(referenceFieldValue);
      } else if (
        referenceFieldValue instanceof Date &&
        !isNaN(referenceFieldValue.getTime())
      ) {
        parsedReferenceValue = referenceFieldValue;
      }
    } else if (referenceFieldSchema?.type === "integer") {
      if (
        typeof referenceFieldValue === "string" ||
        typeof referenceFieldValue === "number"
      ) {
        parsedReferenceValue = BigInt(referenceFieldValue);
      } else if (typeof referenceFieldValue === "bigint") {
        parsedReferenceValue = referenceFieldValue;
      }
    } else if (referenceFieldSchema?.type === "number") {
      if (typeof referenceFieldValue === "number") {
        parsedReferenceValue = referenceFieldValue;
      }
    }

    if (parsedTargetValue && parsedReferenceValue) {
      switch (validationDependency.condition) {
        case ValidationConditionEnum.GREATER_THAN:
          if (!(parsedTargetValue > parsedReferenceValue)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `${targetFieldTitle} must be greater than ${referenceFieldTitle}`,
              path: validationDependency.targetField.split("."),
            });
          }
          break;
        case ValidationConditionEnum.LESS_THAN:
          if (!(parsedTargetValue < parsedReferenceValue)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `${targetFieldTitle} must be less than ${referenceFieldTitle}`,
            });
          }
          break;
        case ValidationConditionEnum.GREATER_THAN_OR_EQUAL:
          if (!(parsedTargetValue >= parsedReferenceValue)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `${targetFieldTitle} must be greater than or equal to ${referenceFieldTitle}`,
            });
          }
          break;
        case ValidationConditionEnum.LESS_THAN_OR_EQUAL:
          if (!(parsedTargetValue <= parsedReferenceValue)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `${targetFieldTitle} must be less than or equal to ${referenceFieldTitle}`,
            });
          }
          break;
        case ValidationConditionEnum.EQUAL:
          if (!(parsedTargetValue === parsedReferenceValue)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `${targetFieldTitle} must be equal to ${referenceFieldTitle}`,
            });
          }
          break;
      }
    }
  }
}
