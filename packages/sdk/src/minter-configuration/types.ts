import { ArtBlocksClientContext, PublicClientResolver } from "..";
import {
  GetProjectMinterConfigurationQuery,
  ProjectMinterConfigurationDetailsFragment,
} from "../generated/graphql";
import { FormFieldSchema } from "../json-schema";
import { FormBlueprint } from "../types";

export type GenerateProjectMinterConfigurationFormsArgs = {
  projectId: string;
  chainId: number;
  onConfigurationChange: (args: {
    data: ProjectMinterConfigurationData;
    forms: FormBlueprint[];
  }) => void;
  clientContext: ArtBlocksClientContext & {
    publicClientResolver: PublicClientResolver;
  };
};

export type GenerateProjectMinterConfigurationFormsContext = Omit<
  GenerateProjectMinterConfigurationFormsArgs,
  "chainId"
> & {
  allowedPrivilegedRolesForProject: string[];
  coreContractAddress: string;
  projectIndex: number;
  project: ProjectWithMinterFilter;
};

export type ProjectWithMinterFilter = NonNullable<
  GetProjectMinterConfigurationQuery["projects_metadata"][0]
> & {
  contract: {
    minter_filter: {
      address: string;
    };
  };
};

export type ProjectMinterConfigurationData =
  GetProjectMinterConfigurationQuery["projects_metadata"][0];

export type TransformProjectMinterConfigurationFormValuesArgs =
  GenerateProjectMinterConfigurationFormsContext & {
    formValues: Record<string, any>;
    schema: FormFieldSchema;
    minterConfiguration: NonNullable<ProjectMinterConfigurationDetailsFragment>;
  };
