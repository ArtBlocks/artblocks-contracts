import { useState, useEffect } from "react";
import ArtBlocksSDK from "@artblocks/sdk";
// TODO: FIX ME!
import { ConfigurationForm } from "../../../src/minters";

type UseConfigurationFormsReturn = {
  configurationForms: ConfigurationForm[] | null;
  isLoading: boolean;
  error: Error | null;
  refreshConfiguration: () => Promise<void>;
};

export function useConfigurationForms(
  sdk: ArtBlocksSDK,
  coreContractAddress: string,
  projectId: number
): UseConfigurationFormsReturn {
  const [configurationForms, setConfigurationForms] = useState<
    ConfigurationForm[] | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const fetchConfiguration = async () => {
      setIsLoading(true);
      try {
        const config = await sdk.getProjectMinterConfiguration(
          coreContractAddress,
          projectId
        );
        setConfigurationForms(config.forms);

        // Subscribe to future updates
        unsubscribe = config.subscribe((updatedConfig) => {
          setConfigurationForms(updatedConfig);
        });
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfiguration();

    // Cleanup effect
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [sdk, coreContractAddress, projectId]);

  const refreshConfiguration = async () => {
    try {
      const config = await sdk.getProjectMinterConfiguration(
        coreContractAddress,
        projectId
      );
      await config.refresh();
    } catch (err) {
      setError(err as Error);
    }
  };

  return {
    configurationForms,
    isLoading,
    error,
    refreshConfiguration,
  };
}
