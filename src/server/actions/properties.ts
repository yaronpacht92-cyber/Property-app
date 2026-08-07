"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission, assertPropertyAccess } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { hasPermission } from "@/lib/auth";

const basicSchema = z.object({
  nickname: z.string().min(2).max(120),
  streetAddress: z.string().min(3).max(200),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(2),
  zipCode: z.string().min(5).max(10),
  propertyType: z.enum(["RESIDENTIAL", "COMMERCIAL", "VACANT_LAND", "OTHER"]),
  ownershipEntityId: z.string().uuid().optional().or(z.literal("")),
  dateAcquired: z.string().optional(),
  purchasePrice: z.string().optional(),
  estimatedValue: z.string().optional(),
  assessedValue: z.string().optional(),
  annualTaxes: z.string().optional(),
  taxJurisdiction: z.string().optional(),
  managerName: z.string().optional(),
  managerCompany: z.string().optional(),
  managerPhone: z.string().optional(),
  managerEmail: z.string().email().optional().or(z.literal("")),
  insuranceCarrier: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  insuranceRenewalDate: z.string().optional(),
});

function money(value?: string) {
  if (!value) return null;
  const n = Number(value.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export async function createPropertyAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.PROPERTIES_WRITE);
  const raw = Object.fromEntries(formData.entries());
  const parsed = basicSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please check the property details and try again." };
  }

  const data = parsed.data;
  const property = await prisma.property.create({
    data: {
      organizationId: session.user.organizationId,
      nickname: data.nickname,
      streetAddress: data.streetAddress,
      city: data.city,
      state: data.state.toUpperCase(),
      zipCode: data.zipCode,
      propertyType: data.propertyType,
      ownershipEntityId: data.ownershipEntityId || null,
      dateAcquired: data.dateAcquired ? new Date(data.dateAcquired) : null,
      purchasePrice: money(data.purchasePrice),
      createdById: session.user.id,
      updatedById: session.user.id,
    },
  });

  if (data.estimatedValue) {
    await prisma.propertyValuation.create({
      data: {
        propertyId: property.id,
        estimatedValue: money(data.estimatedValue) ?? 0,
        source: "Manual entry",
        sourceUpdatedAt: new Date(),
        isEstimated: true,
        isManualOverride: true,
        createdById: session.user.id,
      },
    });
  }

  if (data.assessedValue || data.annualTaxes || data.taxJurisdiction) {
    await prisma.propertyTaxRecord.create({
      data: {
        propertyId: property.id,
        assessedValue: money(data.assessedValue),
        annualTax: money(data.annualTaxes),
        jurisdiction: data.taxJurisdiction || null,
        source: "manual",
        isManualOverride: true,
        sourceUpdatedAt: new Date(),
      },
    });
  }

  if (data.managerName) {
    const contact = await prisma.contact.create({
      data: {
        organizationId: session.user.organizationId,
        name: data.managerName,
        company: data.managerCompany || null,
        phone: data.managerPhone || null,
        email: data.managerEmail || null,
      },
    });
    await prisma.propertyContact.create({
      data: {
        propertyId: property.id,
        contactId: contact.id,
        role: "PROPERTY_MANAGER",
        isEmergency: true,
      },
    });
  }

  if (data.insuranceCarrier || data.insurancePolicyNumber) {
    const renewal = data.insuranceRenewalDate ? new Date(data.insuranceRenewalDate) : null;
    const policy = await prisma.insurancePolicy.create({
      data: {
        propertyId: property.id,
        carrier: data.insuranceCarrier || null,
        policyNumber: data.insurancePolicyNumber || null,
        renewalDate: renewal,
        status: renewal
          ? renewal < new Date()
            ? "EXPIRED"
            : renewal.getTime() - Date.now() < 1000 * 60 * 60 * 24 * 90
              ? "RENEWAL_COMING_UP"
              : "ACTIVE"
          : "MISSING_INFORMATION",
      },
    });

    if (renewal) {
      for (const days of [90, 60, 30, 7]) {
        const due = new Date(renewal);
        due.setDate(due.getDate() - days);
        if (due < new Date()) continue;
        await prisma.reminder.create({
          data: {
            organizationId: session.user.organizationId,
            propertyId: property.id,
            type: "INSURANCE_RENEWAL",
            title: `Insurance renewal in ${days} days — ${property.nickname}`,
            description: `Reminder to review insurance for ${property.nickname}.`,
            dueDate: due,
            status: days <= 30 ? "DUE_SOON" : "UPCOMING",
            assignedToId: session.user.id,
            scheduleOffsets: [90, 60, 30, 7],
          },
        });
      }
      void policy;
    }
  }

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "property.created",
    entityType: "Property",
    entityId: property.id,
    summary: `Added property ${property.nickname}`,
  });

  revalidatePath("/home");
  revalidatePath("/properties");
  redirect(`/properties/${property.id}?created=1`);
}

