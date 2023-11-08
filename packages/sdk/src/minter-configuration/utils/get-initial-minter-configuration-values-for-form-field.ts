import get from "lodash/get";
import set from "lodash/set";
import { ProjectMinterConfigurationDetailsFragment } from "../../generated/graphql";
import { FormFieldSchema, BaseFormFieldSchema } from "../../json-schema";
import { processValueForDisplay } from "../display-processing";

/**
 * This function generates initial values for a form field based on the minter configuration of a project.
 * It recursively traverses the schema of the form field and sets initial values for each property.
 * If a value for a property is present in the project's minter configuration, it is used as the initial value.
 * Otherwise, the default value specified in the schema is used.
 *
 * @param {FormFieldSchema} formField - The form field for which to generate initial values.
 * @param {ProjectMinterConfigurationDetailsFragment | null} projectMinterConfiguration - The minter configuration of the project.
 *
 * @returns {Record<string, any>} - An object containing the initial values for each property of the form field.
 */
export function getInitialMinterConfigurationValuesForFormField(
  formField: FormFieldSchema,
  projectMinterConfiguration: ProjectMinterConfigurationDetailsFragment | null
): Record<string, any> {
  // Object to hold the initial values
  const initialValues: Record<string, any> = {};

  // Recursive function to traverse the schema and set initial values
  function recursiveInitialValues(
    schema: BaseFormFieldSchema,
    configuration: ProjectMinterConfigurationDetailsFragment | null,
    parentKey = ""
  ): void {
    // Check if the current schema is of type object and has properties
    if (schema.type === "object" && schema.properties) {
      // Iterate through the properties of the schema
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (!propSchema || typeof propSchema !== "object") {
          continue;
        }
        // Construct the full key for the current property (e.g., "parent.child")
        const fullKey = parentKey ? `${parentKey}.${key}` : key;
        // Call the function recursively for the current property
        recursiveInitialValues(propSchema, configuration, fullKey);
      }
    } else {
      // If the current schema is a leaf field (not an object), set the initial value
      // Use the value from the configuration if present, otherwise fall back to the default value

      const initialValue = get(
        configuration,
        parentKey,
        schema.default ?? null
      );

      const processedInitialValue = processValueForDisplay(
        initialValue,
        schema.displayProcessing
      );

      set(initialValues, parentKey, processedInitialValue);
    }
  }

  // Start the recursion from the root form field
  recursiveInitialValues(formField, projectMinterConfiguration);

  // Return the populated initialValues object
  return initialValues;
}
