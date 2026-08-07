import { describe, expect, it } from "vitest";
import {
  ROLE_KEYS,
  ROLE_PERMISSIONS,
  PERMISSIONS,
  hasPermission,
} from "@/lib/permissions";

describe("role permissions", () => {
  it("gives administrators full access", () => {
    const permissions = ROLE_PERMISSIONS[ROLE_KEYS.ADMIN];
    expect(hasPermission(permissions, PERMISSIONS.USERS_MANAGE)).toBe(true);
    expect(hasPermission(permissions, PERMISSIONS.AUDIT_READ)).toBe(true);
    expect(hasPermission(permissions, PERMISSIONS.INTEGRATIONS_MANAGE)).toBe(true);
  });

  it("allows family members to write maintenance but not manage users", () => {
    const permissions = ROLE_PERMISSIONS[ROLE_KEYS.MEMBER];
    expect(hasPermission(permissions, PERMISSIONS.MAINTENANCE_WRITE)).toBe(true);
    expect(hasPermission(permissions, PERMISSIONS.USERS_MANAGE)).toBe(false);
    expect(hasPermission(permissions, PERMISSIONS.PROPERTIES_WRITE)).toBe(false);
  });

  it("keeps read-only users from editing", () => {
    const permissions = ROLE_PERMISSIONS[ROLE_KEYS.READ_ONLY];
    expect(hasPermission(permissions, PERMISSIONS.PROPERTIES_READ)).toBe(true);
    expect(hasPermission(permissions, PERMISSIONS.DOCUMENTS_WRITE)).toBe(false);
    expect(hasPermission(permissions, PERMISSIONS.NOTES_WRITE)).toBe(false);
  });
});
