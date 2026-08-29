import fs from "node:fs";
import path from "node:path";

import { config } from "dotenv";

config({ path: ".env", quiet: true });

const dbFile = process.env.DATABASE_FILE?.trim() || "./data/app.db";
const storageDir = process.env.STORAGE_DIR?.trim() || "./data/uploads";

for (const target of [dbFile, `${dbFile}-wal`, `${dbFile}-shm`]) {
  const resolved = path.resolve(process.cwd(), target);
  if (fs.existsSync(resolved)) {
    fs.rmSync(resolved, { force: true });
    console.log(`Removed ${target}`);
  }
}

const resolvedStorage = path.resolve(process.cwd(), storageDir);
if (fs.existsSync(resolvedStorage)) {
  fs.rmSync(resolvedStorage, { recursive: true, force: true });
  console.log(`Removed ${storageDir}`);
}

console.log("Local data cleared. Run `npm run db:migrate` to recreate the schema.");
