export const PERMISSIONS = {
  ORG_MANAGE: "org.manage",
  USERS_MANAGE: "users.manage",
  PROPERTIES_READ: "properties.read",
  PROPERTIES_WRITE: "properties.write",
  PROPERTIES_DELETE: "properties.delete",
  FINANCIALS_READ: "financials.read",
  MAINTENANCE_WRITE: "maintenance.write",
  DOCUMENTS_READ: "documents.read",
  DOCUMENTS_WRITE: "documents.write",
  DOCUMENTS_DELETE: "documents.delete",
  REMINDERS_WRITE: "reminders.write",
  NOTES_WRITE: "notes.write",
  INTEGRATIONS_MANAGE: "integrations.manage",
  AUDIT_READ: "audit.read",
  SETTINGS_MANAGE: "settings.manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_KEYS = {
  ADMIN: "family_admin",
  MEMBER: "family_member",
  READ_ONLY: "read_only",
} as const;

/** Personal family app: every role can do everything. */
export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  [ROLE_KEYS.ADMIN]: ALL_PERMISSIONS,
  [ROLE_KEYS.MEMBER]: ALL_PERMISSIONS,
  [ROLE_KEYS.READ_ONLY]: ALL_PERMISSIONS,
};

export function hasPermission(
  _permissions: string[] | undefined,
  _required: PermissionKey | PermissionKey[],
) {
  // Every signed-in family member is a super admin.
  return true;
}

export const PERMISSION_CATALOG: { key: PermissionKey; description: string }[] = [
  { key: PERMISSIONS.ORG_MANAGE, description: "Manage organization settings" },
  { key: PERMISSIONS.USERS_MANAGE, description: "Add and remove users" },
  { key: PERMISSIONS.PROPERTIES_READ, description: "View properties" },
  { key: PERMISSIONS.PROPERTIES_WRITE, description: "Add and edit properties" },
  { key: PERMISSIONS.PROPERTIES_DELETE, description: "Archive properties" },
  { key: PERMISSIONS.FINANCIALS_READ, description: "View financial summaries" },
  { key: PERMISSIONS.MAINTENANCE_WRITE, description: "Add maintenance records" },
  { key: PERMISSIONS.DOCUMENTS_READ, description: "View documents" },
  { key: PERMISSIONS.DOCUMENTS_WRITE, description: "Upload documents" },
  { key: PERMISSIONS.DOCUMENTS_DELETE, description: "Remove documents" },
  { key: PERMISSIONS.REMINDERS_WRITE, description: "Manage reminders" },
  { key: PERMISSIONS.NOTES_WRITE, description: "Add notes" },
  { key: PERMISSIONS.INTEGRATIONS_MANAGE, description: "Connect integrations" },
  { key: PERMISSIONS.AUDIT_READ, description: "View audit history" },
  { key: PERMISSIONS.SETTINGS_MANAGE, description: "Change application settings" },
];
