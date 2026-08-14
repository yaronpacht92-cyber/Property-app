import { prisma } from "@/lib/db";
import {
  parseQuickenFile,
  type ParsedQuickenTransaction,
} from "@/adapters/accounting/parsers/quicken";
import {
  matchQuickenTransaction,
  type QuickenMatchProperty,
} from "@/services/quicken-match";

async function loadMatchProperties(organizationId: string): Promise<QuickenMatchProperty[]> {
  const properties = await prisma.property.findMany({
    where: { organizationId, deletedAt: null },
    select: {
      id: true,
      nickname: true,
      streetAddress: true,
      city: true,
      zipCode: true,
      accountingMappings: {
        select: { mappingType: true, externalId: true, externalName: true },
      },
    },
  });

  return properties.map((property) => {
    const accountNames: string[] = [];
    const categories: string[] = [];
    for (const mapping of property.accountingMappings) {
      const label = mapping.externalName || mapping.externalId;
      if (mapping.mappingType === "ACCOUNT") accountNames.push(label);
      else categories.push(label);
    }
    return {
      id: property.id,
      nickname: property.nickname,
      streetAddress: property.streetAddress,
      city: property.city,
      zipCode: property.zipCode,
      accountNames,
      categories,
    };
  });
}

function memoFor(txn: ParsedQuickenTransaction) {
  const parts = [txn.payee, txn.memo].filter(Boolean);
  return parts.join(" — ").slice(0, 500);
}

export type QuickenImportResult = {
  processed: number;
  matched: number;
  unmatched: number;
  format: string;
  accountName: string;
  connectionId: string;
};

export async function ensureQuickenConnection(organizationId: string) {
  const existing = await prisma.accountingConnection.findFirst({
    where: { organizationId, provider: "QUICKEN" },
  });
  if (existing) {
    return prisma.accountingConnection.update({
      where: { id: existing.id },
      data: {
        status: "CONNECTED",
        lastError: null,
      },
    });
  }

  // Soft-migrate legacy QuickBooks stub row if present.
  const legacy = await prisma.accountingConnection.findFirst({
    where: { organizationId, provider: "QUICKBOOKS" },
  });
  if (legacy) {
    return prisma.accountingConnection.update({
      where: { id: legacy.id },
      data: {
        provider: "QUICKEN",
        status: "CONNECTED",
        lastError: null,
        realmId: legacy.realmId || "Quicken",
      },
    });
  }

  return prisma.accountingConnection.create({
    data: {
      organizationId,
      provider: "QUICKEN",
      status: "CONNECTED",
      realmId: "Quicken",
      lastError: null,
    },
  });
}

export async function importQuickenFile(options: {
  organizationId: string;
  connectionId: string;
  filename: string;
  content: string;
}): Promise<QuickenImportResult> {
  const connection = await prisma.accountingConnection.findFirst({
    where: {
      id: options.connectionId,
      organizationId: options.organizationId,
      provider: "QUICKEN",
    },
  });
  if (!connection) {
    throw new Error("Quicken connection not found.");
  }

  const startedAt = new Date();
  const log = await prisma.integrationSyncLog.create({
    data: {
      organizationId: options.organizationId,
      connectionType: "QUICKEN",
      connectionId: connection.id,
      status: "RUNNING",
      startedAt,
    },
  });

  try {
    const parsed = parseQuickenFile(options.filename, options.content);
    const properties = await loadMatchProperties(options.organizationId);
    let matched = 0;
    let unmatched = 0;

    for (const txn of parsed.transactions) {
      const existing = await prisma.financialTransactionReference.findUnique({
        where: {
          connectionId_externalTxnId: {
            connectionId: connection.id,
            externalTxnId: txn.externalTxnId,
          },
        },
      });

      const match = matchQuickenTransaction(txn, properties);
      if (match.propertyId) matched += 1;
      else unmatched += 1;

      // Preserve manual assignments.
      const preserveManual = existing?.matched && existing.propertyId;
      const propertyId = preserveManual ? existing.propertyId : match.propertyId;
      const isMatched = Boolean(propertyId);

      await prisma.financialTransactionReference.upsert({
        where: {
          connectionId_externalTxnId: {
            connectionId: connection.id,
            externalTxnId: txn.externalTxnId,
          },
        },
        create: {
          organizationId: options.organizationId,
          connectionId: connection.id,
          externalTxnId: txn.externalTxnId,
          amount: txn.amount,
          txnDate: txn.txnDate,
          category: txn.category || null,
          memo: memoFor(txn) || null,
          propertyId,
          matched: isMatched,
        },
        update: {
          amount: txn.amount,
          txnDate: txn.txnDate,
          category: txn.category || null,
          memo: memoFor(txn) || null,
          propertyId,
          matched: isMatched,
        },
      });
    }

    await prisma.accountingConnection.update({
      where: { id: connection.id },
      data: {
        status: "CONNECTED",
        lastSyncAt: new Date(),
        lastError: null,
        realmId: parsed.accountName.slice(0, 120),
      },
    });

    await prisma.integrationSyncLog.update({
      where: { id: log.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        recordsProcessed: parsed.transactions.length,
        message: `Imported ${parsed.transactions.length} ${parsed.format} transactions (${matched} matched, ${unmatched} unmatched).`,
      },
    });

    return {
      processed: parsed.transactions.length,
      matched,
      unmatched,
      format: parsed.format,
      accountName: parsed.accountName,
      connectionId: connection.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Quicken import failed.";
    await prisma.accountingConnection.update({
      where: { id: connection.id },
      data: { status: "ERROR", lastError: message.slice(0, 500) },
    });
    await prisma.integrationSyncLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        message: message.slice(0, 500),
      },
    });
    throw error;
  }
}

/** Sample OFX used for local demos when the family has not exported from Quicken yet. */
export function sampleQuickenOfx(propertyHints: Array<{ nickname: string; streetAddress: string }>) {
  const hint = propertyHints[0];
  const nickname = hint?.nickname || "Sample Property";
  const street = hint?.streetAddress || "123 Main St";
  const today = new Date();
  const yyyymmdd = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}${m}${day}120000`;
  };

  return `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
  <SIGNONMSGSRSV1>
    <SONRS>
      <STATUS><CODE>0<SEVERITY>INFO</STATUS>
      <DTSERVER>${yyyymmdd(0)}
      <LANGUAGE>ENG
    </SONRS>
  </SIGNONMSGSRSV1>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <TRNUID>1
      <STATUS><CODE>0<SEVERITY>INFO</STATUS>
      <STMTRS>
        <CURDEF>USD
        <BANKACCTFROM>
          <BANKID>000000000
          <ACCTID>Pachtfolio Rental Checking
          <ACCTTYPE>CHECKING
        </BANKACCTFROM>
        <BANKTRANLIST>
          <DTSTART>${yyyymmdd(-40)}
          <DTEND>${yyyymmdd(0)}
          <STMTTRN>
            <TRNTYPE>CREDIT
            <DTPOSTED>${yyyymmdd(-5)}
            <TRNAMT>2400.00
            <FITID>demo-rent-1
            <NAME>Tenant rent
            <MEMO>Rent deposit for ${nickname}
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT
            <DTPOSTED>${yyyymmdd(-3)}
            <TRNAMT>-185.50
            <FITID>demo-repair-1
            <NAME>Reliable Plumbing
            <MEMO>Repair at ${street}
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT
            <DTPOSTED>${yyyymmdd(-1)}
            <TRNAMT>-92.00
            <FITID>demo-unmatched-1
            <NAME>Office Supplies Co
            <MEMO>General supplies
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>
`;
}
