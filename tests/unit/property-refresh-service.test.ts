import { describe, expect, it, beforeAll } from "vitest";
import { prisma } from "@/lib/db";
import { refreshPropertyPublicData } from "@/server/services/property-data-refresh";

describe("property public data refresh", () => {
  let propertyId = "";
  let organizationId = "";

  beforeAll(async () => {
    const property = await prisma.property.findFirst({
      where: { deletedAt: null, nickname: "Oak Street Rental" },
    });
    if (!property) {
      throw new Error("Seed data required. Run npm run db:seed.");
    }
    propertyId = property.id;
    organizationId = property.organizationId;
  });

  it("refreshes public fields without failing the portfolio", async () => {
    const result = await refreshPropertyPublicData({
      propertyId,
      organizationId,
      trigger: "manual",
      overwriteManualOverrides: false,
    });
    expect(["SUCCESS", "PARTIAL", "FAILED"]).toContain(result.status);
    expect(result.message.length).toBeGreaterThan(10);

    const updated = await prisma.property.findUnique({ where: { id: propertyId } });
    expect(updated?.lastDataRefreshAt).toBeTruthy();
  });

  it("preserves manual valuation overrides", async () => {
    await prisma.propertyValuation.create({
      data: {
        propertyId,
        estimatedValue: 999999,
        source: "Manual override",
        sourceUpdatedAt: new Date(),
        isEstimated: true,
        isManualOverride: true,
        notes: "Test override",
      },
    });

    await refreshPropertyPublicData({
      propertyId,
      organizationId,
      trigger: "manual",
      overwriteManualOverrides: false,
    });

    const latest = await prisma.propertyValuation.findFirst({
      where: { propertyId },
      orderBy: { createdAt: "desc" },
    });
    expect(latest?.isManualOverride).toBe(true);
    expect(Number(latest?.estimatedValue)).toBe(999999);
  });
});
