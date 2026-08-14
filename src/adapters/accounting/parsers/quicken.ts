export type ParsedQuickenTransaction = {
  externalTxnId: string;
  amount: number;
  txnDate: Date;
  payee: string;
  memo: string;
  category: string;
  accountName: string;
};

export type QuickenParseResult = {
  format: "OFX" | "QFX" | "QIF" | "CSV";
  accountName: string;
  transactions: ParsedQuickenTransaction[];
};

export function detectQuickenFormat(filename: string, content: string): QuickenParseResult["format"] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".qfx")) return "QFX";
  if (lower.endsWith(".ofx")) return "OFX";
  if (lower.endsWith(".qif")) return "QIF";
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    if (content.includes("!Type:") || content.includes("!Account")) return "QIF";
    if (/OFXHEADER:|<\s*OFX/i.test(content)) return content.includes("INTU.BID") ? "QFX" : "OFX";
    return "CSV";
  }
  if (content.includes("!Type:") || content.includes("!Account")) return "QIF";
  if (/OFXHEADER:|<\s*OFX/i.test(content)) return content.includes("INTU.BID") ? "QFX" : "OFX";
  return "CSV";
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function hashId(parts: string[]) {
  let hash = 0;
  const input = parts.join("|");
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return `q-${hash.toString(16)}`;
}

function parseOfxDate(value: string): Date {
  const digits = value.replace(/[^\d]/g, "").slice(0, 8);
  if (digits.length !== 8) return new Date();
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6)) - 1;
  const day = Number(digits.slice(6, 8));
  return new Date(Date.UTC(year, month, day));
}

function tagValue(block: string, tag: string): string {
  const re = new RegExp(`<${tag}>([^<\\n\\r]*)`, "i");
  const match = block.match(re);
  return match?.[1]?.trim() || "";
}

export function parseOfxOrQfx(content: string, format: "OFX" | "QFX"): QuickenParseResult {
  const accountName =
    tagValue(content, "ACCTID") ||
    tagValue(content, "ORG") ||
    tagValue(content, "BANKID") ||
    "Quicken account";

  const blocks = content.split(/<STMTTRN>/i).slice(1);
  const transactions: ParsedQuickenTransaction[] = [];

  for (const raw of blocks) {
    const block = raw.split(/<\/STMTTRN>/i)[0] || raw;
    const amount = Number(tagValue(block, "TRNAMT"));
    if (Number.isNaN(amount)) continue;
    const fitid = tagValue(block, "FITID");
    const name = tagValue(block, "NAME") || tagValue(block, "PAYEE");
    const memo = tagValue(block, "MEMO");
    const trntype = tagValue(block, "TRNTYPE");
    const date = parseOfxDate(tagValue(block, "DTPOSTED"));
    const externalTxnId =
      fitid ||
      hashId([accountName, date.toISOString().slice(0, 10), String(amount), name, memo]);

    transactions.push({
      externalTxnId,
      amount,
      txnDate: date,
      payee: normalizeWhitespace(name),
      memo: normalizeWhitespace(memo || trntype),
      category: normalizeWhitespace(trntype || "Uncategorized"),
      accountName: normalizeWhitespace(accountName),
    });
  }

  return { format, accountName: normalizeWhitespace(accountName), transactions };
}

