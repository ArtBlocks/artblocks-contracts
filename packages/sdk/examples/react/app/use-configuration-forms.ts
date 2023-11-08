import { useState, useEffect } from "react";
import ArtBlocksSDK from "@artblocks/sdk";
// TODO: FIX ME!
import { FormBlueprint } from "../../../src/minters";

type UseConfigurationFormsReturn = {
  configurationForms: FormBlueprint[] | null;
  isLoading: boolean;
  error: Error | null;
};

export function useConfigurationForms(
  sdk: ArtBlocksSDK | null,
  projectId: string
): UseConfigurationFormsReturn {
  if (!sdk) throw new Error("SDK is not initialized");

  const [configurationForms, setConfigurationForms] = useState<
    FormBlueprint[] | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const fetchConfiguration = async () => {
      setIsLoading(true);
      try {
        const config = await sdk.getProjectMinterConfiguration(projectId);
        setConfigurationForms(config.forms);
        unsubscribe = config.subscribe((newConfigForms) => {
          setConfigurationForms(newConfigForms);
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
  }, [sdk, projectId]);

  return {
    configurationForms,
    isLoading,
    error,
  };
}
