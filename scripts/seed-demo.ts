import { config } from "dotenv";

config({ path: ".env", quiet: true });

async function main(): Promise<void> {
  const { seedDemoData } = await import("../src/lib/services/demo");
  const result = await seedDemoData();

  if (!result.ok) {
    console.error(`Seed failed: ${result.error}`);
    process.exitCode = 1;
    return;
  }

  const { createdReels, createdAnalyses, attachedVideos, videoNote, alreadySeeded } = result.result;
  console.log(
    alreadySeeded
      ? "Demo already present — nothing duplicated."
      : `Demo seeded — reels ${createdReels}, analyses ${createdAnalyses}, videos ${attachedVideos}`,
  );
  if (videoNote) console.log(videoNote);
}

void main();
