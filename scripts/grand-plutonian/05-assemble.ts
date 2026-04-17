/**
 * STAGE 5 — Final assembly
 *
 * Step A: Concatenate shots 1-6 → silent video track with title cards burned in
 *         on Shot 1 (CHAPTER ONE / THE DEPARTURE) and Shot 6 (THE GRAND PLUTONIAN
 *         / THIS WINTER — A FILM ABOUT LEAVING).
 * Step B: Mix VO (-3dB, starts at 1.5s), music bed (-16dB, looped), SFX (-22dB,
 *         looped) under the silent video → trailer-final.mp4.
 *
 * Pure ffmpeg — no Venice calls. Re-runnable; outputs go to output/grand-plutonian/.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  PROJECT_DIR,
  SHOTS_DIR,
  AUDIO_DIR,
  BUILD_DIR,
  SHOTLIST,
  MIX,
} from "./config.js";
import { banner } from "./utils.js";

const run = promisify(execFile);
const FORCE = process.argv.includes("--force");

// Font picked from /System/Library/Fonts/ — tested with drawtext above.
const FONT = "Avenir Next";

// Title card layouts (x/y in pixels for 1280x720; use "center" logic via x=(w-text_w)/2)
interface TitleBeat {
  shotNum: number;
  mainText: string;
  mainSize: number;
  subText?: string;
  subSize?: number;
  /** seconds into the shot when fade-in begins */
  fadeInAt: number;
  /** seconds into the shot when fade-out ends (if omitted, holds to end of shot) */
  fadeOutEnd?: number;
  /** vertical position: "upper" | "center" | "lower". Default center. */
  position?: "upper" | "center" | "lower";
}

const TITLE_BEATS: TitleBeat[] = [
  {
    shotNum: 1,
    mainText: "CHAPTER ONE",
    mainSize: 100,
    subText: "THE DEPARTURE",
    subSize: 72,
    fadeInAt: 0.6,
    fadeOutEnd: 4.2,
    position: "center",
  },
  {
    shotNum: 6,
    mainText: "THE GRAND PLUTONIAN",
    mainSize: 95,
    subText: "THIS WINTER — A FILM ABOUT LEAVING",
    subSize: 34,
    fadeInAt: 0.8,
    position: "center",
  },
];

// ---- Helpers --------------------------------------------------------------

function beatForShot(num: number): TitleBeat | undefined {
  return TITLE_BEATS.find(b => b.shotNum === num);
}

/**
 * Write small text files to disk for ffmpeg's `textfile=` param — avoids
 * all shell-escaping nightmares (em-dashes, quotes, unicode, etc.).
 */
async function writeTitleTextFiles(): Promise<void> {
  await mkdir(BUILD_DIR, { recursive: true });
  for (const beat of TITLE_BEATS) {
    await writeFile(join(BUILD_DIR, `title-${beat.shotNum}-main.txt`), beat.mainText, "utf-8");
    if (beat.subText) {
      await writeFile(join(BUILD_DIR, `title-${beat.shotNum}-sub.txt`), beat.subText, "utf-8");
    }
  }
}

/**
 * For one shot file, return an ffmpeg filter chain that:
 *   - (if no title beat) passes through untouched, just scaled to 1280x720
 *   - (with title beat) overlays two text layers with alpha fade envelope
 *
 * `labelIn` / `labelOut` are the stream labels.
 */
