const APPROVED_STATEMENTS = [
  'ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "notes" text',
  'ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "check_out_notes" text',
  'ALTER TABLE "site_visits" ADD COLUMN IF NOT EXISTS "admission_status" text',
];

function normalizeStatement(statement) {
  return statement.trim().replace(/\s+/g, " ");
}

export function parseNotesAdmissionMigration(sqlText) {
  const statements = String(sqlText)
    .split(";")
    .map(normalizeStatement)
    .filter(Boolean);
  if (
    statements.length !== APPROVED_STATEMENTS.length ||
    statements.some(
      (statement, index) => statement !== APPROVED_STATEMENTS[index],
    )
  ) {
    throw new Error(
      "Migration must contain exactly the approved additive notes and admission statements in chunk_392",
    );
  }
  return statements;
}

const VERIFICATION_SQL = `
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'site_visits'
  AND column_name IN ('notes', 'check_out_notes', 'admission_status')
ORDER BY column_name
`;

export async function runNotesAdmissionMigration(client, sqlText) {
  const statements = parseNotesAdmissionMigration(sqlText);
  for (const statement of statements) {
    await client.query(statement);
  }
  const verification = await client.query(VERIFICATION_SQL);
  const expected = [
    { column_name: "admission_status", data_type: "text", is_nullable: "YES" },
    { column_name: "check_out_notes", data_type: "text", is_nullable: "YES" },
    { column_name: "notes", data_type: "text", is_nullable: "YES" },
  ];
  if (JSON.stringify(verification.rows) !== JSON.stringify(expected)) {
    throw new Error(
      "notes-admission preflight failed: notes, check_out_notes, and admission_status must exist as nullable text",
    );
  }
}
