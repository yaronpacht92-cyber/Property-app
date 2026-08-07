import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      organizationId: string;
      organizationName: string;
      roleKey: string;
      roleName: string;
      permissions: string[];
      mfaEnabled: boolean;
    };
  }

  interface User {
    organizationId?: string;
    organizationName?: string;
    roleKey?: string;
    roleName?: string;
    permissions?: string[];
    mfaEnabled?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    organizationId?: string;
    organizationName?: string;
    roleKey?: string;
    roleName?: string;
    permissions?: string[];
    mfaEnabled?: boolean;
  }
}