function filterChainForShot(
  shot: typeof SHOTLIST[number],
  labelIn: string,
  labelOut: string,
): string {
  const beat = beatForShot(shot.num);
  if (!beat) {
    return `[${labelIn}]scale=1280:720,setsar=1,format=yuv420p[${labelOut}]`;
  }

  const duration = 5.04; // match actual Seedance output
  const fadeInDur = 0.5;
  const fadeOutDur = 0.6;
  const fadeOutEnd = beat.fadeOutEnd ?? duration;
  const holdEnd = fadeOutEnd - fadeOutDur;
  const fadeOutStart = holdEnd;

  // Alpha envelope expression: 0→1 over [fadeInAt, fadeInAt+fadeInDur],
  //                            hold 1 over [fadeInAt+fadeInDur, fadeOutStart],
  //                            1→0 over [fadeOutStart, fadeOutEnd]
  const fadeInEnd = beat.fadeInAt + fadeInDur;
  const alphaExpr =
    `if(lt(t,${beat.fadeInAt}),0,` +
    `if(lt(t,${fadeInEnd}),(t-${beat.fadeInAt})/${fadeInDur},` +
    `if(lt(t,${fadeOutStart}),1,` +
    `if(lt(t,${fadeOutEnd}),1-(t-${fadeOutStart})/${fadeOutDur},0))))`;

  // Vertical positioning. Main text vertically centered, sub 40px below.
  const yMain =
    beat.position === "upper" ? "(h/4)-text_h/2" :
    beat.position === "lower" ? "(h*3/4)-text_h/2" :
    beat.subText ? "(h-text_h)/2-40" : "(h-text_h)/2";
  const ySub = beat.subText
    ? (beat.position === "upper" ? "(h/4)-text_h/2+80" :
       beat.position === "lower" ? "(h*3/4)-text_h/2+80" :
       "(h-text_h)/2+55")
    : "";

  const mainTxt = join(BUILD_DIR, `title-${beat.shotNum}-main.txt`);
  const subTxt = join(BUILD_DIR, `title-${beat.shotNum}-sub.txt`);

  // drawtext params. `alpha` supports a time-varying expression via 'alpha=...'
  const mainDraw =
    `drawtext=font='${FONT}':textfile='${mainTxt}':fontsize=${beat.mainSize}` +
    `:fontcolor=white` +
    `:alpha='${alphaExpr}'` +
    `:x=(w-text_w)/2:y=${yMain}` +
    `:borderw=3:bordercolor=black@0.5`;

  const subDraw = beat.subText
    ? `,drawtext=font='${FONT}':textfile='${subTxt}':fontsize=${beat.subSize}` +
      `:fontcolor=white` +
      `:alpha='${alphaExpr}'` +
      `:x=(w-text_w)/2:y=${ySub}` +
      `:borderw=2:bordercolor=black@0.5`
    : "";

  return `[${labelIn}]scale=1280:720,setsar=1,${mainDraw}${subDraw},format=yuv420p[${labelOut}]`;
}

// ---- Step A: concat + burn in titles -------------------------------------

