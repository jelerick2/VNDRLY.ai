const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MIN_PLATE_LENGTH = 3;
const MAX_PLATE_LENGTH = 8;

const PLATE_STOPWORDS = new Set([
  "OKLAHOMA",
  "TEXAS",
  "KANSAS",
  "COLORADO",
  "NEW",
  "MEXICO",
  "USA",
  "EXP",
  "EXPIRES",
  "NOV",
  "DEC",
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
]);
const OCR_NARRATION_WORDS = new Set(["LICENSE", "PLATE", "TAG", "VISIBLE", "VEHICLE"]);
const NO_PLATE_RESPONSE = /(?:\bno\b.{0,32}\b(?:license\s+plate|plate|tag)\b)|(?:\b(?:license\s+plate|plate|tag)\b.{0,32}\b(?:not\s+visible|cannot\s+be\s+(?:read|seen)|unreadable)\b)/i;

export class PlateOcrUnavailableError extends Error {
  constructor(message = "Plate reading is not configured") {
    super(message);
    this.name = "PlateOcrUnavailableError";
  }
}

export class PlateOcrFailedError extends Error {
  constructor(message = "Plate reading failed") {
    super(message);
    this.name = "PlateOcrFailedError";
  }
}

function formatPlateValue(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function compactPlate(raw: string): string {
  return formatPlateValue(raw).replace(/-/g, "");
}

function isPlausiblePlate(compact: string): boolean {
  if (compact.length < MIN_PLATE_LENGTH || compact.length > MAX_PLATE_LENGTH) return false;
  if (PLATE_STOPWORDS.has(compact)) return false;
  if (compact.startsWith("EXP")) return false;
  if (/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\d+$/.test(compact)) return false;
  if (/^\d{4}$/.test(compact) && Number(compact) >= 1990 && Number(compact) <= 2100) return false;
  return /[A-Z0-9]/.test(compact);
}

function scorePlate(compact: string): number {
  let score = 4;
  if (compact.length >= 5 && compact.length <= 7) score += 1;
  return score;
}

function consider(formatted: string, best: { plate: string; score: number } | null): { plate: string; score: number } | null {
  const compact = compactPlate(formatted);
  if (OCR_NARRATION_WORDS.has(compact)) return best;
  if (!isPlausiblePlate(compact)) return best;
  const score = scorePlate(compact);
  if (!best || score > best.score) return { plate: formatted, score };
  return best;
}

function fromJsonPlate(text: string): { plate: string | null; hit: boolean } {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/u, "");
  try {
    const parsed = JSON.parse(trimmed) as { plate?: unknown };
    if (parsed && Object.prototype.hasOwnProperty.call(parsed, "plate")) {
      if (parsed.plate == null || parsed.plate === "") return { plate: null, hit: true };
      if (typeof parsed.plate === "string") {
        const formatted = formatPlateValue(parsed.plate);
        const compact = compactPlate(formatted);
        return { plate: isPlausiblePlate(compact) ? formatted : null, hit: true };
      }
    }
  } catch {
    const match = text.match(/"plate"\s*:\s*(null|"[^"]*")/i);
    if (match) {
      if (match[1] === "null") return { plate: null, hit: true };
      const formatted = formatPlateValue(match[1].slice(1, -1));
      const compact = compactPlate(formatted);
      return { plate: isPlausiblePlate(compact) ? formatted : null, hit: true };
    }
  }
  return { plate: null, hit: false };
}

export function extractPlateCandidate(text: string): string | null {
  if (!text.trim()) return null;
  const json = fromJsonPlate(text);
  if (json.hit) return json.plate;
  if (NO_PLATE_RESPONSE.test(text)) return null;

  let best: { plate: string; score: number } | null = null;
  for (const token of text.toUpperCase().match(/[A-Z0-9][A-Z0-9-]{1,8}[A-Z0-9]|[A-Z0-9]{3,8}/g) ?? []) {
    best = consider(formatPlateValue(token), best);
  }
  for (const line of text.split(/\n/)) {
    const collapsed = formatPlateValue(line);
    best = consider(collapsed, best);
  }
  return best?.plate ?? null;
}

export async function readPlateFromImage(input: {
  imageBase64: string;
  mimeType: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}): Promise<string | null> {
  const apiKey = (input.apiKey ?? process.env.OPENAI_API_KEY ?? "").trim();
  if (!apiKey) throw new PlateOcrUnavailableError();

  const mimeType = input.mimeType.trim().toLowerCase();
  if (!mimeType.startsWith("image/")) {
    throw new PlateOcrFailedError("Select an image of the license plate.");
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(input.imageBase64.replace(/^data:[^,]+,/, ""), "base64");
  } catch {
    throw new PlateOcrFailedError("Plate photo could not be read.");
  }
  if (bytes.length < 32) throw new PlateOcrFailedError("Plate photo is too small.");
  if (bytes.length > MAX_IMAGE_BYTES) throw new PlateOcrFailedError("Plate photo is too large.");

  const dataUrl = `data:${mimeType};base64,${bytes.toString("base64")}`;
  const fetcher = input.fetchImpl ?? fetch;
  const response = await fetcher(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GATE_PLATE_OCR_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0,
      max_tokens: 80,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: 'Read the vehicle license plate. Reply with JSON only: {"plate":"ABC1234"} using letters and numbers from the plate. If no plate is visible, {"plate":null}.',
            },
            {
              type: "image_url",
              image_url: { url: dataUrl, detail: "high" },
            },
          ],
        },
      ],
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  } | null;
  if (!response.ok) throw new PlateOcrFailedError("Plate reading is temporarily unavailable.");
  const content = payload?.choices?.[0]?.message?.content ?? "";
  return extractPlateCandidate(content);
}
