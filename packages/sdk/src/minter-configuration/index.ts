// Third-party dependencies
import { Abi, Hex } from "viem";
import get from "lodash/get";

// Type imports
import {
  FormBlueprint,
  SubmissionStatus,
  SubmissionStatusEnum,
} from "../types";

// Utility functions related to form and schema processing
import { processFormSchema } from "../utils/process-form-schema";
import { formFieldSchemaToZod } from "../utils/zod";
import { getAllowedPrivilegedRoles } from "../utils/get-allowed-privileged-roles";
import {
  mapFormValuesToArgs,
  submitTransaction,
} from "../utils/submit-transaction";

// GraphQL types and operations
import { getProjectMinterConfigurationQueryDocument } from "./graphql-operations";
import {
  GetProjectMinterConfigurationQuery,
  Minter_Filter_Type_Names_Enum,
  ProjectMinterConfigurationDetailsFragment,
} from "../generated/graphql";

// Utils and helpers specific to minters
import { generateMinterSelectionFormSchema } from "./utils/generate-minter-selection-form-schema";
import { getInitialMinterConfigurationValuesForFormField } from "./utils/get-initial-minter-configuration-values-for-form-field";
import { processProjectMinterConfigurationFormValuesForSubmission } from "./submission-processing";
import {
  pollForProjectUpdates,
  pollForSyncedMinterConfigUpdates,
} from "./utils/polling";

// JSON schema and type checks
import {
  ConfigurationSchema,
  FormFieldSchema,
  isOnChainFormFieldSchema,
} from "../json-schema";

// Types specific to project minter configuration
import {
  GenerateProjectMinterConfigurationFormsArgs,
  GenerateProjectMinterConfigurationFormsContext,
  ProjectWithMinterFilter,
} from "./types";

export async function generateProjectMinterConfigurationForms(
  args: GenerateProjectMinterConfigurationFormsArgs
): Promise<{
  data: GetProjectMinterConfigurationQuery["projects_metadata_by_pk"];
  forms: FormBlueprint[];
}> {
  const { projectId, clientContext } = args;
  const [coreContractAddress, projectIndexString] = projectId.split("-");
  const projectIndex = Number(projectIndexString);

  // Get current minter configuration details from the database
  const res = await clientContext.graphqlClient.request(
    getProjectMinterConfigurationQueryDocument,
    {
      projectId,
    }
  );

  const project = res.projects_metadata_by_pk;

  if (!project) {
    throw new Error(`Could not find project with id ${projectId}`);
  }

  if (!project.contract.minter_filter) {
    throw new Error(
      `Project with id ${projectId} is not on a contract with an associated minter filter`
    );
  }

  const allowedPrivilegedRolesForProject = getAllowedPrivilegedRoles(
    clientContext.userIsStaff,
    project.contract.user_is_allowlisted ?? false,
    project.user_is_artist ?? false
  );

  const context: GenerateProjectMinterConfigurationFormsContext = {
    ...args,
    allowedPrivilegedRolesForProject,
    coreContractAddress,
    projectIndex,
    project: project as ProjectWithMinterFilter,
  };

  const minterSelectionForm = await generateSelectMinterForm(context);
  let configurationForms = [minterSelectionForm];

  // If no minter has been selected, return only the minter selection form
  const minterConfiguration = res.projects_metadata_by_pk?.minter_configuration;

  if (!minterConfiguration || !minterConfiguration.minter) {
    return { data: project, forms: configurationForms };
  }

  const minterConfigurationSchema: ConfigurationSchema =
    minterConfiguration.minter.type?.project_configuration_schema;

  if (
    !minterConfigurationSchema ||
    Object.keys(minterConfigurationSchema).length === 0
  ) {
    console.warn("No minter configuration schema found for project", projectId);
    return { data: project, forms: configurationForms };
  }

  const configForms = await Promise.all(
    Object.entries(minterConfigurationSchema.properties).map(
      async ([key, value]) => {
        return generateMinterForm({
          ...context,
          key,
          formSchema: value,
          minterConfiguration,
        });
      }
    )
  );
  configurationForms = configurationForms.concat(configForms);

  return { data: project, forms: configurationForms };
}

