import { sql, type SQL } from "drizzle-orm";
import { siteLocationsTable, ticketsTable } from "@workspace/db";

/** Clamp a cosine-law argument into the acos domain [-1, 1]. */
export function clampAcosArg(value: number): number {
  return Math.min(1, Math.max(-1, value));
}

/** Haversine distance in km, with acos input clamped to avoid NaN/SQL errors. */
export function gpsHaversineKmSql(): SQL {
  return sql`(
    6371 * acos(
      LEAST(1::float8, GREATEST(-1::float8,
        cos(radians(${siteLocationsTable.latitude})) * cos(radians(${ticketsTable.checkInLatitude}))
        * cos(radians(${ticketsTable.checkInLongitude}) - radians(${siteLocationsTable.longitude}))
        + sin(radians(${siteLocationsTable.latitude})) * sin(radians(${ticketsTable.checkInLatitude}))
      ))
    )
  )`;
}

export function gpsHasLatLngSql(): SQL {
  return sql`${ticketsTable.checkInLatitude} IS NOT NULL
    AND ${ticketsTable.checkInLongitude} IS NOT NULL
    AND ${siteLocationsTable.latitude} IS NOT NULL
    AND ${siteLocationsTable.longitude} IS NOT NULL`;
}
