import { drizzle } from "drizzle-orm/libsql";

// You can specify any property from the libsql connection options
const dbUrl = process.env.TURSO_DB_URL || "file:dev.db";
if (!dbUrl) {
  throw new Error("TURSO_DB_URL is not defined in environment variables");
}
const authToken = process.env.TURSO_DB_AUTH_TOKEN || undefined;
if (!authToken) {
  throw new Error(
    "TURSO_DB_AUTH_TOKEN is not defined in environment variables"
  );
}

export const db = drizzle({
  connection: {
    url: dbUrl,
    authToken: authToken,
  },
});
