import {
  normalizePlateNumber,
  normalizePlateState,
  PLATE_OCR_STATE_CONFIDENCE_THRESHOLD,
  type PlateStateCode,
} from "@workspace/plate-state";

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
  "PLATE",
  "LICENSE",
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

export type PlateOcrCandidate = {
  plate: string | null;
  state: PlateStateCode | null;
  plateConfidence: number | null;
  stateConfidence: number | null;
};

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

function emptyPlateCandidate(): PlateOcrCandidate {
  return {
    plate: null,
    state: null,
    plateConfidence: null,
    stateConfidence: null,
  };
}

function formatPlateValue(raw: string): string {
  return (normalizePlateNumber(raw) ?? "")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function compactPlate(raw: string): string {
  return formatPlateValue(raw).replace(/-/g, "");
}

function isPlausiblePlate(compact: string): boolean {
  if (compact.length < MIN_PLATE_LENGTH || compact.length > MAX_PLATE_LENGTH)
    return false;
  if (PLATE_STOPWORDS.has(compact)) return false;
  if (compact.startsWith("EXP")) return false;
  if (/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\d+$/.test(compact))
    return false;
  if (
    /^\d{4}$/.test(compact) &&
    Number(compact) >= 1990 &&
    Number(compact) <= 2100
  )
    return false;
  return /[A-Z0-9]/.test(compact);
}

function scorePlate(compact: string): number {
  let score = 4;
  if (compact.length >= 5 && compact.length <= 7) score += 1;
  return score;
}

function consider(
  formatted: string,
  best: { plate: string; score: number } | null,
): { plate: string; score: number } | null {
  const compact = compactPlate(formatted);
  if (!isPlausiblePlate(compact)) return best;
  const score = scorePlate(compact);
  if (!best || score > best.score) return { plate: formatted, score };
  return best;
}

function normalizeConfidence(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(1, Math.max(0, value));
}

function candidateFromJson(value: Record<string, unknown>): PlateOcrCandidate {
  const rawPlate = value.plate;
  const formattedPlate =
    typeof rawPlate === "string" ? formatPlateValue(rawPlate) : null;
  const plate =
    formattedPlate && isPlausiblePlate(compactPlate(formattedPlate))
      ? formattedPlate
      : null;
  const plateConfidence = normalizeConfidence(value.plateConfidence);
  const stateConfidence = normalizeConfidence(value.stateConfidence);
  const normalizedState = normalizePlateState(
    typeof value.state === "string" ? value.state : null,
  );

  return {
    plate,
    state:
      plate &&
      normalizedState &&
      stateConfidence !== null &&
      stateConfidence >= PLATE_OCR_STATE_CONFIDENCE_THRESHOLD
        ? normalizedState
        : null,
    plateConfidence,
    stateConfidence,
  };
}

function candidateFromPlate(plate: string | null): PlateOcrCandidate {
  return { ...emptyPlateCandidate(), plate };
}

function structuredJsonContent(text: string): {
  content: string;
  looksStructured: boolean;
} {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) {
    return { content: fenced[1], looksStructured: true };
  }

  const content = text.trim();
  return {
    content,
    looksStructured:
      /\{\s*"/.test(content) ||
      /\[\s*(?:"|\]|\[|-?\d|true\b|false\b|null\b|\{\s*(?:"|\}))/.test(
        content,
      ) ||
      /"(?:plate|state|plateConfidence|stateConfidence)"\s*:/i.test(content),
  };
}

function fromJsonPlate(text: string): {
  candidate: PlateOcrCandidate;
  hit: boolean;
} {
  const { content, looksStructured } = structuredJsonContent(text);
  try {
    const parsed = JSON.parse(content) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      Object.prototype.hasOwnProperty.call(parsed, "plate")
    ) {
      return {
        candidate: candidateFromJson(parsed as Record<string, unknown>),
        hit: true,
      };
    }
    return { candidate: emptyPlateCandidate(), hit: true };
  } catch {
    return {
      candidate: emptyPlateCandidate(),
      hit: looksStructured,
    };
  }
}

export function extractPlateCandidate(text: string): PlateOcrCandidate {
  if (!text.trim()) return emptyPlateCandidate();
  const json = fromJsonPlate(text);
  if (json.hit) return json.candidate;
  if (/\bno\s+(?:license\s+)?plate\b/i.test(text)) return emptyPlateCandidate();

  let best: { plate: string; score: number } | null = null;
  for (const token of text
    .toUpperCase()
    .match(/[A-Z0-9][A-Z0-9-]{1,8}[A-Z0-9]|[A-Z0-9]{3,8}/g) ?? []) {
    best = consider(formatPlateValue(token), best);
  }
  for (const line of text.split(/\n/)) {
    const collapsed = formatPlateValue(line);
    best = consider(collapsed, best);
  }
  return candidateFromPlate(best?.plate ?? null);
}

export async function readPlateFromImage(input: {
  imageBase64: string;
  mimeType: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}): Promise<PlateOcrCandidate> {
  const apiKey = (input.apiKey ?? process.env.OPENAI_API_KEY ?? "").trim();
  if (!apiKey) throw new PlateOcrUnavailableError();

  const mimeType = input.mimeType.trim().toLowerCase();
  if (!mimeType.startsWith("image/")) {
    throw new PlateOcrFailedError("Select an image of the license plate.");
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(
      input.imageBase64.replace(/^data:[^,]+,/, ""),
      "base64",
    );
  } catch {
    throw new PlateOcrFailedError("Plate photo could not be read.");
  }
  if (bytes.length < 32)
    throw new PlateOcrFailedError("Plate photo is too small.");
  if (bytes.length > MAX_IMAGE_BYTES)
    throw new PlateOcrFailedError("Plate photo is too large.");

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
              text: 'Read the vehicle license plate. Reply with JSON only: {"plate":"ABC1234","state":"TX","plateConfidence":0.95,"stateConfidence":0.95}. State must be a USPS abbreviation or null. Use null for unavailable fields.',
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
  if (!response.ok)
    throw new PlateOcrFailedError("Plate reading is temporarily unavailable.");
  const content = payload?.choices?.[0]?.message?.content ?? "";
  return extractPlateCandidate(content);
}