// Form to choose a minter
async function generateSelectMinterForm({
  clientContext,
  project,
  projectId,
  projectIndex,
  coreContractAddress,
  onConfigurationChange,
}: GenerateProjectMinterConfigurationFormsContext): Promise<FormBlueprint> {
  const minterConfiguration = project.minter_configuration;
  const minterSelectionFormSchema = generateMinterSelectionFormSchema(
    project.contract.minter_filter.type ===
      Minter_Filter_Type_Names_Enum.MinterFilterV2
  );

  // Map available minters to oneOf entries on the minter.address
  // property of the minter selection form schema
  const minterSelectionFormSchemaWithMinters = minterSelectionFormSchema;
  if (minterSelectionFormSchemaWithMinters.properties?.["minter.address"]) {
    const globallyAllowedMinters =
      project.contract.minter_filter.globally_allowed_minters ?? [];
    const latestMinters = globallyAllowedMinters.reduce(
      (dedupedMinters, minter) => {
        return dedupedMinters.filter((mntr) => {
          return (
            minterConfiguration?.minter?.address === mntr.address ||
            mntr.type?.unversioned_type !== minter.type?.unversioned_type ||
            (mntr.type?.version_number || 0) >=
              (minter.type?.version_number || 0)
          );
        });
      },
      globallyAllowedMinters
    );

    minterSelectionFormSchemaWithMinters.properties["minter.address"].oneOf =
      latestMinters
        .map((minter) => ({
          const: minter.address,
          title: `${minter.type?.label ?? ""} - ${minter.address}`,
        }))
        .sort((a, b) => b.title.localeCompare(a.title));
  }

  // Initialize configurationForms with the minter selection form
  const form = {
    key: "setMinterForProject",
    formSchema: minterSelectionFormSchemaWithMinters,
    initialFormValues: await getInitialMinterConfigurationValuesForFormField(
      minterSelectionFormSchemaWithMinters,
      minterConfiguration ?? null,
      clientContext.publicClient
    ),
    zodSchema: formFieldSchemaToZod(minterSelectionFormSchemaWithMinters),
    handleSubmit: async (
      formValues: Record<string, any>,
      onProgress?: (status: SubmissionStatus) => void
    ) => {
      const walletClient = clientContext.walletClient;
      if (!walletClient) {
        throw new Error(
          "A walletClient is required to submit the set minter form"
        );
      }
      // We need basic information about the project and the
      // minter to submit the transaction
      if (
        !project ||
        !project.contract.minter_filter ||
        !get(formValues, "minter.address") ||
        !walletClient.account
      ) {
        console.warn("handleSubmit called without required data");
        return;
      }

      onProgress?.(SubmissionStatusEnum.SIMULATING_TRANSACTION);

      // Get the minter filter address for minter selection
      const minterFilterAddress: Hex = project.contract.minter_filter
        .address as Hex;

      // Map the form values to an array of arguments expected by the smart contract function
      const functionArgs = mapFormValuesToArgs(
        minterSelectionFormSchemaWithMinters.transactionDetails.args,
        formValues,
        projectIndex,
        coreContractAddress
      );

      // Submit the transaction
      const { blockHash } = await submitTransaction({
        publicClient: clientContext.publicClient,
        walletClient,
        address: minterFilterAddress,
        abi: minterSelectionFormSchemaWithMinters.transactionDetails.abi as Abi,
        functionName:
          minterSelectionFormSchemaWithMinters.transactionDetails.functionName,
        args: functionArgs,
        onSimulationSuccess: () =>
          onProgress?.(SubmissionStatusEnum.AWAITING_USER_SIGNATURE),
        onUserAccepted: () => {
          onProgress?.(SubmissionStatusEnum.CONFIRMING);
        },
      });

      onProgress?.(SubmissionStatusEnum.SYNCING);

      // Get block confirmation timestamp
      const { timestamp } = await clientContext.publicClient.getBlock({
        blockHash,
      });
      const transactionConfirmedAt = new Date(Number(timestamp) * 1000);

      // Poll for updates to the configuration, this will return
      // when the minter_address column has been updated to a
      // time after the transaction was confirmed
      await pollForProjectUpdates(
        clientContext,
        projectId,
        transactionConfirmedAt,
        ["minter_configuration_id"]
      );

      const updatedForms = await generateProjectMinterConfigurationForms({
        clientContext,
        onConfigurationChange,
        projectId,
      });

      // Alert subscribers that the configuration change has been confirmed
      // and synced to the database
      onConfigurationChange(updatedForms);
    },
  };

  return form;
}

