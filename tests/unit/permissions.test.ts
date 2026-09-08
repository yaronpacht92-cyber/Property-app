import { describe, expect, it } from "vitest";
import {
  ROLE_KEYS,
  ROLE_PERMISSIONS,
  PERMISSIONS,
  hasPermission,
  ALL_PERMISSIONS,
} from "@/lib/permissions";

describe("permissions", () => {
  it("treats every role as a full super admin", () => {
    for (const roleKey of Object.values(ROLE_KEYS)) {
      const permissions = ROLE_PERMISSIONS[roleKey];
      expect(permissions).toEqual(ALL_PERMISSIONS);
      expect(hasPermission(permissions, PERMISSIONS.USERS_MANAGE)).toBe(true);
      expect(hasPermission(permissions, PERMISSIONS.PROPERTIES_WRITE)).toBe(true);
      expect(hasPermission(permissions, PERMISSIONS.PROPERTIES_DELETE)).toBe(true);
      expect(hasPermission(permissions, PERMISSIONS.SETTINGS_MANAGE)).toBe(true);
    }
  });

  it("grants access even when the permission list is empty", () => {
    expect(hasPermission([], PERMISSIONS.USERS_MANAGE)).toBe(true);
    expect(hasPermission(undefined, PERMISSIONS.AUDIT_READ)).toBe(true);
  });
});