export function parseQif(content: string): QuickenParseResult {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let accountName = "Quicken account";
  const transactions: ParsedQuickenTransaction[] = [];
  let current: Partial<ParsedQuickenTransaction> & { category?: string } = {};

  const flush = () => {
    if (current.amount === undefined || !current.txnDate) {
      current = {};
      return;
    }
    const payee = current.payee || "";
    const memo = current.memo || "";
    const category = current.category || "Uncategorized";
    const externalTxnId =
      current.externalTxnId ||
      hashId([
        accountName,
        current.txnDate.toISOString().slice(0, 10),
        String(current.amount),
        payee,
        memo,
        category,
      ]);
    transactions.push({
      externalTxnId,
      amount: current.amount,
      txnDate: current.txnDate,
      payee: normalizeWhitespace(payee),
      memo: normalizeWhitespace(memo),
      category: normalizeWhitespace(category),
      accountName: normalizeWhitespace(accountName),
    });
    current = {};
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("!Account")) continue;
    if (line.startsWith("N") && accountName === "Quicken account" && !current.txnDate) {
      // Account name header in QIF account list / register
      accountName = line.slice(1).trim() || accountName;
      continue;
    }
    if (line.startsWith("!Type:")) continue;
    if (line === "^") {
      flush();
      continue;
    }
    const code = line[0];
    const value = line.slice(1).trim();
    switch (code) {
      case "D": {
        // Quicken dates often MM/DD/YY or MM/DD'YY
        const cleaned = value.replace(/'/g, "/");
        const parts = cleaned.split(/[\/\-]/);
        if (parts.length >= 3) {
          let year = Number(parts[2]);
          if (year < 100) year += year >= 70 ? 1900 : 2000;
          const month = Number(parts[0]) - 1;
          const day = Number(parts[1]);
          current.txnDate = new Date(Date.UTC(year, month, day));
        }
        break;
      }
      case "T":
      case "U":
        current.amount = Number(value.replace(/,/g, ""));
        break;
      case "P":
        current.payee = value;
        break;
      case "M":
        current.memo = value;
        break;
      case "L":
        current.category = value.replace(/^\[|\]$/g, "");
        break;
      case "N":
        current.externalTxnId = value;
        break;
      default:
        break;
    }
  }
  flush();

  return { format: "QIF", accountName: normalizeWhitespace(accountName), transactions };
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function findHeaderIndex(headers: string[], candidates: string[]) {
  const normalized = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate);
    if (idx >= 0) return idx;
  }
  return -1;
}

export function parseQuickenCsv(content: string): QuickenParseResult {
  const lines = content.replace(/\r\n/g, "\n").split("\n").filter((line) => line.trim());
  if (lines.length < 2) {
    return { format: "CSV", accountName: "Quicken account", transactions: [] };
  }

  const headers = splitCsvLine(lines[0]);
  const dateIdx = findHeaderIndex(headers, ["date", "trandate", "posteddate"]);
  const amountIdx = findHeaderIndex(headers, ["amount", "trnamount", "sum"]);
  const payeeIdx = findHeaderIndex(headers, ["payee", "description", "name", "payeename"]);
  const memoIdx = findHeaderIndex(headers, ["memo", "notes", "reference"]);
  const categoryIdx = findHeaderIndex(headers, ["category", "categorization", "tags", "tag"]);
  const accountIdx = findHeaderIndex(headers, ["account", "accountname", "acct"]);
  const idIdx = findHeaderIndex(headers, ["fitid", "id", "transactionid", "refnumber"]);

  if (dateIdx < 0 || amountIdx < 0) {
    throw new Error(
      "CSV must include Date and Amount columns (Quicken export or similar spreadsheet).",
    );
  }

  let accountName = "Quicken account";
  const transactions: ParsedQuickenTransaction[] = [];

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    if (!cells.length || cells.every((c) => !c)) continue;
    const amount = Number((cells[amountIdx] || "").replace(/[$,]/g, ""));
    if (Number.isNaN(amount)) continue;
    const dateRaw = cells[dateIdx] || "";
    const parsedDate = new Date(dateRaw);
    const txnDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    const payee = cells[payeeIdx] || "";
    const memo = cells[memoIdx] || "";
    const category = cells[categoryIdx] || "Uncategorized";
    const rowAccount = cells[accountIdx] || accountName;
    if (cells[accountIdx]) accountName = cells[accountIdx];
    const externalTxnId =
      cells[idIdx] ||
      hashId([
        rowAccount,
        txnDate.toISOString().slice(0, 10),
        String(amount),
        payee,
        memo,
        category,
      ]);

    transactions.push({
      externalTxnId,
      amount,
      txnDate,
      payee: normalizeWhitespace(payee),
      memo: normalizeWhitespace(memo),
      category: normalizeWhitespace(category),
      accountName: normalizeWhitespace(rowAccount),
    });
  }

  return { format: "CSV", accountName: normalizeWhitespace(accountName), transactions };
}

export function parseQuickenFile(filename: string, content: string): QuickenParseResult {
  const format = detectQuickenFormat(filename, content);
  if (format === "QIF") return parseQif(content);
  if (format === "CSV") return parseQuickenCsv(content);
  return parseOfxOrQfx(content, format);
}
