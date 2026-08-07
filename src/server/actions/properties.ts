"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission, assertPropertyAccess } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { hasPermission } from "@/lib/auth";

const ownerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  ownershipPercent: z.string().optional(),
});

const basicSchema = z.object({
  nickname: z.string().min(2).max(120),
  streetAddress: z.string().min(3).max(200),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(2),
  zipCode: z.string().min(5).max(10),
  propertyType: z.enum(["RESIDENTIAL", "COMMERCIAL", "VACANT_LAND", "OTHER"]),
  ownershipMode: z.enum(["existing", "new", "none"]).optional(),
  ownershipEntityId: z.string().uuid().optional().or(z.literal("")),
  newEntityName: z.string().optional(),
  newEntityType: z.string().optional(),
  dateAcquired: z.string().optional(),
  purchasePrice: z.string().optional(),
  monthlyRent: z.string().optional(),
  leaseLengthMonths: z.string().optional(),
  leaseExpiresAt: z.string().optional(),
  monthlyManagementFee: z.string().optional(),
  otherMonthlyExpenses: z.string().optional(),
  estimatedValue: z.string().optional(),
  assessedValue: z.string().optional(),
  annualTaxes: z.string().optional(),
  taxJurisdiction: z.string().optional(),
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional(),
  squareFootage: z.string().optional(),
  lotSizeSqFt: z.string().optional(),
  yearBuilt: z.string().optional(),
  managerName: z.string().optional(),
  managerCompany: z.string().optional(),
  managerPhone: z.string().optional(),
  managerEmail: z.string().email().optional().or(z.literal("")),
  insuranceCarrier: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  insuranceRenewalDate: z.string().optional(),
  ownersJson: z.string().optional(),
});

function money(value?: string) {
  if (!value) return null;
  const n = Number(value.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function months(value?: string) {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function intOrNull(value?: string) {
  if (!value?.trim()) return null;
  const n = Number.parseInt(value.replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function decimalOrNull(value?: string) {
  if (!value?.trim()) return null;
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseOwners(raw?: string) {
  if (!raw) return [] as z.infer<typeof ownerSchema>[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ownerSchema.safeParse(item))
      .filter((result) => result.success)
      .map((result) => result.data);
  } catch {
    return [];
  }
}

async function resolveOwnershipEntityId(input: {
  organizationId: string;
  ownershipMode?: string;
  ownershipEntityId?: string;
  newEntityName?: string;
  newEntityType?: string;
}) {
  if (input.ownershipMode === "none") return null;

  if (input.ownershipMode === "new" && input.newEntityName?.trim()) {
    const entity = await prisma.ownershipEntity.create({
      data: {
        organizationId: input.organizationId,
        name: input.newEntityName.trim(),
        entityType: input.newEntityType?.trim() || null,
      },
    });
    return entity.id;
  }

  if (input.ownershipEntityId) {
    const entity = await prisma.ownershipEntity.findFirst({
      where: {
        id: input.ownershipEntityId,
        organizationId: input.organizationId,
        deletedAt: null,
      },
    });
    return entity?.id ?? null;
  }

  return null;
}

async function replaceOwners(
  propertyId: string,
  owners: z.infer<typeof ownerSchema>[],
) {
  await prisma.propertyOwner.deleteMany({ where: { propertyId } });
  if (!owners.length) return;

  await prisma.propertyOwner.createMany({
    data: owners.map((owner) => ({
      propertyId,
      name: owner.name.trim(),
      email: owner.email || null,
      phone: owner.phone || null,
      ownershipPercent: money(owner.ownershipPercent),
    })),
  });
}

export async function createPropertyAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.PROPERTIES_WRITE);
  const raw = Object.fromEntries(formData.entries());
  const parsed = basicSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please check the property details and try again." };
  }

  const data = parsed.data;
  const ownershipEntityId = await resolveOwnershipEntityId({
    organizationId: session.user.organizationId,
    ownershipMode: data.ownershipMode,
    ownershipEntityId: data.ownershipEntityId,
    newEntityName: data.newEntityName,
    newEntityType: data.newEntityType,
  });

  const property = await prisma.property.create({
    data: {
      organizationId: session.user.organizationId,
      nickname: data.nickname,
      streetAddress: data.streetAddress,
      city: data.city,
      state: data.state.toUpperCase(),
      zipCode: data.zipCode,
      propertyType: data.propertyType,
      ownershipEntityId,
      dateAcquired: data.dateAcquired ? new Date(data.dateAcquired) : null,
      purchasePrice: money(data.purchasePrice),
      monthlyRent: money(data.monthlyRent),
      leaseLengthMonths: months(data.leaseLengthMonths),
      leaseExpiresAt: data.leaseExpiresAt ? new Date(data.leaseExpiresAt) : null,
      monthlyManagementFee: money(data.monthlyManagementFee),
      otherMonthlyExpenses: money(data.otherMonthlyExpenses),
      bedrooms: intOrNull(data.bedrooms),
      bathrooms: decimalOrNull(data.bathrooms),
      squareFootage: intOrNull(data.squareFootage),
      lotSizeSqFt: intOrNull(data.lotSizeSqFt),
      yearBuilt: intOrNull(data.yearBuilt),
      createdById: session.user.id,
      updatedById: session.user.id,
    },
  });

  if (ownershipEntityId) {
    await prisma.propertyOwnership.create({
      data: {
        propertyId: property.id,
        ownershipEntityId,
        ownershipPercent: 100,
        startDate: data.dateAcquired ? new Date(data.dateAcquired) : new Date(),
      },
    });
  }

  await replaceOwners(property.id, parseOwners(data.ownersJson));

  if (data.leaseExpiresAt) {
    const due = new Date(data.leaseExpiresAt);
    if (due > new Date()) {
      await prisma.reminder.create({
        data: {
          organizationId: session.user.organizationId,
          propertyId: property.id,
          type: "LEASE_EXPIRATION",
          title: `Lease expires — ${property.nickname}`,
          description: "Review or renew the lease before it ends.",
          dueDate: due,
          status:
            due.getTime() - Date.now() < 1000 * 60 * 60 * 24 * 30 ? "DUE_SOON" : "UPCOMING",
          assignedToId: session.user.id,
        },
      });
    }
  }

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
    await prisma.insurancePolicy.create({
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
  revalidatePath("/financials");
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
  revalidatePath("/financials");
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
  const ownershipMode = String(formData.get("ownershipMode") ?? "existing");
  const ownershipEntityIdRaw = String(formData.get("ownershipEntityId") ?? "");
  const newEntityName = String(formData.get("newEntityName") ?? "");
  const newEntityType = String(formData.get("newEntityType") ?? "");
  const monthlyRent = money(String(formData.get("monthlyRent") ?? ""));
  const leaseLengthMonths = months(String(formData.get("leaseLengthMonths") ?? ""));
  const leaseExpiresAtRaw = String(formData.get("leaseExpiresAt") ?? "");
  const monthlyManagementFee = money(String(formData.get("monthlyManagementFee") ?? ""));
  const otherMonthlyExpenses = money(String(formData.get("otherMonthlyExpenses") ?? ""));
  const bedrooms = intOrNull(String(formData.get("bedrooms") ?? ""));
  const bathrooms = decimalOrNull(String(formData.get("bathrooms") ?? ""));
  const squareFootage = intOrNull(String(formData.get("squareFootage") ?? ""));
  const lotSizeSqFt = intOrNull(String(formData.get("lotSizeSqFt") ?? ""));
  const yearBuilt = intOrNull(String(formData.get("yearBuilt") ?? ""));
  const ownersJson = String(formData.get("ownersJson") ?? "[]");

  if (!nickname || !streetAddress || !city || !state || !zipCode) {
    return { error: "Please fill in the required address fields." };
  }

  const ownershipEntityId = await resolveOwnershipEntityId({
    organizationId: session.user.organizationId,
    ownershipMode,
    ownershipEntityId: ownershipEntityIdRaw,
    newEntityName,
    newEntityType,
  });

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      nickname,
      streetAddress,
      city,
      state,
      zipCode,
      ownershipEntityId,
      monthlyRent,
      leaseLengthMonths,
      leaseExpiresAt: leaseExpiresAtRaw ? new Date(leaseExpiresAtRaw) : null,
      monthlyManagementFee,
      otherMonthlyExpenses,
      bedrooms,
      bathrooms,
      squareFootage,
      lotSizeSqFt,
      yearBuilt,
      updatedById: session.user.id,
    },
  });

  await replaceOwners(propertyId, parseOwners(ownersJson));

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "property.updated",
    entityType: "Property",
    entityId: propertyId,
    summary: `Updated property ${nickname}`,
  });

  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/financials");
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
      source: "Manual entry",
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

