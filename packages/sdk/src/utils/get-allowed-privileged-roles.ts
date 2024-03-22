export function getAllowedPrivilegedRoles(
  userIsStaff: boolean,
  userIsAllowlisted: boolean,
  userIsArtist: boolean
) {
  const roles = [];
  if (userIsStaff) {
    roles.push("staff");
  }
  if (userIsAllowlisted) {
    roles.push("allowlisted");
  }
  if (userIsArtist) {
    roles.push("artist");
  }
  return roles;
}
