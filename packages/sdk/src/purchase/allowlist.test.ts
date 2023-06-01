import { describe, it, expect } from "@jest/globals";
import {
  generateUserMerkleProof,
  AllowlistEntryDoesNotExist,
} from "./allowlist";

const ALLOWLIST = [
  "0x81c41D4405bd22A2012830870A10E26D3F740A31",
  "0xbea796E9f85E9821d4910AE9D2bA64A24b60Aae3",
  "0xC433E65449165848180779521CA99eCe75D7DB69",
  "0x313918a167152209d91F7182A407169f5327CaE3",
  "0x9267df035F6d7566d410B9Af153574f87481Eb00",
  "0xd31E891ad9a1e47e4D3d9B15cccCd188BeBC7A48",
];

describe("generateUserMerkleProof", () => {
  it("should generate a correct merkle proof for a user on the allowlist", () => {
    expect(generateUserMerkleProof(ALLOWLIST, ALLOWLIST[0])).toEqual([
      "0x63d47d072f0f348e428f18ebb7cdbba5df86105bab84576f0eea618c16eca7d6",
      "0xaf489f4dffceae68780af004591d929c5ac342c4213558632bfb56615986f8e1",
      "0xf662b2098c85aeb86eeda04d033d18ffef266ea445807791f8ca2c656369d95d",
    ]);
  });

  it("should generate an empty merkle proof for a single-entry allowlist", () => {
    expect(generateUserMerkleProof([ALLOWLIST[0]], ALLOWLIST[0])).toEqual([]);
  });

  it("should raise an error for a user not on the allowlist", () => {
    expect(() => {
      generateUserMerkleProof(
        ALLOWLIST,
        "0xE523cCE52746962e4d2FB181E59b3A5DcEB65B44"
      );
    }).toThrowError(AllowlistEntryDoesNotExist);
  });
});

describe("AllowlistEntryDoesNotExist", () => {
  it("specifies the name of the error with an error message", () => {
    const error = new AllowlistEntryDoesNotExist();
    expect(error.name).toEqual("AllowlistEntryDoesNotExist");
    expect(error.message.length).toBeGreaterThan(0);
  });
});
