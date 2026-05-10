export const hasPermission = (
  userPermissions: string[] = [],
  permissions: string[]
): boolean => {
  return permissions.some((perm) => userPermissions.includes(perm));
};
