/**
 * STAGE 2 — Storyboard panel generation
 *
 * Generates 6 panels at 2K / 16:9 via seedream-v5-lite. Each panel is the
 * anchor frame for its corresponding video shot. Provenance sidecars written
 * for Seedance pre-flight.
 *
 * Re-runnable: skips files that already exist on disk. Pass `--force` to regen.
 *              Pass `--only=N` to regen a single shot (e.g. `--only=3`).
 */

import "dotenv/config";
import { mkdir, writeFile, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { VeniceClient, VeniceRequestError } from "../../src/venice/client.js";
import { generateImage } from "../../src/venice/generate.js";
import { writeImageProvenance } from "../../src/venice/provenance.js";

import {
  SHOTLIST,
  SHOTS_DIR,
  ARCHIVE_DIR,
  MODELS,
  STYLE_BLOCK,
  NEGATIVE_BLOCK,
} from "./config.js";
import { banner, journal, sleep } from "./utils.js";

const FORCE = process.argv.includes("--force");
const ONLY_NUM = process.argv.find(a => a.startsWith("--only="))?.split("=")[1];

const PANEL_SEED_BASE = 880000;
const MIN_REAL_BYTES = 50_000;

function panelPath(shotNum: number): string {
  return join(SHOTS_DIR, `shot-${String(shotNum).padStart(3, "0")}.png`);
}

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
  // Move sidecar too if present
  const sidecar = path.replace(/\.png$/, ".provenance.json");
  if (existsSync(sidecar)) {
    await rename(sidecar, archivePath.replace(/\.png$/, ".provenance.json"));
  }
}

function buildPanelPrompt(panelText: string): string {
  return [
    `STYLE: ${STYLE_BLOCK}`,
    panelText,
    `STYLE REMINDER: ${STYLE_BLOCK}`,
  ].join(" ");
}

async function generateOnePanel(
  client: VeniceClient,
  shotNum: number,
  prompt: string,
): Promise<void> {
  const out = panelPath(shotNum);

  if (existsSync(out) && !FORCE) {
    console.log(`  ✓ exists: shot-${String(shotNum).padStart(3, "0")}.png`);
    return;
  }
  if (existsSync(out) && FORCE) {
    await archiveExisting(out);
    console.log(`  📦 archived prior shot-${String(shotNum).padStart(3, "0")}.png`);
  }

  const t0 = Date.now();
  try {
    const resp = await generateImage(client, {
      model: MODELS.imageGen,
      prompt,
      negative_prompt: NEGATIVE_BLOCK,
      resolution: "2K",
      aspect_ratio: "16:9",
      cfg_scale: 10,
      seed: PANEL_SEED_BASE + shotNum,
      hide_watermark: true,
      safe_mode: false,
    });

    const b64 = resp.images[0]?.b64_json;
    if (!b64) throw new Error("Venice returned no image data");
    const buf = Buffer.from(b64, "base64");
    if (buf.length < MIN_REAL_BYTES) {
      throw new Error(
        `Venice returned ${buf.length}-byte placeholder (likely moderation rejection). ` +
        `Real seedream-v5-lite outputs are >400KB.`,
      );
    }

    await mkdir(SHOTS_DIR, { recursive: true });
    await writeFile(out, buf);
    await writeImageProvenance(out, MODELS.imageGen);

    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`  ✨ shot-${String(shotNum).padStart(3, "0")}.png  (${dt}s, ${(buf.length / 1024).toFixed(0)}KB)`);
  } catch (err) {
    const msg = err instanceof VeniceRequestError
      ? `Venice ${err.status}: ${err.message} | body=${JSON.stringify(err.body).slice(0, 400)}`
      : err instanceof Error ? err.message : String(err);
    await journal(
      "Stage 2 — Storyboard panels",
      "MODEL",
      `Failed to generate shot-${String(shotNum).padStart(3, "0")}.png`,
      `**Prompt (truncated):**\n\n\`\`\`\n${prompt.slice(0, 1200)}\n\`\`\`\n\n**Error:** ${msg}`,
    );
    throw err;
  }
}

async function main(): Promise<void> {
  banner("STAGE 2 — Storyboard panel generation");
  if (!process.env.VENICE_API_KEY) {
    console.error("VENICE_API_KEY not set in environment.");
    process.exit(1);
  }

  const client = new VeniceClient();
  const targets = ONLY_NUM
    ? SHOTLIST.filter(s => s.num === parseInt(ONLY_NUM, 10))
    : SHOTLIST;

  if (targets.length === 0) {
    console.error(`No shot matched --only=${ONLY_NUM}`);
    process.exit(1);
  }

  console.log(`Image model: ${MODELS.imageGen}`);
  console.log(`Resolution:  2K @ 16:9`);
  console.log(`Shots:       ${targets.map(s => s.num).join(", ")}`);
  console.log(`Force:       ${FORCE ? "YES (prior versions archived)" : "no"}`);

  for (const shot of targets) {
    console.log(`\n──── Shot ${shot.num} ────`);
    const prompt = buildPanelPrompt(shot.panelPrompt);
    await generateOnePanel(client, shot.num, prompt);
    await sleep(150);
  }

  banner(`STAGE 2 COMPLETE — ${targets.length} panel(s) attempted`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
