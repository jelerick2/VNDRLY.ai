/**
 * Adds regulator-confirmed active Warwick Energy Group well pads.
 *
 * Sources:
 * - Oklahoma Corporation Commission nightly RBDMS well export (2026-09-02)
 * - Texas Railroad Commission operator/well records (checked 2026-09-02)
 *
 * Multiple wells sharing a surface pad are represented by one VNDRLY site.
 * Idempotent: an existing sourceRef, matching name, or location within 100 m
 * is skipped. This script never updates or deletes existing rows.
 */
import { randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db, partnersTable, siteLocationsTable } from "@workspace/db";

type SiteSeed = {
  name: string;
  county: string;
  state: "OK" | "TX";
  latitude: number;
  longitude: number;
  sourceRef: string;
};

const PARTNER_NAME = "Warwick Energy Group";
const SITE_RADIUS_METERS = 500;

const SITES: SiteSeed[] = [
  { name: "AD Rock / Moseley Pad", county: "Garvin", state: "OK", latitude: 34.62201, longitude: -97.46902, sourceRef: "OCC-PAD:AD-ROCK-MOSELEY" },
  { name: "AD Rock East / Moseley East Pad", county: "Garvin", state: "OK", latitude: 34.62127, longitude: -97.45855, sourceRef: "OCC-PAD:AD-ROCK-MOSELEY-EAST" },
  { name: "AD Rock West / Mike D West Pad", county: "Garvin", state: "OK", latitude: 34.65276, longitude: -97.47062, sourceRef: "OCC-PAD:AD-ROCK-MIKE-D-WEST" },
  { name: "Mike D East Pad", county: "Garvin", state: "OK", latitude: 34.65133, longitude: -97.45649, sourceRef: "OCC-PAD:MIKE-D-EAST" },
  { name: "Moseley West Pad", county: "Garvin", state: "OK", latitude: 34.59496, longitude: -97.47422, sourceRef: "OCC-PAD:MOSELEY-WEST" },
  { name: "ASP 0606-27-34 Pad", county: "Grady", state: "OK", latitude: 34.9722, longitude: -97.81536, sourceRef: "OCC-PAD:ASP-0606-27-34" },
  { name: "Audra West Pad", county: "Grady", state: "OK", latitude: 34.75173, longitude: -97.7891, sourceRef: "OCC-PAD:AUDRA-WEST" },
  { name: "Audra East Pad", county: "Grady", state: "OK", latitude: 34.75132, longitude: -97.77973, sourceRef: "OCC-PAD:AUDRA-EAST" },
  { name: "Coyote Hills Pad", county: "Grady", state: "OK", latitude: 34.71738, longitude: -97.74495, sourceRef: "OCC-PAD:COYOTE-HILLS" },
  { name: "Douthit Pad", county: "Grady", state: "OK", latitude: 34.75034, longitude: -97.7757, sourceRef: "OCC-PAD:DOUTHIT" },
  { name: "Elray Pad", county: "Grady", state: "OK", latitude: 34.72423, longitude: -97.76453, sourceRef: "OCC-PAD:ELRAY" },
  { name: "Hayes 0708 13-12 Pad", county: "Grady", state: "OK", latitude: 35.07127, longitude: -97.99669, sourceRef: "OCC-PAD:HAYES-0708-13-12" },
  { name: "Joe T. Webster Pad", county: "Grady", state: "OK", latitude: 34.69523, longitude: -97.71885, sourceRef: "OCC-PAD:JOE-T-WEBSTER" },
  { name: "Milkshake Pad", county: "Grady", state: "OK", latitude: 34.69359, longitude: -97.72793, sourceRef: "OCC-PAD:MILKSHAKE" },
  { name: "Woody Wayne Walden Pad", county: "Grady", state: "OK", latitude: 34.69513, longitude: -97.74089, sourceRef: "OCC-PAD:WOODY-WAYNE-WALDEN" },
  { name: "Yellow Sub East Pad", county: "Grady", state: "OK", latitude: 34.95783, longitude: -97.69172, sourceRef: "OCC-PAD:YELLOW-SUB-EAST" },
  { name: "Yellow Sub Central Pad", county: "Grady", state: "OK", latitude: 34.95759, longitude: -97.69804, sourceRef: "OCC-PAD:YELLOW-SUB-CENTRAL" },
  { name: "Yellow Sub West Pad", county: "Grady", state: "OK", latitude: 34.95753, longitude: -97.7038, sourceRef: "OCC-PAD:YELLOW-SUB-WEST" },
  { name: "Beginnings / Trident Pad", county: "McClain", state: "OK", latitude: 35.11595, longitude: -97.66548, sourceRef: "OCC-PAD:BEGINNINGS-TRIDENT" },
  { name: "Calvert 0603-6-7 Pad", county: "McClain", state: "OK", latitude: 35.03181, longitude: -97.54826, sourceRef: "OCC-PAD:CALVERT-0603-6-7" },
  { name: "Sixkiller 7-6-0603 Pad", county: "McClain", state: "OK", latitude: 35.00134, longitude: -97.5641, sourceRef: "OCC-PAD:SIXKILLER-7-6-0603" },
  { name: "Plainview 0205 Pad", county: "Stephens", state: "OK", latitude: 34.67933, longitude: -97.73805, sourceRef: "OCC-PAD:PLAINVIEW-0205" },

  { name: "Wilson 1H Pad", county: "Wilson", state: "TX", latitude: 28.984653, longitude: -98.052664, sourceRef: "RRC-PAD:42-493-32648" },
  { name: "H. Moczygemba A 1H Pad", county: "Wilson", state: "TX", latitude: 29.052898, longitude: -98.004455, sourceRef: "RRC-PAD:42-493-32671" },
  { name: "H. Moczygemba A 2H-4H Pad", county: "Wilson", state: "TX", latitude: 29.04315, longitude: -98.00818, sourceRef: "RRC-PAD:H-MOCZYGEMBA-A-2H-4H" },
  { name: "Clement Pad", county: "Wilson", state: "TX", latitude: 29.085964, longitude: -97.956598, sourceRef: "RRC-PAD:42-493-32725" },
  { name: "Davis A-B Pad", county: "Wilson", state: "TX", latitude: 29.09919, longitude: -97.95561, sourceRef: "RRC-PAD:DAVIS-A-B" },
  { name: "Pirate A-B Pad", county: "Wilson", state: "TX", latitude: 29.01919, longitude: -98.12592, sourceRef: "RRC-PAD:PIRATE-A-B" },
  { name: "Pirate K Pad", county: "Wilson", state: "TX", latitude: 28.998138, longitude: -98.138228, sourceRef: "RRC-PAD:42-493-32781" },
  { name: "Pirate L Pad", county: "Wilson", state: "TX", latitude: 28.997187, longitude: -98.126338, sourceRef: "RRC-PAD:42-493-32780" },
  { name: "Pirate M-N Pad", county: "Wilson", state: "TX", latitude: 29.00394, longitude: -98.11361, sourceRef: "RRC-PAD:PIRATE-M-N" },
  { name: "Falls City East Pad", county: "Wilson", state: "TX", latitude: 29.015503, longitude: -98.035253, sourceRef: "RRC-PAD:42-493-32962" },
  { name: "Robin Pad", county: "Gonzales", state: "TX", latitude: 29.552468, longitude: -97.272217, sourceRef: "RRC-PAD:42-177-34186" },
  { name: "Eli R. Huffman Jr. Pad", county: "Gonzales", state: "TX", latitude: 29.200739, longitude: -97.655519, sourceRef: "RRC-PAD:42-177-33837" },
  { name: "Nickel Ranch A Pad", county: "Gonzales", state: "TX", latitude: 29.565538, longitude: -97.245595, sourceRef: "RRC-PAD:42-177-34594" },
  { name: "H. Moczygemba A 7H Pad", county: "Karnes", state: "TX", latitude: 29.037161, longitude: -97.976911, sourceRef: "RRC-PAD:42-255-38260" },
  { name: "Kenedy Unit Pad", county: "Karnes", state: "TX", latitude: 28.75465, longitude: -97.90277, sourceRef: "RRC-PAD:KENEDY-UNIT" },
  { name: "Grasshopper Thiele A Pad", county: "Karnes", state: "TX", latitude: 28.78447, longitude: -97.87151, sourceRef: "RRC-PAD:GRASSHOPPER-THIELE-A" },
  { name: "Grasshopper Thiele B Pad", county: "Karnes", state: "TX", latitude: 28.79547, longitude: -97.8693, sourceRef: "RRC-PAD:GRASSHOPPER-THIELE-B" },
];

