import { describe, expect, it } from "vitest";
import { z } from "zod";

const schema = z
  .object({
    organizationName: z.string().min(2).max(120),
    name: z.string().min(2).max(120),
    email: z.string().email(),
    password: z
      .string()
      .min(12)
      .regex(/[A-Z]/, "uppercase")
      .regex(/[a-z]/, "lowercase")
      .regex(/[0-9]/, "number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

describe("create account validation", () => {
  it("accepts a strong matching password", () => {
    const result = schema.safeParse({
      organizationName: "River Family Properties",
      name: "Alex River",
      email: "alex@example.com",
      password: "SecurePass123!",
      confirmPassword: "SecurePass123!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = schema.safeParse({
      organizationName: "River Family Properties",
      name: "Alex River",
      email: "alex@example.com",
      password: "SecurePass123!",
      confirmPassword: "DifferentPass123!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects weak passwords", () => {
    const result = schema.safeParse({
      organizationName: "River Family Properties",
      name: "Alex River",
      email: "alex@example.com",
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });
});