async function buildSilentVideo(): Promise<string> {
  banner("STAGE 5A — Concatenate + title overlays");
  const outPath = join(BUILD_DIR, "silent.mp4");
  if (existsSync(outPath) && !FORCE) {
    console.log(`  ✓ exists: build/silent.mp4 (skipping — use --force to rebuild)`);
    return outPath;
  }

  await writeTitleTextFiles();
  await mkdir(BUILD_DIR, { recursive: true });

  // Build filter_complex: per-shot drawtext → concat
  const filters: string[] = [];
  const concatInputs: string[] = [];
  for (let i = 0; i < SHOTLIST.length; i++) {
    const shot = SHOTLIST[i];
    const labelIn = `${i}:v`;
    const labelOut = `v${i}`;
    filters.push(filterChainForShot(shot, labelIn, labelOut));
    concatInputs.push(`[${labelOut}]`);
  }
  filters.push(`${concatInputs.join("")}concat=n=${SHOTLIST.length}:v=1:a=0[vout]`);

  const inputs: string[] = [];
  for (const shot of SHOTLIST) {
    inputs.push("-i", join(SHOTS_DIR, `shot-${String(shot.num).padStart(3, "0")}.mp4`));
  }

  const args = [
    "-y", "-hide_banner",
    ...inputs,
    "-filter_complex", filters.join(";"),
    "-map", "[vout]",
    "-c:v", "libx264",
    "-crf", "18",
    "-preset", "medium",
    "-pix_fmt", "yuv420p",
    outPath,
  ];

  console.log("  Running ffmpeg concat + drawtext ...");
  const t0 = Date.now();
  const { stderr } = await run("ffmpeg", args).catch(e => {
    console.error("ffmpeg stderr:", e.stderr?.toString?.() ?? e);
    throw e;
  });
  void stderr;
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  ✨ build/silent.mp4 (${dt}s)`);
  return outPath;
}

// ---- Step B: mix audio ---------------------------------------------------

async function mixFinal(silentVideo: string): Promise<string> {
  banner("STAGE 5B — Audio mix");
  const outPath = join(PROJECT_DIR, "trailer-final.mp4");
  if (existsSync(outPath) && !FORCE) {
    console.log(`  ✓ exists: trailer-final.mp4 (skipping — use --force to rebuild)`);
    return outPath;
  }

  const voPath = join(AUDIO_DIR, "vo.mp3");
  const musicPath = join(AUDIO_DIR, "music.mp3");
  const sfxPath = join(AUDIO_DIR, "sfx.mp3");

  if (!existsSync(voPath) || !existsSync(musicPath) || !existsSync(sfxPath)) {
    throw new Error("Missing audio files — run Stage 4 first.");
  }

  // Mix plan:
  //  - VO starts at 1.5s, played at MIX.voDb
  //  - Music starts at 0, looped/padded to 30s, at MIX.musicDb, with 2s fade-in and 2s fade-out
  //  - SFX looped to 30s, at MIX.sfxDb, with 2s fade-in and 2s fade-out
  //  - Video = silent.mp4

  // Total target duration
  const targetSec = 30.25; // actual concatenated video duration

  const filter = [
    // VO: delay, volume
    `[0:a]adelay=1500|1500,volume=${db(MIX.voDb)}[vo]`,
    // Music: loop to cover full duration, fade in/out, volume
    `[1:a]aloop=loop=-1:size=2e9,atrim=0:${targetSec},afade=t=in:st=0:d=1.5,afade=t=out:st=${targetSec - 1.5}:d=1.5,volume=${db(MIX.musicDb)}[mus]`,
    // SFX: loop to cover full duration, fade in/out, volume
    `[2:a]aloop=loop=-1:size=2e9,atrim=0:${targetSec},afade=t=in:st=0:d=1.5,afade=t=out:st=${targetSec - 1.5}:d=1.5,volume=${db(MIX.sfxDb)}[sfx]`,
    // Mix them
    `[vo][mus][sfx]amix=inputs=3:duration=longest:normalize=0[aout]`,
  ].join(";");

  const args = [
    "-y", "-hide_banner",
    "-i", voPath,        // [0:a]
    "-i", musicPath,     // [1:a]
    "-i", sfxPath,       // [2:a]
    "-i", silentVideo,   // [3:v]
    "-filter_complex", filter,
    "-map", "3:v",
    "-map", "[aout]",
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    outPath,
  ];

  console.log("  Mixing VO + music + SFX under silent video ...");
  const t0 = Date.now();
  const { stderr } = await run("ffmpeg", args).catch(e => {
    console.error("ffmpeg stderr:", e.stderr?.toString?.() ?? e);
    throw e;
  });
  void stderr;
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  ✨ trailer-final.mp4 (${dt}s)`);
  return outPath;
}

function db(level: number): string {
  // ffmpeg volume= accepts raw decibel value like "-6dB"
  return `${level}dB`;
}

// ---- main ----------------------------------------------------------------

async function main(): Promise<void> {
  const silent = await buildSilentVideo();
  const final = await mixFinal(silent);
  banner("STAGE 5 COMPLETE");
  console.log(`\n🎬 Final trailer: ${resolve(final)}`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
