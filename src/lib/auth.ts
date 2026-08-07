import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { verify as verifyTotp } from "otplib";
import { decryptSecret } from "@/lib/crypto";
import { hasPermission } from "@/lib/permissions";

export { hasPermission };

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mfaCode: z.string().optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
    updateAge: 60 * 30,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mfaCode: { label: "Security code", type: "text" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase().trim();
        const max = Number(process.env.RATE_LIMIT_LOGIN_MAX ?? 5);
        const windowMs = Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MS ?? 900000);
        const limited = rateLimit(`login:${email}`, max, windowMs);
        if (!limited.ok) {
          throw new Error("Too many sign-in attempts. Please wait a few minutes and try again.");
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            memberships: {
              where: { status: "ACTIVE" },
              include: {
                role: { include: { permissions: { include: { permission: true } } } },
                organization: true,
              },
              take: 1,
            },
          },
        });

        if (!user) return null;
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error("This account is temporarily locked. Please try again later.");
        }

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) {
          const attempts = user.failedLoginAttempts + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: attempts,
              lockedUntil: attempts >= max ? new Date(Date.now() + windowMs) : null,
            },
          });
          return null;
        }

        if (user.mfaEnabled) {
          if (!parsed.data.mfaCode || !user.mfaSecretEnc) {
            throw new Error("Enter the 6-digit security code from your authenticator app.");
          }
          const secret = decryptSecret(user.mfaSecretEnc);
          const result = await verifyTotp({ token: parsed.data.mfaCode, secret });
          if (!result.valid) {
            throw new Error("That security code was not correct. Please try again.");
          }
        }

        const membership = user.memberships[0];
        if (!membership) {
          throw new Error("Your account is not linked to a family yet. Ask an administrator for help.");
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });

        const permissions = membership.role.permissions.map((rp) => rp.permission.key);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: membership.organizationId,
          organizationName: membership.organization.name,
          roleKey: membership.role.key,
          roleName: membership.role.name,
          permissions,
          mfaEnabled: user.mfaEnabled,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          organizationId: string;
          organizationName: string;
          roleKey: string;
          roleName: string;
          permissions: string[];
          mfaEnabled: boolean;
        };
        token.organizationId = u.organizationId;
        token.organizationName = u.organizationName;
        token.roleKey = u.roleKey;
        token.roleName = u.roleName;
        token.permissions = u.permissions;
        token.mfaEnabled = u.mfaEnabled;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.organizationId = String(token.organizationId ?? "");
        session.user.organizationName = String(token.organizationName ?? "");
        session.user.roleKey = String(token.roleKey ?? "");
        session.user.roleName = String(token.roleName ?? "");
        session.user.permissions = (token.permissions as string[]) ?? [];
        session.user.mfaEnabled = Boolean(token.mfaEnabled);
      }
      return session;
    },
  },
});
