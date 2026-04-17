/**
 * STAGE 4 — Audio generation
 *
 * Produces three audio tracks:
 *   - audio/vo.mp3        VO narration via Kokoro (tts-kokoro, bm_george)
 *   - audio/music.mp3     30s instrumental bed via ElevenLabs Music
 *   - audio/sfx.mp3       30s train ambience via ElevenLabs SFX
 *
 * These are then mixed in Stage 5 by ffmpeg.
 *
 * Re-runnable: skips files that already exist. Pass `--force` to regen.
 */

import "dotenv/config";
import { mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { VeniceClient, VeniceRequestError } from "../../src/venice/client.js";
import {
  generateSpeech,
  generateMusic,
  generateSoundEffect,
} from "../../src/venice/audio.js";

import {
  AUDIO_DIR,
  ARCHIVE_DIR,
  MODELS,
  VO_TEXT,
  MUSIC_PROMPT,
  SFX_PROMPT,
} from "./config.js";
import { banner, journal } from "./utils.js";
import { rename } from "node:fs/promises";

const FORCE = process.argv.includes("--force");
const ONLY = process.argv.find(a => a.startsWith("--only="))?.split("=")[1];

async function archiveExisting(path: string): Promise<void> {
  if (!existsSync(path)) return;
  await mkdir(ARCHIVE_DIR, { recursive: true });
  let v = 1;
  let archivePath = join(ARCHIVE_DIR, `audio__${path.split("/").pop()!.replace(".mp3", "")}.v${v}.mp3`);
  while (existsSync(archivePath)) {
    v++;
    archivePath = join(ARCHIVE_DIR, `audio__${path.split("/").pop()!.replace(".mp3", "")}.v${v}.mp3`);
  }
  await rename(path, archivePath);
}

async function runTask(
  label: string,
  outPath: string,
  task: () => Promise<string>,
): Promise<void> {
  if (ONLY && ONLY !== label) return;

  if (existsSync(outPath) && !FORCE) {
    console.log(`  ✓ exists: ${outPath.split("/").pop()}`);
    return;
  }
  if (existsSync(outPath) && FORCE) {
    await archiveExisting(outPath);
    console.log(`  📦 archived prior ${outPath.split("/").pop()}`);
  }

  const t0 = Date.now();
  try {
    await task();
    const s = await stat(outPath);
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`  ✨ ${outPath.split("/").pop()}  (${dt}s, ${(s.size / 1024).toFixed(0)}KB)`);
  } catch (err) {
    const msg = err instanceof VeniceRequestError
      ? `${err.status}: ${err.message} | body=${JSON.stringify(err.body).slice(0, 400)}`
      : err instanceof Error ? err.message : String(err);
    await journal(
      "Stage 4 — Audio",
      "MODEL",
      `Failed ${label}`,
      `**Error:** ${msg}`,
    );
    throw err;
  }
}

async function main(): Promise<void> {
  banner("STAGE 4 — Audio generation");
  if (!process.env.VENICE_API_KEY) {
    console.error("VENICE_API_KEY not set.");
    process.exit(1);
  }

  const client = new VeniceClient();
  await mkdir(AUDIO_DIR, { recursive: true });

  const voPath = join(AUDIO_DIR, "vo.mp3");
  const musicPath = join(AUDIO_DIR, "music.mp3");
  const sfxPath = join(AUDIO_DIR, "sfx.mp3");

  console.log(`TTS voice: ${MODELS.ttsVoice} (${MODELS.ttsModel})`);
  console.log(`Music model: ${MODELS.musicModel}`);
  console.log(`SFX model:   ${MODELS.sfxModel}`);
  console.log("");

  // VO (fast, ~5s)
  await runTask("vo", voPath, async () => {
    return generateSpeech(
      client,
      {
        voiceId: MODELS.ttsVoice,
        text: VO_TEXT,
        modelId: MODELS.ttsModel,
        speed: 0.92, // slightly slower for deadpan delivery
        responseFormat: "mp3",
      },
      voPath,
    );
  });

  // Music bed (~60-120s generation for 30s track)
  await runTask("music", musicPath, async () => {
    return generateMusic(
      client,
      {
        prompt: MUSIC_PROMPT,
        modelId: MODELS.musicModel,
        durationSeconds: 32, // small pad so we don't cut short
        forceInstrumental: true,
      },
      musicPath,
    );
  });

  // SFX bed. ElevenLabs SFX v2 caps at ~22s per call; we loop in ffmpeg at assembly.
  await runTask("sfx", sfxPath, async () => {
    return generateSoundEffect(
      client,
      {
        text: SFX_PROMPT,
        durationSeconds: 16,
        modelId: MODELS.sfxModel,
      },
      sfxPath,
    );
  });

  banner("STAGE 4 COMPLETE");
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
