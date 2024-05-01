import { PublicClient } from "viem";
import { ArtBlocksClientContext } from "..";
import {
  GetProjectMinterConfigurationQuery,
  ProjectMinterConfigurationDetailsFragment,
} from "../generated/graphql";
import { FormFieldSchema } from "../json-schema";
import { FormBlueprint } from "../types";

export type GenerateProjectMinterConfigurationFormsArgs = {
  projectId: string;
  onConfigurationChange: (args: {
    data: ProjectMinterConfigurationData;
    forms: FormBlueprint[];
  }) => void;
  clientContext: ArtBlocksClientContext & {
    publicClient: PublicClient;
  };
};

export type GenerateProjectMinterConfigurationFormsContext =
  GenerateProjectMinterConfigurationFormsArgs & {
    allowedPrivilegedRolesForProject: string[];
    coreContractAddress: string;
    projectIndex: number;
    project: ProjectWithMinterFilter;
  };

export type ProjectWithMinterFilter = NonNullable<
  GetProjectMinterConfigurationQuery["projects_metadata_by_pk"]
> & {
  contract: {
    minter_filter: {
      address: string;
    };
  };
};

export type ProjectMinterConfigurationData =
  GetProjectMinterConfigurationQuery["projects_metadata_by_pk"];

export type TransformProjectMinterConfigurationFormValuesArgs =
  GenerateProjectMinterConfigurationFormsContext & {
    formValues: Record<string, any>;
    schema: FormFieldSchema;
    minterConfiguration: NonNullable<ProjectMinterConfigurationDetailsFragment>;
  };
