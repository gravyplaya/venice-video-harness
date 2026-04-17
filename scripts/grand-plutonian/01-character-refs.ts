/**
 * STAGE 1 — Character reference image generation
 *
 * For each of the 4 characters, generate 4 angles (front, three-quarter, profile,
 * full-body) using seedream-v5-lite at 1K, 1:1, cfg_scale: 10, front-loaded
 * STYLE_BLOCK, anti-realism negative prompt. Writes provenance sidecars so the
 * Seedance pre-flight gate passes downstream.
 *
 * Outputs: output/grand-plutonian/characters/<slug>/{front,three-quarter,profile,full-body}.png
 *          plus matching .provenance.json next to each PNG.
 *
 * Re-runnable: skips files that already exist on disk. Pass `--force` to regen.
 */

import "dotenv/config";
import { mkdir, writeFile, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { VeniceClient, VeniceRequestError } from "../../src/venice/client.js";
import { generateImage } from "../../src/venice/generate.js";
import { writeImageProvenance } from "../../src/venice/provenance.js";

import {
  CHARACTERS,
  CHARACTERS_DIR,
  ARCHIVE_DIR,
  MODELS,
  STYLE_BLOCK,
  NEGATIVE_BLOCK,
  REFERENCE_ANGLES,
  type CharacterSpec,
} from "./config.js";
import { banner, journal, sleep } from "./utils.js";

const FORCE = process.argv.includes("--force");
const ONLY_SLUG = process.argv.find(a => a.startsWith("--only="))?.split("=")[1];

async function archiveExisting(path: string): Promise<void> {
  if (!existsSync(path)) return;
  await mkdir(ARCHIVE_DIR, { recursive: true });
  let v = 1;
  let archivePath = join(ARCHIVE_DIR, `${path.split("/").slice(-2).join("__")}.v${v}.png`);
  while (existsSync(archivePath)) {
    v++;
    archivePath = join(ARCHIVE_DIR, `${path.split("/").slice(-2).join("__")}.v${v}.png`);
  }
  await rename(path, archivePath);
}

function buildPrompt(char: CharacterSpec, angleSuffix: string, isFirstAngle: boolean): string {
  // Front-loaded style block, then character description, then angle.
  // For non-front angles, append "Same person as previous image" anchor.
  const parts = [
    `STYLE: ${STYLE_BLOCK}`,
    char.description,
    char.wardrobe,
    angleSuffix,
    isFirstAngle ? "" : "Same person as previous image, identical face and wardrobe and hair, consistent appearance.",
    `STYLE REMINDER: ${STYLE_BLOCK}`,
  ].filter(Boolean);
  return parts.join(" ");
}

async function generateAngleForCharacter(
  client: VeniceClient,
  char: CharacterSpec,
  angle: typeof REFERENCE_ANGLES[number],
  isFirstAngle: boolean,
): Promise<void> {
  const charDir = join(CHARACTERS_DIR, char.slug);
  await mkdir(charDir, { recursive: true });
  const outPath = join(charDir, angle.filename);

  if (existsSync(outPath) && !FORCE) {
    console.log(`  ✓ exists: ${char.slug}/${angle.filename}`);
    return;
  }
  if (existsSync(outPath) && FORCE) {
    await archiveExisting(outPath);
    console.log(`  📦 archived prior: ${char.slug}/${angle.filename}`);
  }

  const prompt = buildPrompt(char, angle.suffix, isFirstAngle);

  try {
    const t0 = Date.now();
    const resp = await generateImage(client, {
      model: MODELS.imageGen,
      prompt,
      negative_prompt: NEGATIVE_BLOCK,
      resolution: "1K",
      aspect_ratio: "1:1",
      cfg_scale: 10,
      seed: char.seed,
      hide_watermark: true,
      safe_mode: false,
    });

    const b64 = resp.images[0]?.b64_json;
    if (!b64) {
      throw new Error("Venice returned no image data");
    }
    const buf = Buffer.from(b64, "base64");

    // Placeholder detection — Venice silently returns ~2-8KB blank-black
    // WEBP images (HTTP 200) when content moderation rejects a prompt.
    // Any real seedream-v5-lite output is ~400KB+. We treat <50KB as moderation rejection.
    const MIN_REAL_BYTES = 50_000;
    if (buf.length < MIN_REAL_BYTES) {
      throw new Error(
        `Venice returned ${buf.length}-byte placeholder (likely moderation rejection). ` +
        `Real images from seedream-v5-lite are >400KB. Check prompt for triggering content.`
      );
    }

    await writeFile(outPath, buf);
    await writeImageProvenance(outPath, MODELS.imageGen);

    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`  ✨ ${char.slug}/${angle.filename}  (${dt}s, ${(buf.length / 1024).toFixed(0)}KB)`);
  } catch (err) {
    const msg = err instanceof VeniceRequestError
      ? `Venice ${err.status}: ${err.message} | body=${JSON.stringify(err.body).slice(0, 400)}`
      : err instanceof Error ? err.message : String(err);
    await journal(
      "Stage 1 — Character refs",
      "MODEL",
      `Failed to generate ${char.slug}/${angle.filename}`,
      `**Prompt (truncated):**\n\n\`\`\`\n${prompt.slice(0, 800)}\n\`\`\`\n\n**Error:** ${msg}`,
    );
    throw err;
  }
}

async function main(): Promise<void> {
  banner("STAGE 1 — Character reference generation");
  if (!process.env.VENICE_API_KEY) {
    console.error("VENICE_API_KEY not set in environment.");
    process.exit(1);
  }

  const client = new VeniceClient();
  const targets = ONLY_SLUG ? CHARACTERS.filter(c => c.slug === ONLY_SLUG) : CHARACTERS;
  if (targets.length === 0) {
    console.error(`No characters matched --only=${ONLY_SLUG}`);
    process.exit(1);
  }

  console.log(`Image model: ${MODELS.imageGen}`);
  console.log(`Characters: ${targets.map(c => c.slug).join(", ")}`);
  console.log(`Force regen: ${FORCE ? "YES (prior versions will be archived)" : "no"}`);

  let total = 0;
  for (const char of targets) {
    console.log(`\n──── ${char.name} (${char.slug}, seed ${char.seed}) ────`);
    for (let i = 0; i < REFERENCE_ANGLES.length; i++) {
      await generateAngleForCharacter(client, char, REFERENCE_ANGLES[i], i === 0);
      total++;
      // Light spacing between requests; client also enforces 250ms.
      await sleep(150);
    }
  }

  banner(`STAGE 1 COMPLETE — ${total} angle generations attempted`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