export async function archivePropertyAction(propertyId: string) {
  const session = await requirePermission(PERMISSIONS.PROPERTIES_DELETE);
  const property = await assertPropertyAccess(
    propertyId,
    session.user.organizationId,
    session.user.id,
    session.user.roleKey,
  );
  if (!property) {
    return { error: "We could not find that property." };
  }

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      deletedAt: new Date(),
      status: "ARCHIVED",
      updatedById: session.user.id,
    },
  });

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "property.archived",
    entityType: "Property",
    entityId: propertyId,
    summary: `Archived property ${property.nickname}`,
  });

  revalidatePath("/properties");
  revalidatePath("/home");
  redirect("/properties?archived=1");
}

export async function updatePropertyBasicsAction(propertyId: string, formData: FormData) {
  const session = await requirePermission(PERMISSIONS.PROPERTIES_WRITE);
  const property = await assertPropertyAccess(
    propertyId,
    session.user.organizationId,
    session.user.id,
    session.user.roleKey,
  );
  if (!property) return { error: "We could not find that property." };

  const nickname = String(formData.get("nickname") ?? "").trim();
  const streetAddress = String(formData.get("streetAddress") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim().toUpperCase();
  const zipCode = String(formData.get("zipCode") ?? "").trim();

  if (!nickname || !streetAddress || !city || !state || !zipCode) {
    return { error: "Please fill in the required address fields." };
  }

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      nickname,
      streetAddress,
      city,
      state,
      zipCode,
      updatedById: session.user.id,
    },
  });

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "property.updated",
    entityType: "Property",
    entityId: propertyId,
    summary: `Updated property ${nickname}`,
  });

  revalidatePath(`/properties/${propertyId}`);
  redirect(`/properties/${propertyId}?saved=1`);
}

export async function overrideValuationAction(propertyId: string, formData: FormData) {
  const session = await requirePermission(PERMISSIONS.PROPERTIES_WRITE);
  if (!hasPermission(session.user.permissions, PERMISSIONS.PROPERTIES_WRITE)) {
    return { error: "You do not have permission to change property values." };
  }

  const property = await assertPropertyAccess(
    propertyId,
    session.user.organizationId,
    session.user.id,
    session.user.roleKey,
  );
  if (!property) return { error: "We could not find that property." };

  const value = money(String(formData.get("estimatedValue") ?? ""));
  if (value === null) return { error: "Please enter a valid estimated value." };

  await prisma.propertyValuation.create({
    data: {
      propertyId,
      estimatedValue: value,
      source: "Manual override",
      sourceUpdatedAt: new Date(),
      isEstimated: true,
      isManualOverride: true,
      notes: String(formData.get("notes") ?? "") || null,
      createdById: session.user.id,
    },
  });

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "valuation.overridden",
    entityType: "PropertyValuation",
    entityId: propertyId,
    summary: `Manually updated estimated value for ${property.nickname}`,
  });

  revalidatePath(`/properties/${propertyId}`);
  return { success: "Estimated value updated. This is still an estimate, not a guaranteed appraisal." };
}
