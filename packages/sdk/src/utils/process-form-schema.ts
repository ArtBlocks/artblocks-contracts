import { BaseFormFieldSchema, FormFieldSchema } from "../json-schema";

/**
 * Orders the properties of a JSON schema.
 * This is necessary because the order of keys is not maintained when stored in a PostgreSQL jsonb column.
 * If the schema type is not an object or does not have properties, the original schema is returned.
 * If a 'ui:order' field is specified in the schema, it is used to order the properties.
 * Any remaining fields not specified in 'ui:order' are appended at the end.
 * If 'ui:order' is not specified, the original order is retained but nested objects are checked.
 *
 * @param schema - The JSON schema to be ordered.
 * @returns - The ordered JSON schema.
 */
function orderJsonSchema<T extends BaseFormFieldSchema>(schema: T): T {
  if (schema.type !== "object" || !schema.properties) {
    return schema;
  }

  let orderedProperties: Record<string, BaseFormFieldSchema> = {};

  // If 'ui:order' is specified, use it to order properties
  if (schema["ui:order"]) {
    schema["ui:order"].forEach((field) => {
      if (
        schema.properties &&
        schema.properties[field] &&
        schema.properties[field] !== false
      ) {
        orderedProperties[field] = orderJsonSchema(
          schema.properties[field] as BaseFormFieldSchema
        );
      }
    });

    // Append any remaining fields not specified in 'ui:order'
    for (const field in schema.properties) {
      if (!orderedProperties[field] && schema.properties[field] !== false) {
        orderedProperties[field] = orderJsonSchema(
          schema.properties[field] as BaseFormFieldSchema
        );
      }
    }
  } else {
    // If 'ui:order' is not specified, retain the original order but still check for nested objects
    orderedProperties = Object.keys(schema.properties).reduce(
      (acc, field) => {
        if (
          schema.properties &&
          schema.properties[field] &&
          schema.properties[field] !== false
        ) {
          acc[field] = orderJsonSchema(
            schema.properties[field] as BaseFormFieldSchema
          );
        }
        return acc;
      },
      {} as Record<string, BaseFormFieldSchema>
    );
  }

  return {
    ...schema,
    properties: orderedProperties,
  } as T;
}

/**
 * Processes the form schema by removing the 'projectIndex' and 'coreContractAddress'
 * properties if they exist. We know the projectIndex and coreContractAddress from the
 * context of the form so we don't need to ask the user for them. It also orders the
 * schema using the 'orderJsonSchema' function.
 *
 * @param schema - The form schema to be processed.
 * @returns - The processed form schema.
 */
export function processFormSchema(schema: FormFieldSchema): FormFieldSchema {
  // If properties are defined, remove projectId
  const properties = schema.properties
    ? (({ projectIndex, coreContractAddress, ...rest }) => rest)(
        schema.properties
      )
    : undefined;

  // If required is defined, filter out projectId
  const required = schema.required
    ? schema.required.filter(
        (item) => item !== "projectIndex" && item !== "coreContractAddress"
      )
    : undefined;

  const orderedSchema = orderJsonSchema({
    ...schema,
    properties,
    required,
  });

  return orderedSchema;
}
