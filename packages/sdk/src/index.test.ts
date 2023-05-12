import ArtBlocksSDK from "./index";
import { describe, expect, test } from "@jest/globals";

describe("ArtBlocksSDK", () => {
  test("is defined", () => {
    expect(new ArtBlocksSDK()).toBeDefined();
  });
});