function generateSiteCode(): string {
  return `SITE-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function distanceMeters(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const earthRadius = 6_371_000;
  const dLat = toRadians(bLat - aLat);
  const dLon = toRadians(bLon - aLon);
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(aLat)) * Math.cos(toRadians(bLat)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const [partner] = await db.select().from(partnersTable).where(eq(partnersTable.name, PARTNER_NAME)).limit(1);
  if (!partner) throw new Error(`Partner not found: ${PARTNER_NAME}`);

  const existing = await db.select().from(siteLocationsTable).where(and(
    eq(siteLocationsTable.partnerId, partner.id),
    isNull(siteLocationsTable.supersededAt),
  ));

  let inserted = 0;
  let skipped = 0;
  for (const site of SITES) {
    const duplicate = existing.find((row) =>
      row.sourceRef === site.sourceRef
      || row.name.trim().toLowerCase() === site.name.trim().toLowerCase()
      || distanceMeters(row.latitude, row.longitude, site.latitude, site.longitude) <= 100
    );
    if (duplicate) {
      skipped++;
      console.log(`skip: ${site.name} (matches #${duplicate.id} ${duplicate.name})`);
      continue;
    }
    if (!dryRun) {
      const [created] = await db.insert(siteLocationsTable).values({
        partnerId: partner.id,
        name: site.name,
        address: `${site.county} County, ${site.state}`,
        latitude: site.latitude,
        longitude: site.longitude,
        state: site.state,
        siteCode: generateSiteCode(),
        siteRadiusMeters: SITE_RADIUS_METERS,
        sourceType: site.state === "OK" ? "occ" : "rrc",
        sourceRef: site.sourceRef,
      }).returning();
      existing.push(created!);
    }
    inserted++;
    console.log(`${dryRun ? "would insert" : "inserted"}: ${site.name}`);
  }

  console.log(JSON.stringify({ partnerId: partner.id, candidates: SITES.length, inserted, skipped, dryRun }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
