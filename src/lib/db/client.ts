import { Pool, type QueryResultRow } from "pg";

const globalDb = globalThis as unknown as { hospitalReadPool?: Pool };

function getPool(): Pool {
  if (globalDb.hospitalReadPool) return globalDb.hospitalReadPool;
  const connectionString = process.env.DATABASE_URL;
  if (connectionString && !/^postgres(?:ql)?:\/\//.test(connectionString)) {
    throw new Error("DATABASE_URL must reference Postgres, not the retired SQLite database.");
  }
  if (!connectionString && (!process.env.PGHOST || !process.env.PGDATABASE)) {
    throw new Error("Set DATABASE_URL or PGHOST and PGDATABASE for the existing hospital database.");
  }
  const pool = new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    statement_timeout: 15000,
    application_name: "hospital-readonly-viewer",
  });
  pool.on("error", () => console.error("Hospital database connection interrupted."));
  globalDb.hospitalReadPool = pool;
  return pool;
}

/** Server-defined SQL only. Each call uses one client in a read-only transaction. */
export async function readQuery<T extends QueryResultRow>(sql: string, values: unknown[] = []): Promise<T[]> {
  const client = await getPool().connect();
  let discard = false;
  try {
    await client.query("BEGIN READ ONLY");
    const result = await client.query<T>(sql, values);
    await client.query("COMMIT");
    return result.rows;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { discard = true; }
    throw error;
  } finally {
    client.release(discard);
  }
}
