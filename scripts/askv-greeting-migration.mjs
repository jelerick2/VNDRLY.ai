const APPROVED_STATEMENTS = [
  'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "askv_last_full_greeting_on" text',
];

function normalizeStatement(statement) {
  return statement.trim().replace(/\s+/g, " ");
}

export function parseAskVGreetingMigration(sqlText) {
  const statements = String(sqlText)
    .split(";")
    .map(normalizeStatement)
    .filter(Boolean);
  if (
    statements.length !== APPROVED_STATEMENTS.length ||
    statements.some((statement, index) => statement !== APPROVED_STATEMENTS[index])
  ) {
    throw new Error(
      "Migration must contain exactly the approved additive askv_last_full_greeting_on statement",
    );
  }
  return statements;
}

export async function runAskVGreetingMigration(client, sqlText) {
  const statements = parseAskVGreetingMigration(sqlText);
  for (const statement of statements) {
    await client.query(statement);
  }
}
