import { google } from "googleapis";

function auth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !privateKey) throw new Error("Google service account credentials are missing.");
  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function spreadsheetId() {
  if (!process.env.GOOGLE_SHEETS_ID) throw new Error("GOOGLE_SHEETS_ID is missing.");
  return process.env.GOOGLE_SHEETS_ID;
}

const SALES_HEADERS = [
  "Reference","Submission time","Salesperson","Customer","Project","Description","Amount",
  "Proposed Richard %","Proposed Anastasia %","Proposed Jean-Claude %",
  "Approved Richard %","Approved Anastasia %","Approved Jean-Claude %",
  "Richard commission","Anastasia commission","Jean-Claude commission","Status"
];

const EXPENSE_HEADERS = [
  "Reference","Submission time","Reporter","Description","Category","Amount",
  "Proposed allocation","Final allocation","Status"
];

async function ensureTabsAndHeaders(sheets) {
  const id = spreadsheetId();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: id });
  const titles = meta.data.sheets?.map((s) => s.properties?.title) || [];
  const requests = [];
  if (!titles.includes("Sales")) requests.push({ addSheet: { properties: { title: "Sales" } } });
  if (!titles.includes("Expenses")) requests.push({ addSheet: { properties: { title: "Expenses" } } });
  if (requests.length) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: id, requestBody: { requests } });
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: id, range: "Sales!A1:Q1", valueInputOption: "RAW",
    requestBody: { values: [SALES_HEADERS] }
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: id, range: "Expenses!A1:I1", valueInputOption: "RAW",
    requestBody: { values: [EXPENSE_HEADERS] }
  });
}

async function upsertRow(tab, values) {
  const sheets = google.sheets({ version: "v4", auth: auth() });
  await ensureTabsAndHeaders(sheets);
  const id = spreadsheetId();

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${tab}!A2:A`,
  });
  const refs = existing.data.values?.flat() || [];
  const ref = values[0];
  const idx = refs.findIndex((x) => x === ref);

  if (idx >= 0) {
    const row = idx + 2;
    const lastCol = tab === "Sales" ? "Q" : "I";
    await sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: `${tab}!A${row}:${lastCol}${row}`,
      valueInputOption: "RAW",
      requestBody: { values: [values] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: id,
      range: `${tab}!A:A`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [values] },
    });
  }
}

export async function syncSale(sale) {
  return upsertRow("Sales", [
    sale.reference,
    sale.submitted_at,
    sale.salesperson,
    sale.customer,
    sale.project,
    sale.description,
    Number(sale.amount),
    Number(sale.proposed_richard_pct),
    Number(sale.proposed_anastasia_pct),
    Number(sale.proposed_jean_claude_pct),
    sale.approved_richard_pct ?? "",
    sale.approved_anastasia_pct ?? "",
    sale.approved_jean_claude_pct ?? "",
    Number(sale.richard_commission || 0),
    Number(sale.anastasia_commission || 0),
    Number(sale.jean_claude_commission || 0),
    sale.status,
  ]);
}

export async function syncExpense(expense) {
  return upsertRow("Expenses", [
    expense.reference,
    expense.submitted_at,
    expense.reporter,
    expense.description,
    expense.category,
    Number(expense.amount),
    expense.proposed_allocation,
    expense.final_allocation ?? "",
    expense.status,
  ]);
}
