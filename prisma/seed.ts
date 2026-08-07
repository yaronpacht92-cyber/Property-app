import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PERMISSION_CATALOG, ROLE_KEYS, ROLE_PERMISSIONS } from "../src/lib/permissions";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log("Seeding Homefolio sample data...");

  await prisma.auditLog.deleteMany();
  await prisma.financialTransactionReference.deleteMany();
  await prisma.accountingPropertyMapping.deleteMany();
  await prisma.accountingConnection.deleteMany();
  await prisma.emailThreadReference.deleteMany();
  await prisma.emailConnection.deleteMany();
  await prisma.integrationSyncLog.deleteMany();
  await prisma.note.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.document.deleteMany();
  await prisma.insurancePolicy.deleteMany();
  await prisma.mortgage.deleteMany();
  await prisma.propertyTaxRecord.deleteMany();
  await prisma.propertyValuation.deleteMany();
  await prisma.propertyContact.deleteMany();
  await prisma.propertyAssignment.deleteMany();
  await prisma.propertyOwnership.deleteMany();
  await prisma.property.deleteMany();
  await prisma.contractor.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.ownershipEntity.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  for (const permission of PERMISSION_CATALOG) {
    await prisma.permission.create({ data: permission });
  }

  const org = await prisma.organization.create({
    data: {
      name: "Pacht Family Properties (Sample)",
      settings: {
        reminderDefaults: { insuranceRenewalDays: [90, 60, 30, 7] },
        isSampleData: true,
      },
    },
  });

  const roles = await Promise.all(
    [
      { key: ROLE_KEYS.ADMIN, name: "Family Administrator" },
      { key: ROLE_KEYS.MEMBER, name: "Family Member" },
      { key: ROLE_KEYS.READ_ONLY, name: "Read-Only User" },
    ].map((role) =>
      prisma.role.create({
        data: {
          organizationId: org.id,
          key: role.key,
          name: role.name,
        },
      }),
    ),
  );

  const permissions = await prisma.permission.findMany();
  for (const role of roles) {
    const keys = ROLE_PERMISSIONS[role.key] ?? [];
    for (const key of keys) {
      const permission = permissions.find((p) => p.key === key);
      if (!permission) continue;
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  const passwordHash = await bcrypt.hash("ChangeMe!Homefolio1", 12);
  const adminRole = roles.find((r) => r.key === ROLE_KEYS.ADMIN)!;
  const memberRole = roles.find((r) => r.key === ROLE_KEYS.MEMBER)!;
  const readOnlyRole = roles.find((r) => r.key === ROLE_KEYS.READ_ONLY)!;

  const admin = await prisma.user.create({
    data: {
      email: "admin@homefolio.local",
      name: "Pat Administrator",
      passwordHash,
      memberships: {
        create: { organizationId: org.id, roleId: adminRole.id },
      },
    },
  });

  const member = await prisma.user.create({
    data: {
      email: "member@homefolio.local",
      name: "Sam Family Member",
      passwordHash,
      memberships: {
        create: { organizationId: org.id, roleId: memberRole.id },
      },
    },
  });

  const reader = await prisma.user.create({
    data: {
      email: "readonly@homefolio.local",
      name: "Riley Read Only",
      passwordHash,
      memberships: {
        create: { organizationId: org.id, roleId: readOnlyRole.id },
      },
    },
  });

  const trust = await prisma.ownershipEntity.create({
    data: {
      organizationId: org.id,
      name: "Pacht Family Trust (Sample)",
      entityType: "Trust",
    },
  });

  const llc = await prisma.ownershipEntity.create({
    data: {
      organizationId: org.id,
      name: "Oak Holdings LLC (Sample)",
      entityType: "LLC",
    },
  });

  const manager = await prisma.contact.create({
    data: {
      organizationId: org.id,
      name: "Jane Lee",
      company: "Harbor Property Management",
      phone: "(512) 555-0142",
      email: "jane@harbormgmt.example",
      notes: "Sample property manager. Prefer texts for non-emergencies.",
    },
  });

  const agent = await prisma.contact.create({
    data: {
      organizationId: org.id,
      name: "Chris Ortega",
      company: "Hill Country Insurance",
      phone: "(512) 555-0199",
      email: "chris@hci.example",
    },
  });

  const contractor = await prisma.contractor.create({
    data: {
      organizationId: org.id,
      name: "Reliable Home Services",
      phone: "(512) 555-0177",
      email: "jobs@reliable.example",
      specialty: "HVAC and plumbing",
    },
  });

  const properties = [
    {
      nickname: "Oak Street Rental",
      propertyType: "RESIDENTIAL" as const,
      streetAddress: "123 Oak Street",
      city: "Austin",
      state: "TX",
      zipCode: "78702",
      ownershipEntityId: llc.id,
      dateAcquired: new Date("2018-04-12"),
      purchasePrice: 365000,
      value: 485000,
      tax: 9200,
      assessed: 410000,
      managerId: manager.id,
      description: "Single-family rental",
    },
    {
      nickname: "Harbor Apartments",
      propertyType: "RESIDENTIAL" as const,
      streetAddress: "880 Harbor Way",
      city: "Austin",
      state: "TX",
      zipCode: "78704",
      ownershipEntityId: trust.id,
      dateAcquired: new Date("2015-09-01"),
      purchasePrice: 1850000,
      value: 2450000,
      tax: 38500,
      assessed: 2100000,
      managerId: manager.id,
      description: "Apartment building",
    },
    {
      nickname: "Pine Commercial",
      propertyType: "COMMERCIAL" as const,
      streetAddress: "450 Pine Boulevard",
      city: "Round Rock",
      state: "TX",
      zipCode: "78664",
      ownershipEntityId: llc.id,
      dateAcquired: new Date("2020-01-20"),
      purchasePrice: 980000,
      value: 1125000,
      tax: 21400,
      assessed: 1000000,
      managerId: manager.id,
      description: "Commercial property",
    },
    {
      nickname: "Maple Vacant Land",
      propertyType: "VACANT_LAND" as const,
      streetAddress: "County Road 42",
      city: "Bastrop",
      state: "TX",
      zipCode: "78602",
      ownershipEntityId: trust.id,
      dateAcquired: new Date("2012-06-15"),
      purchasePrice: 120000,
      value: 210000,
      tax: 1800,
      assessed: 150000,
      managerId: null,
      description: "Vacant land",
    },
    {
      nickname: "Lakeview Vacation Home",
      propertyType: "OTHER" as const,
      streetAddress: "19 Lakeview Lane",
      city: "Marble Falls",
      state: "TX",
      zipCode: "78654",
      ownershipEntityId: trust.id,
      dateAcquired: new Date("2019-07-04"),
      purchasePrice: 540000,
      value: 695000,
      tax: 11200,
      assessed: 620000,
      managerId: manager.id,
      description: "Vacation property",
    },
  ];

  const createdProperties = [];
  for (const item of properties) {
    const property = await prisma.property.create({
      data: {
        organizationId: org.id,
        ownershipEntityId: item.ownershipEntityId,
        nickname: item.nickname,
        propertyType: item.propertyType,
        streetAddress: item.streetAddress,
        city: item.city,
        state: item.state,
        zipCode: item.zipCode,
        dateAcquired: item.dateAcquired,
        purchasePrice: item.purchasePrice,
        isSampleData: true,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
    createdProperties.push(property);

    await prisma.propertyValuation.create({
      data: {
        propertyId: property.id,
        estimatedValue: item.value,
        source: "Sample data (seed)",
        sourceUpdatedAt: new Date(),
        isEstimated: true,
        isManualOverride: false,
        notes: "Estimated sample value — not a guaranteed appraisal.",
        createdById: admin.id,
      },
    });

    await prisma.propertyTaxRecord.create({
      data: {
        propertyId: property.id,
        assessedValue: item.assessed,
        annualTax: item.tax,
        authority: `${item.city} County (sample)`,
        parcelNumber: `SAMPLE-${property.nickname.replace(/\s/g, "").slice(0, 8).toUpperCase()}`,
        jurisdiction: `${item.city}, ${item.state}`,
        dueDate: new Date(new Date().getFullYear(), 11, 31),
        paymentStatus: "DUE",
        source: "Sample data (seed)",
        sourceUpdatedAt: new Date(),
        isManualOverride: true,
      },
    });

    if (item.managerId) {
      await prisma.propertyContact.create({
        data: {
          propertyId: property.id,
          contactId: item.managerId,
          role: "PROPERTY_MANAGER",
          isEmergency: true,
        },
      });
    }

    await prisma.propertyContact.create({
      data: {
        propertyId: property.id,
        contactId: agent.id,
        role: "INSURANCE_AGENT",
      },
    });
  }

  const oak = createdProperties[0];
  const harbor = createdProperties[1];
  const pine = createdProperties[2];
  const vacation = createdProperties[4];

  await prisma.propertyAssignment.create({
    data: { userId: reader.id, propertyId: oak.id },
  });

  await prisma.insurancePolicy.createMany({
    data: [
      {
        propertyId: oak.id,
        carrier: "Hill Country Mutual (Sample)",
        policyNumber: "HCM-100221",
        policyType: "Landlord",
        coverageAmount: 500000,
        premium: 2100,
        effectiveDate: new Date("2025-01-01"),
        renewalDate: daysFromNow(28),
        status: "RENEWAL_COMING_UP",
        agentContactId: agent.id,
      },
      {
        propertyId: harbor.id,
        carrier: "Hill Country Mutual (Sample)",
        policyNumber: "HCM-778812",
        policyType: "Commercial multi-family",
        coverageAmount: 3000000,
        premium: 9800,
        effectiveDate: new Date("2025-03-01"),
        renewalDate: daysFromNow(95),
        status: "ACTIVE",
        agentContactId: agent.id,
      },
      {
        propertyId: vacation.id,
        carrier: "Lakeside Insurance (Sample)",
        policyNumber: "LK-55210",
        policyType: "Homeowners",
        coverageAmount: 750000,
        premium: 3400,
        effectiveDate: new Date("2024-06-01"),
        renewalDate: daysFromNow(-10),
        status: "EXPIRED",
        agentContactId: agent.id,
      },
    ],
  });

  await prisma.mortgage.create({
    data: {
      propertyId: oak.id,
      lender: "Sample Community Bank",
      monthlyPayment: 1850,
      interestRate: 4.25,
      maturityDate: new Date("2048-04-01"),
      status: "active",
    },
  });

  await prisma.maintenanceRecord.createMany({
    data: [
      {
        propertyId: oak.id,
        category: "APPLIANCES",
        workType: "CAPITAL",
        description: "Water heater replaced (sample)",
        completedAt: new Date("2021-08-15"),
        cost: 1800,
        warrantyExpiresAt: new Date("2027-08-15"),
        nextServiceAt: null,
        contractorId: contractor.id,
        createdById: member.id,
      },
      {
        propertyId: oak.id,
        category: "ROOF",
        workType: "CAPITAL",
        description: "Roof replaced (sample)",
        completedAt: new Date("2018-11-02"),
        cost: 14500,
        warrantyExpiresAt: new Date("2033-11-02"),
        contractorId: contractor.id,
        createdById: admin.id,
      },
      {
        propertyId: harbor.id,
        category: "HVAC",
        workType: "ROUTINE",
        description: "HVAC serviced for building A (sample)",
        completedAt: new Date("2025-02-10"),
        cost: 650,
        nextServiceAt: daysFromNow(-5),
        contractorId: contractor.id,
        createdById: member.id,
      },
      {
        propertyId: vacation.id,
        category: "INTERIOR",
        workType: "CAPITAL",
        description: "Kitchen renovated (sample)",
        completedAt: new Date("2019-10-20"),
        cost: 42000,
        createdById: admin.id,
      },
      {
        propertyId: pine.id,
        category: "PLUMBING",
        workType: "REPAIR",
        description: "Plumbing repair completed (sample)",
        completedAt: new Date("2024-05-12"),
        cost: 2400,
        contractorId: contractor.id,
        createdById: member.id,
      },
    ],
  });

  await prisma.reminder.createMany({
    data: [
      {
        organizationId: org.id,
        propertyId: oak.id,
        type: "INSURANCE_RENEWAL",
        title: "Insurance renewal — Oak Street",
        description: "Landlord policy renews soon. Review coverage with your agent.",
        dueDate: daysFromNow(28),
        status: "DUE_SOON",
        assignedToId: admin.id,
      },
      {
        organizationId: org.id,
        propertyId: oak.id,
        type: "PROPERTY_TAX",
        title: "Property tax deadline — Oak Street",
        description: "Annual property taxes are due.",
        dueDate: daysFromNow(40),
        status: "UPCOMING",
        assignedToId: admin.id,
      },
      {
        organizationId: org.id,
        propertyId: harbor.id,
        type: "ROUTINE_MAINTENANCE",
        title: "HVAC follow-up — Harbor Apartments",
        description: "Next recommended HVAC service is overdue.",
        dueDate: daysFromNow(-5),
        status: "OVERDUE",
        assignedToId: member.id,
      },
      {
        organizationId: org.id,
        propertyId: vacation.id,
        type: "INSURANCE_RENEWAL",
        title: "Expired insurance — Lakeview",
        description: "Vacation home policy appears expired. Update or renew.",
        dueDate: daysFromNow(-10),
        status: "OVERDUE",
        assignedToId: admin.id,
      },
    ],
  });

  await prisma.document.createMany({
    data: [
      {
        organizationId: org.id,
        propertyId: oak.id,
        category: "INSURANCE",
        name: "Oak Street Insurance Policy (Sample).pdf",
        storageKey: `${org.id}/sample-oak-insurance.pdf`,
        mimeType: "application/pdf",
        sizeBytes: 20480,
        uploadedById: admin.id,
        scanStatus: "SKIPPED",
        notes: "Sample document record — file placeholder for development.",
      },
      {
        organizationId: org.id,
        propertyId: harbor.id,
        category: "LEASE",
        name: "Harbor Unit Leases Summary (Sample).pdf",
        storageKey: `${org.id}/sample-harbor-lease.pdf`,
        mimeType: "application/pdf",
        sizeBytes: 10240,
        uploadedById: member.id,
        scanStatus: "SKIPPED",
      },
      {
        organizationId: org.id,
        propertyId: pine.id,
        category: "PROPERTY_TAX",
        name: "Pine Commercial Tax Bill (Sample).pdf",
        storageKey: `${org.id}/sample-pine-tax.pdf`,
        mimeType: "application/pdf",
        sizeBytes: 8192,
        uploadedById: admin.id,
        scanStatus: "SKIPPED",
      },
    ],
  });

  await prisma.note.createMany({
    data: [
      {
        propertyId: oak.id,
        authorId: member.id,
        category: "General",
        body: "Tenant reported faucet drip; plumber scheduled next week. (Sample note)",
      },
      {
        propertyId: harbor.id,
        authorId: admin.id,
        category: "Operations",
        body: "New laundry vendor proposal received. Review at next family meeting. (Sample note)",
      },
    ],
  });

  const qb = await prisma.accountingConnection.create({
    data: {
      organizationId: org.id,
      provider: "QUICKBOOKS",
      status: "NOT_CONFIGURED",
      lastError: null,
    },
  });

  await prisma.accountingPropertyMapping.create({
    data: {
      propertyId: oak.id,
      connectionId: qb.id,
      mappingType: "CLASS",
      externalId: "sample-class-oak",
      externalName: "Oak Street (Sample Class)",
    },
  });

  await prisma.financialTransactionReference.createMany({
    data: [
      {
        organizationId: org.id,
        propertyId: oak.id,
        connectionId: qb.id,
        externalTxnId: "sample-txn-rent-1",
        amount: 2400,
        txnDate: new Date(),
        category: "Rental income",
        memo: "Sample rent deposit",
        matched: true,
      },
      {
        organizationId: org.id,
        propertyId: null,
        connectionId: qb.id,
        externalTxnId: "sample-txn-unmatched-1",
        amount: -185,
        txnDate: daysFromNow(-3),
        category: "Repairs",
        memo: "Sample unmatched expense",
        matched: false,
      },
    ],
  });

  const email = await prisma.emailConnection.create({
    data: {
      organizationId: org.id,
      provider: "GMAIL",
      status: "NOT_CONFIGURED",
      accountEmail: null,
    },
  });

  await prisma.emailThreadReference.create({
    data: {
      organizationId: org.id,
      propertyId: oak.id,
      connectionId: email.id,
      externalThreadId: "sample-thread-oak-1",
      subject: "Sample: Water heater warranty paperwork",
      snippet: "Attached is the warranty for the Oak Street water heater.",
      sender: "jobs@reliable.example",
      receivedAt: daysFromNow(-12),
      category: "MAINTENANCE",
      isImportant: true,
      matchMethod: "sample-seed",
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      actorUserId: admin.id,
      action: "seed.completed",
      entityType: "Organization",
      entityId: org.id,
      summary: "Sample data loaded for development.",
      metadata: { sample: true },
    },
  });

  console.log("Seed complete.");
  console.log("Demo logins (sample data):");
  console.log("  admin@homefolio.local / ChangeMe!Homefolio1");
  console.log("  member@homefolio.local / ChangeMe!Homefolio1");
  console.log("  readonly@homefolio.local / ChangeMe!Homefolio1");
}

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
