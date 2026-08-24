import { existsSync, readFileSync } from "node:fs";

function unquote(value) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Reads either a conventional Supabase env file or the labeled multi-line
 * export used in VNDRLY's machine-local secrets folder.
 */
export function readSupabaseSecrets(filePath) {
  if (!existsSync(filePath)) {
    return { url: "", serviceRoleKey: "" };
  }

  const raw = readFileSync(filePath, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equals = trimmed.indexOf("=");
    if (equals <= 0) continue;
    env[trimmed.slice(0, equals).trim().toLowerCase()] = unquote(
      trimmed.slice(equals + 1),
    );
  }

  const url =
    env.supabase_url || raw.match(/https:\/\/[a-z0-9]+\.supabase\.co/i)?.[0] || "";
  let serviceRoleKey =
    env.supabase_service_role_key || env.supabase_service_key || "";

  if (!serviceRoleKey) {
    const lines = raw.split(/\r?\n/);
    const labelIndex = lines.findIndex((line) => /service[_ -]?role/i.test(line));
    if (labelIndex >= 0) {
      const nearby = lines.slice(labelIndex, labelIndex + 3).join("\n");
      serviceRoleKey =
        nearby.match(/sb_secret_[A-Za-z0-9_-]{20,}/)?.[0] ||
        nearby.match(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/)?.[0] ||
        "";
    }
  }

  return { url, serviceRoleKey };
}
