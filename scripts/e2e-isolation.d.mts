export interface IsolatedDatabaseEnvironment {
  DATABASE_URL?: string;
  TEST_DATABASE_URL?: string;
  VNDRLY_ISOLATED_TEST_DB?: string;
}

export function normalizeDatabaseTarget(rawUrl: string): string;
export function assertIsolatedTestDatabaseEnvironment(
  env: IsolatedDatabaseEnvironment,
): { databaseUrl: string; testDatabaseUrl: string };
