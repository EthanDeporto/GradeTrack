import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import postgres from 'postgres';
import ws from "ws";
import * as schema from "@shared/schema";
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';

// Configure Neon for serverless environments
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. For local development, use a PostgreSQL connection string like: postgresql://user:password@localhost:5432/database"
  );
}

// Determine if we're using Neon (serverless) or local PostgreSQL
const isNeonDatabase = process.env.DATABASE_URL.includes('neon.tech') || 
                      process.env.DATABASE_URL.includes('neon.aws') ||
                      process.env.NODE_ENV === 'production';

// Define the db type as a union of both possible database types
type DatabaseType = PostgresJsDatabase<typeof schema> | NeonDatabase<typeof schema>;

let db: DatabaseType;

if (isNeonDatabase) {
  // Use Neon serverless driver for production/Replit
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNeon(pool, { schema });
} else {
  // Use postgres.js for local development
  const client = postgres(process.env.DATABASE_URL);
  db = drizzle(client, { schema });
}

export { db };
export const pool = isNeonDatabase ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;