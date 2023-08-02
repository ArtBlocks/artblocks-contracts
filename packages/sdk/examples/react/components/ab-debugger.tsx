"use client";

import React from "react";
import { useArtBlocksSdk } from "../app/artblocks-provider";

export function AbDebugger() {
  const abSdk = useArtBlocksSdk();

  React.useEffect(() => {
    if (!abSdk?.jwt) {
      return;
    }

    async function getProjectMinterConfiguration() {
      console.log("CALLING GETPROJECTMINTERCONFIGURATION");
      const config = await abSdk?.getProjectMinterConfiguration(
        "0xf396c180bb2f92ee28535d23f5224a5b9425ceca",
        230
      );

      console.log(config);
    }

    getProjectMinterConfiguration();
  }, [abSdk]);

  return null;
}
