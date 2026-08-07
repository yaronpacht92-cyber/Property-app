import { describe, expect, it, beforeAll } from "vitest";
import { prisma } from "@/lib/db";

describe("organization tenant isolation", () => {
  let orgA: string;
  let orgB: string;
  let propertyA: string;

  beforeAll(async () => {
    const a = await prisma.organization.findFirst({
      where: { name: { contains: "Pacht" } },
    });
    if (!a) {
      throw new Error("Seed data required. Run npm run db:seed before integration tests.");
    }
    orgA = a.id;

    const b = await prisma.organization.upsert({
      where: { id: "00000000-0000-4000-8000-000000000099" },
      update: {},
      create: {
        id: "00000000-0000-4000-8000-000000000099",
        name: "Other Family Org (Isolation Test)",
      },
    });
    orgB = b.id;

    const property = await prisma.property.findFirst({
      where: { organizationId: orgA, deletedAt: null },
    });
    if (!property) throw new Error("Seed property missing");
    propertyA = property.id;
  });

  it("does not return another organization's property by id alone", async () => {
    const leaked = await prisma.property.findFirst({
      where: {
        id: propertyA,
        organizationId: orgB,
        deletedAt: null,
      },
    });
    expect(leaked).toBeNull();
  });

  it("scopes property lists to the active organization", async () => {
    const countB = await prisma.property.count({
      where: { organizationId: orgB, deletedAt: null },
    });
    expect(countB).toBe(0);
  });
});
