import { getAllowedPrivilegedRoles } from "./get-allowed-privileged-roles";

describe("getAllowedPrivilegedRoles", () => {
  it("should return an empty array when all inputs are false", () => {
    expect(getAllowedPrivilegedRoles(false, false, false)).toEqual([]);
  });

  it('should return ["staff"] when only userIsStaff is true', () => {
    expect(getAllowedPrivilegedRoles(true, false, false)).toEqual(["staff"]);
  });

  it('should return ["allowlisted"] when only userIsAllowlisted is true', () => {
    expect(getAllowedPrivilegedRoles(false, true, false)).toEqual([
      "allowlisted",
    ]);
  });

  it('should return ["artist"] when only userIsArtist is true', () => {
    expect(getAllowedPrivilegedRoles(false, false, true)).toEqual(["artist"]);
  });

  it('should return ["staff", "allowlisted"] when userIsStaff and userIsAllowlisted are true', () => {
    expect(getAllowedPrivilegedRoles(true, true, false)).toEqual([
      "staff",
      "allowlisted",
    ]);
  });

  it('should return ["staff", "artist"] when userIsStaff and userIsArtist are true', () => {
    expect(getAllowedPrivilegedRoles(true, false, true)).toEqual([
      "staff",
      "artist",
    ]);
  });

  it('should return ["allowlisted", "artist"] when userIsAllowlisted and userIsArtist are true', () => {
    expect(getAllowedPrivilegedRoles(false, true, true)).toEqual([
      "allowlisted",
      "artist",
    ]);
  });

  it('should return ["staff", "allowlisted", "artist"] when all inputs are true', () => {
    expect(getAllowedPrivilegedRoles(true, true, true)).toEqual([
      "staff",
      "allowlisted",
      "artist",
    ]);
  });
});
