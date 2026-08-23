const MIN_PLATE_LENGTH = 3;
const MAX_PLATE_LENGTH = 8;
const PLATE_STOPWORDS = new Set([
  "OKLAHOMA", "TEXAS", "KANSAS", "COLORADO", "NEW", "MEXICO", "USA",
  "EXP", "EXPIRES", "NOV", "DEC", "JAN", "FEB", "MAR", "APR", "MAY",
  "JUN", "JUL", "AUG", "SEP", "OCT",
]);

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
  return /[A-Z]/.test(compact) && /[0-9]/.test(compact);
}

function scorePlate(compact: string): number {
  let score = 4;
  if (compact.length >= 5 && compact.length <= 7) score += 1;
  return score;
}

export function extractPlateCandidate(text: string): string | null {
  if (!text.trim()) return null;
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/u, "");
  try {
    const parsed = JSON.parse(trimmed) as { plate?: unknown };
    if (parsed && Object.prototype.hasOwnProperty.call(parsed, "plate")) {
      if (parsed.plate == null || parsed.plate === "") return null;
      if (typeof parsed.plate === "string") {
        const formatted = formatPlateValue(parsed.plate);
        return isPlausiblePlate(compactPlate(formatted)) ? formatted : null;
      }
    }
  } catch {
    /* fall through to noisy OCR text */
  }

  let bestPlate: string | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  const consider = (raw: string) => {
    const formatted = formatPlateValue(raw);
    const compact = compactPlate(formatted);
    if (!isPlausiblePlate(compact)) return;
    const score = scorePlate(compact);
    if (score > bestScore) {
      bestPlate = formatted;
      bestScore = score;
    }
  };
  for (const token of text.toUpperCase().match(/[A-Z0-9][A-Z0-9-]{1,8}[A-Z0-9]|[A-Z0-9]{3,8}/g) ?? []) {
    consider(token);
  }
  for (const line of text.split(/\n/)) consider(line);
  return bestPlate;
}

export async function compressPlatePhoto(file: File): Promise<{ imageBase64: string; mimeType: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const maxEdge = 1280;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
    return { mimeType: "image/jpeg", imageBase64: dataUrl.slice(dataUrl.indexOf(",") + 1) };
  } catch {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read plate photo."));
      reader.readAsDataURL(file);
    });
    const comma = dataUrl.indexOf(",");
    return {
      mimeType: file.type || "image/jpeg",
      imageBase64: comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl,
    };
  }
}

export async function readPlateFromPhoto(
  file: File,
  readViaApi: (input: { imageBase64: string; mimeType: string }) => Promise<{ plate: string | null }>,
): Promise<string | null> {
  const payload = await compressPlatePhoto(file);
  try {
    const result = await readViaApi(payload);
    if (result.plate) return formatPlateValue(result.plate);
  } catch {
    /* booth still accepts a typed tag and previous-visit fill */
  }
  return null;
}
