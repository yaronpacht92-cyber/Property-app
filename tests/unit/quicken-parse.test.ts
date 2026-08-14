import { describe, expect, it } from "vitest";
import {
  parseOfxOrQfx,
  parseQif,
  parseQuickenCsv,
  parseQuickenFile,
} from "@/adapters/accounting/parsers/quicken";
import { matchQuickenTransaction } from "@/services/quicken-match";

const sampleOfx = `OFXHEADER:100
DATA:OFXSGML
VERSION:102

<OFX>
  <BANKACCTFROM>
    <ACCTID>Oak Street Rental
    <ACCTTYPE>CHECKING
  </BANKACCTFROM>
  <BANKTRANLIST>
    <STMTTRN>
      <TRNTYPE>CREDIT
      <DTPOSTED>20260801120000
      <TRNAMT>2400.00
      <FITID>rent-1
      <NAME>Tenant
      <MEMO>August rent Oak Street
    </STMTTRN>
    <STMTTRN>
      <TRNTYPE>DEBIT
      <DTPOSTED>20260805120000
      <TRNAMT>-120.50
      <FITID>repair-1
      <NAME>Plumber
      <MEMO>Sink repair
    </STMTTRN>
  </BANKTRANLIST>
</OFX>
`;

describe("quicken parsers", () => {
  it("parses OFX statement transactions", () => {
    const parsed = parseOfxOrQfx(sampleOfx, "OFX");
    expect(parsed.accountName).toContain("Oak Street Rental");
    expect(parsed.transactions).toHaveLength(2);
    expect(parsed.transactions[0]).toMatchObject({
      externalTxnId: "rent-1",
      amount: 2400,
      payee: "Tenant",
    });
    expect(parsed.transactions[1].amount).toBe(-120.5);
  });

  it("parses QIF registers", () => {
    const qif = `!Type:Bank
D08/01/2026
T2400.00
PTenant rent
MOak Street deposit
LRental Income
^
D08/03/2026
T-45.00
PHardware store
LRepairs
^
`;
    const parsed = parseQif(qif);
    expect(parsed.transactions).toHaveLength(2);
    expect(parsed.transactions[0].amount).toBe(2400);
    expect(parsed.transactions[0].category).toBe("Rental Income");
    expect(parsed.transactions[1].amount).toBe(-45);
  });

  it("parses Quicken-style CSV", () => {
    const csv = `Date,Amount,Payee,Category,Memo,Account
08/01/2026,2400.00,Tenant,Rental Income,August rent,Oak Street Rental
08/02/2026,-90.00,Utility Co,Utilities,Electric,Oak Street Rental
`;
    const parsed = parseQuickenCsv(csv);
    expect(parsed.transactions).toHaveLength(2);
    expect(parsed.accountName).toBe("Oak Street Rental");
    expect(parsed.transactions[1].category).toBe("Utilities");
  });

  it("detects format from filename", () => {
    const parsed = parseQuickenFile("export.qfx", sampleOfx);
    expect(parsed.format).toBe("QFX");
    expect(parsed.transactions.length).toBeGreaterThan(0);
  });
});

describe("quicken matching", () => {
  const properties = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      nickname: "Oak Street",
      streetAddress: "123 Oak Street",
      city: "Austin",
      zipCode: "78701",
      accountNames: ["Oak Street Rental"],
      categories: ["Repairs:Oak"],
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      nickname: "Lake House",
      streetAddress: "9 Lake View",
      city: "Austin",
      zipCode: "78703",
      accountNames: ["Lake House Checking"],
      categories: [],
    },
  ];

  it("matches by Quicken account mapping", () => {
    const result = matchQuickenTransaction(
      {
        accountName: "Oak Street Rental",
        category: "Rental Income",
        payee: "Tenant",
        memo: "August",
      },
      properties,
    );
    expect(result.matchMethod).toBe("quicken_account");
    expect(result.propertyId).toBe(properties[0].id);
  });

  it("matches by nickname in memo when no mapping hits", () => {
    const result = matchQuickenTransaction(
      {
        accountName: "Joint Checking",
        category: "Misc",
        payee: "Store",
        memo: "Supplies for Lake House",
      },
      properties,
    );
    expect(result.matchMethod).toBe("nickname");
    expect(result.propertyId).toBe(properties[1].id);
  });
});