type GenerateMinterFormArgs = GenerateProjectMinterConfigurationFormsContext & {
  key: string;
  formSchema: FormFieldSchema;
  minterConfiguration: NonNullable<ProjectMinterConfigurationDetailsFragment>;
};

// Forms to configure a minter for a project
async function generateMinterForm(
  args: GenerateMinterFormArgs
): Promise<FormBlueprint> {
  const {
    clientContext,
    key,
    projectId,
    formSchema,
    projectIndex,
    coreContractAddress,
    minterConfiguration,
    onConfigurationChange,
  } = args;

  const processedFormSchema = processFormSchema(formSchema);

  const initialFormValues =
    await getInitialMinterConfigurationValuesForFormField(
      processedFormSchema,
      minterConfiguration,
      clientContext.publicClient
    );

  return {
    key,
    formSchema: processedFormSchema,
    initialFormValues,
    zodSchema: formFieldSchemaToZod(processedFormSchema),
    handleSubmit: async (
      formValues: Record<string, any>,
      onProgress?: (status: SubmissionStatus) => void
    ) => {
      const walletClient = clientContext.walletClient;
      if (!walletClient) {
        throw new Error(
          "A walletClient is required to submit the minter configuration form"
        );
      }

      if (
        !minterConfiguration.minter ||
        !isOnChainFormFieldSchema(processedFormSchema) ||
        !processedFormSchema.transactionDetails ||
        !walletClient.account
      ) {
        throw new Error("Invalid form configuration");
      }

      // Narrow the type of processedFormSchema.transactionDetails
      const transactionDetails = processedFormSchema.transactionDetails;

      onProgress?.(SubmissionStatusEnum.SIMULATING_TRANSACTION);

      // Transform the form values to the format expected by the smart contract
      const transformedFormValues =
        await processProjectMinterConfigurationFormValuesForSubmission({
          ...args,
          formValues,
          schema: formSchema,
        });

      const functionArgs = mapFormValuesToArgs(
        transactionDetails.args,
        transformedFormValues,
        projectIndex,
        coreContractAddress
      );

      const { blockHash } = await submitTransaction({
        publicClient: clientContext.publicClient,
        walletClient,
        address: minterConfiguration.minter.address as `0x${string}`,
        abi: transactionDetails.abi as Abi,
        functionName: transactionDetails.functionName,
        args: functionArgs, // sdk needs to come from values,
        onSimulationSuccess: () =>
          onProgress?.(SubmissionStatusEnum.AWAITING_USER_SIGNATURE),
        onUserAccepted: () => onProgress?.(SubmissionStatusEnum.CONFIRMING),
      });

      onProgress?.(SubmissionStatusEnum.SYNCING);

      // Get block confirmation timestamp
      const { timestamp } = await clientContext.publicClient.getBlock({
        blockHash,
      });
      const transactionConfirmedAt = new Date(Number(timestamp) * 1000);

      const expectedUpdates =
        transactionDetails.syncCheckFieldsOverride ?? transactionDetails.args;

      // Poll for updates to the configuration
      await pollForSyncedMinterConfigUpdates(
        clientContext,
        projectId,
        transactionConfirmedAt,
        expectedUpdates
      );

      onConfigurationChange(
        await generateProjectMinterConfigurationForms(args)
      );
    },
  };
}