export async function upsertPropertyManagerAction(propertyId: string, formData: FormData) {
  const session = await requirePermission(PERMISSIONS.PROPERTIES_WRITE);
  const property = await assertPropertyAccess(
    propertyId,
    session.user.organizationId,
    session.user.id,
    session.user.roleKey,
  );
  if (!property) return { error: "We could not find that property." };

  const name = String(formData.get("name") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const emailRaw = String(formData.get("email") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (name.length < 2) {
    return { error: "Please enter the property manager’s name." };
  }

  let email: string | null = null;
  if (emailRaw) {
    const emailCheck = z.string().email().safeParse(emailRaw);
    if (!emailCheck.success) {
      return { error: "Please enter a valid email address, or leave email blank." };
    }
    email = emailCheck.data;
  }

  const existing = await prisma.propertyContact.findFirst({
    where: { propertyId, role: "PROPERTY_MANAGER" },
    include: { contact: true },
  });

  if (existing) {
    await prisma.contact.update({
      where: { id: existing.contactId },
      data: {
        name,
        company: company || null,
        phone: phone || null,
        email,
        notes: notes || null,
      },
    });
    await prisma.propertyContact.update({
      where: { id: existing.id },
      data: { isEmergency: true },
    });
  } else {
    const contact = await prisma.contact.create({
      data: {
        organizationId: session.user.organizationId,
        name,
        company: company || null,
        phone: phone || null,
        email,
        notes: notes || null,
      },
    });
    await prisma.propertyContact.create({
      data: {
        propertyId,
        contactId: contact.id,
        role: "PROPERTY_MANAGER",
        isEmergency: true,
      },
    });
  }

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: existing ? "property.manager_updated" : "property.manager_added",
    entityType: "Property",
    entityId: propertyId,
    summary: `${existing ? "Updated" : "Added"} property manager ${name} for ${property.nickname}`,
  });

  revalidatePath(`/properties/${propertyId}`);
  revalidatePath(`/properties/${propertyId}/contact-manager`);
  revalidatePath("/properties");
  revalidatePath("/home");
  return {
    success: existing
      ? "Property manager updated."
      : "Property manager added.",
  };
}
