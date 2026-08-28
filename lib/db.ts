import sql from "mssql";

export type SqlParam = {
  type: sql.ISqlType | (() => sql.ISqlType);
  value: unknown;
};

let pool: sql.ConnectionPool | null = null;
let connecting: Promise<sql.ConnectionPool> | null = null;
let shutdownBound = false;

function getConfig(): sql.config {
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const server = process.env.DB_SERVER;
  const database = process.env.DB_DATABASE;
  const port = Number(process.env.DB_PORT || 1433);

  if (!user || !password || !server || !database) {
    throw new Error("SQL Server environment variables are not configured.");
  }

  if (password === "YOUR_PASSWORD") {
    throw new Error("Update DB_PASSWORD in the .env file with your SQL Server password.");
  }

  return {
    user,
    password,
    server,
    port,
    database,
    options: {
      encrypt: process.env.DB_ENCRYPT === "true",
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
      enableArithAbort: true,
      useUTC: true,
    },
    pool: {
      max: 16,
      min: 2,
      idleTimeoutMillis: 60000,
      acquireTimeoutMillis: 8000,
    },
    connectionTimeout: 8000,
    requestTimeout: 20000,
  };
}

async function closeQuietly(target: sql.ConnectionPool | null) {
  if (!target) return;
  try {
    await target.close();
  } catch {
    // already closed or broken
  }
}

function bindShutdown() {
  if (shutdownBound || typeof process === "undefined") return;
  shutdownBound = true;
  const close = () => {
    void closeQuietly(pool);
    pool = null;
  };
  process.once("SIGTERM", close);
  process.once("beforeExit", close);
}

export async function getPool(): Promise<sql.ConnectionPool> {
  bindShutdown();
  if (pool?.connected) return pool;
  if (connecting) return connecting;

  const dead = pool;
  pool = null;

  connecting = (async () => {
    await closeQuietly(dead);
    const next = new sql.ConnectionPool(getConfig());
    next.on("error", (err) => {
      console.error("SQL Server pool error");
      console.error(err);
      if (pool === next) pool = null;
      void closeQuietly(next);
    });
    await next.connect();
    pool = next;
    connecting = null;
    return next;
  })();

  try {
    return await connecting;
  } catch (error) {
    connecting = null;
    pool = null;
    throw error;
  }
}

export async function query<T extends object = Record<string, unknown>>(
  text: string,
  params: Record<string, SqlParam> = {},
): Promise<T[]> {
  const p = await getPool();
  const request = p.request();
  for (const [name, param] of Object.entries(params)) {
    request.input(name, param.type as sql.ISqlType, param.value);
  }
  const result = await request.query<T>(text);
  return result.recordset;
}

export async function execute(
  text: string,
  params: Record<string, SqlParam> = {},
): Promise<sql.IResult<unknown>> {
  const p = await getPool();
  const request = p.request();
  for (const [name, param] of Object.entries(params)) {
    request.input(name, param.type as sql.ISqlType, param.value);
  }
  return request.query(text);
}

export async function scalar<T>(
  text: string,
  params: Record<string, SqlParam> = {},
): Promise<T | null> {
  const rows = await query<Record<string, T>>(text, params);
  if (!rows[0]) return null;
  const first = Object.values(rows[0])[0];
  return (first ?? null) as T | null;
}

export async function withTransaction<T>(
  work: (tx: sql.Transaction, request: () => sql.Request) => Promise<T>,
): Promise<T> {
  const p = await getPool();
  const tx = new sql.Transaction(p);
  await tx.begin();
  try {
    const result = await work(tx, () => new sql.Request(tx));
    await tx.commit();
    return result;
  } catch (error) {
    try {
      await tx.rollback();
    } catch {
      // already rolled back
    }
    throw error;
  }
}

export function bind(request: sql.Request, params: Record<string, SqlParam>) {
  for (const [name, param] of Object.entries(params)) {
    request.input(name, param.type as sql.ISqlType, param.value);
  }
  return request;
}

export { sql };
