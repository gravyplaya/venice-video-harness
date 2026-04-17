/**
 * Utility helpers shared by the Grand Plutonian stage scripts.
 *
 * - journal()        Append a timestamped entry to BUILD_JOURNAL.md
 * - sectionHeader()  Replace placeholder `(entries appended ...)` lines on first write
 * - dataUri()        Convert base64 PNG to data: URI for video reference inputs
 * - encodeFileToB64  Read a PNG/MP4 from disk and return its base64 string
 * - sleep(ms)        Plain promise sleep
 * - savePngFromB64   Write a base64 PNG and its provenance sidecar in one go
 */

import { appendFile, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { JOURNAL_PATH } from "./config.js";

export type JournalTag = "HARNESS" | "MODEL" | "PROMPT" | "WORKFLOW" | "ENV";

/** Append a timestamped journal entry. Creates the file if missing. */
export async function journal(
  stage: string,
  tag: JournalTag,
  title: string,
  body: string,
): Promise<void> {
  const ts = new Date().toISOString();
  const entry = [
    ``,
    `### \`${tag}\` — ${title}`,
    `- **When:** ${ts}`,
    `- **Stage:** ${stage}`,
    body
      .split("\n")
      .map(line => (line.trim() ? `  ${line}` : ""))
      .join("\n"),
    ``,
  ].join("\n");

  if (!existsSync(JOURNAL_PATH)) {
    await mkdir(dirname(JOURNAL_PATH), { recursive: true });
    await writeFile(JOURNAL_PATH, `# BUILD JOURNAL\n`, "utf-8");
  }
  await appendFile(JOURNAL_PATH, entry, "utf-8");
}

/** Sleep helper. */
export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/** Convert a base64 string to a data: URI. */
export function dataUri(base64: string, mime: "image/png" | "video/mp4" | "audio/mpeg" = "image/png"): string {
  return `data:${mime};base64,${base64}`;
}

/** Read a file from disk and return base64 (no data: prefix). */
export async function encodeFileToB64(path: string): Promise<string> {
  const buf = await readFile(path);
  return buf.toString("base64");
}

/** Read a file from disk and return a data: URI. */
export async function fileToDataUri(
  path: string,
  mime: "image/png" | "video/mp4" | "audio/mpeg" = "image/png",
): Promise<string> {
  return dataUri(await encodeFileToB64(path), mime);
}

/** Pretty-print a section banner to stdout. */
export function banner(label: string): void {
  const bar = "─".repeat(Math.max(8, 70 - label.length));
  console.log(`\n── ${label} ${bar}`);
}

/** Resolve a project-relative path. */
export function p(...parts: string[]): string {
  return resolve(...parts);
}
