"use client";

import React from "react";
import { useArtBlocksSdk } from "./artblocks-provider";
import { useConfigurationForms } from "./use-configuration-forms";
import { get } from "lodash";
import { ConfigurationForm } from "../../../src/minters";
import { FormBuilder } from "@/components/form-builder";

export function ProjectConfiguration() {
  const [config, setConfig] = React.useState<ConfigurationForm[]>([]);

  const abSdk = useArtBlocksSdk();

  const { isLoading, configurationForms } = useConfigurationForms(
    abSdk,
    "0xf396c180bb2f92ee28535d23f5224a5b9425ceca",
    230
  );

  if (isLoading || !configurationForms) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <FormBuilder configurationForms={configurationForms} />
    </div>
  );
}
