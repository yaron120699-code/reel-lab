import path from "node:path";

import { config } from "dotenv";

config({ path: ".env", quiet: true });
config({ path: ".env.cloud.local", override: true, quiet: true });

import { createDatabase } from "../src/lib/db/client";
import { ensurePostgresSchema, getPostgresDb } from "../src/lib/db/postgres";

type SqliteRow = Record<string, string | number | null>;

type TableMigration = {
  name: string;
  updateColumns: string[];
};

const tables: TableMigration[] = [
  {
    name: "competitors",
    updateColumns: [
      "display_name",
      "instagram_username",
      "profile_url",
      "country",
      "niche",
      "relevance_note",
      "tags",
      "created_at",
      "updated_at",
    ],
  },
  {
    name: "reels",
    updateColumns: [
      "competitor_id",
      "source_url",
      "short_code",
      "caption",
      "published_at",
      "duration_seconds",
      "language",
      "transcript",
      "owner_username",
      "thumbnail_url",
      "remote_video_url",
      "tags",
      "import_source",
      "imported_at",
      "raw_payload",
      "created_at",
      "updated_at",
    ],
  },
  {
    name: "reel_metrics",
    updateColumns: ["reel_id", "play_count", "likes_count", "comments_count", "captured_at", "source"],
  },
  {
    name: "reel_analyses",
    updateColumns: [
      "reel_id",
      "prompt_version",
      "transcript_ref",
      "language",
      "provider",
      "model",
      "run_mode",
      "analysed_at",
      "payload",
      "created_at",
    ],
  },
  {
    name: "reel_comparisons",
    updateColumns: ["reel_a_id", "reel_b_id", "comparability", "notes", "created_at"],
  },
  {
    name: "pattern_cards",
    updateColumns: [
      "comparison_id",
      "title",
      "description",
      "when_useful",
      "supporting_reel_ids",
      "counterexamples",
      "evidence_count",
      "confidence",
      "baderech_translation",
      "do_not_copy_note",
      "created_at",
      "updated_at",
    ],
  },
];

function localDatabaseFile(): string {
  const configured = process.env.DATABASE_FILE?.trim() || "./data/app.db";
  return path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), configured.replace(/^\.\//, ""));
}

async function main(): Promise<void> {
  if (!process.env.POSTGRES_URL?.trim()) {
    throw new Error(
      "POSTGRES_URL is missing. Run `npx vercel env pull .env.cloud.local --environment=production` first.",
    );
  }

  const sqlite = createDatabase(localDatabaseFile());
  const cloud = getPostgresDb();

  try {
    await ensurePostgresSchema(cloud);
    const counts: Array<{ table: string; rows: number }> = [];

    await cloud.begin(async (transaction) => {
      for (const table of tables) {
        const rows = sqlite.prepare(`SELECT * FROM ${table.name}`).all() as SqliteRow[];
        if (rows.length > 0) {
          const updates = table.updateColumns
            .map((column) => `${column} = EXCLUDED.${column}`)
            .join(", ");
          await transaction.unsafe(
            `INSERT INTO ${table.name}
             SELECT * FROM json_populate_recordset(NULL::${table.name}, (($1::json #>> '{}')::json))
             ON CONFLICT (id) DO UPDATE SET ${updates}`,
            [JSON.stringify(rows)],
          );
        }
        counts.push({ table: table.name, rows: rows.length });
      }
    });

    console.log("Cloud migration completed.");
    for (const count of counts) console.log(`${count.table}: ${count.rows}`);
  } finally {
    sqlite.close();
    await cloud.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown migration error";
  console.error(`Cloud migration failed: ${message}`);
  process.exitCode = 1;
});
