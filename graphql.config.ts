import { IGraphQLConfig } from "graphql-config";

const baseConfig = {
  schema: {
    [process.env.HASURA_GRAPHQL_API_ENDPOINT as string]: {
      headers: {
        "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET as string,
      },
    },
  },
  overwrite: true,
};

const basePluginConfig = {
  maybeValue: "T | null | undefined",
  scalars: {
    BigInt: "string",
    BigDecimal: "string",
    Bytes: "string",
    timestamptz: "string",
  },
};

const config: IGraphQLConfig = {
  projects: {
    contracts: {
      ...baseConfig,
      documents: ["packages/contracts/graphql/*.graphql"],
      extensions: {
        codegen: {
          generates: {
            "packages/contracts/generated/graphql.ts": {
              plugins: [
                "typescript",
                "typescript-operations",
                "typescript-urql",
              ],
              config: {
                ...basePluginConfig,
                withHooks: false,
              },
            },
          },
        },
      },
    },
    sdk: {
      ...baseConfig,
      documents: [
        "packages/sdk/**/*.graphql",
        "packages/sdk/**/*.ts",
        "!packages/sdk/**/node_modules/**",
      ],
      extensions: {
        codegen: {
          generates: {
            "packages/sdk/src/generated/": {
              preset: "client",
              config: {
                ...basePluginConfig,
              },
              presetConfig: {
                fragmentMasking: false,
              },
            },
          },
        },
      },
    },
  },
};

export default config;
