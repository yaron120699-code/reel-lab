import { config } from "dotenv";

config({ path: ".env", quiet: true });

import { createDatabase } from "../src/lib/db/client";

const file = process.env.DATABASE_FILE?.trim() || "./data/app.db";
const db = createDatabase(file.startsWith("/") ? file : `${process.cwd()}/${file.replace(/^\.\//, "")}`);
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all() as Array<{ name: string }>;

console.log(`Schema applied to ${file}`);
console.log(`Tables: ${tables.map((t) => t.name).join(", ")}`);
db.close();
