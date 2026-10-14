// ---------------------------------------------------------------------------
// Line prefixes for concurrent output.
//
// generate-videos renders several units at once, and each unit logs with
// console.log from deep in the call stack (queue, poll, download, cut). Side by
// side those lines are unreadable unless each one says which unit wrote it.
//
// As in session/output-router.ts, stdout/stderr are patched once and the prefix
// travels in AsyncLocalStorage, so no call site changes. The patch is installed
// lazily, on first use, so in the shell it wraps the output router and a
// backgrounded render's captured log keeps its prefixes.
// ---------------------------------------------------------------------------

import { AsyncLocalStorage } from 'node:async_hooks';

interface PrefixState {
  prefix: string;
  atLineStart: boolean;
}

type WriteFn = typeof process.stdout.write;

const storage = new AsyncLocalStorage<PrefixState>();
const PATCHED = Symbol.for('venice-video-harness.line-prefix');

/** Insert `state.prefix` at the start of every line in `text`. Exported for tests. */
export function prefixLines(text: string, state: PrefixState): string {
  let out = '';
  for (const piece of text.split(/(\r\n|\n|\r)/)) {
    if (piece === '\r\n' || piece === '\n' || piece === '\r') {
      out += piece;
      state.atLineStart = true;
    } else if (piece) {
      if (state.atLineStart) out += state.prefix;
      out += piece;
      state.atLineStart = false;
    }
  }
  return out;
}

function install(stream: NodeJS.WriteStream): void {
  const current = stream.write as WriteFn & { [PATCHED]?: true };
  if (current[PATCHED]) return;

  const write = function write(
    this: unknown,
    chunk: string | Uint8Array,
    encoding?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void,
  ): boolean {
    const state = storage.getStore();
    const call = current as (...args: unknown[]) => boolean;
    if (!state) return call.call(stream, chunk, encoding, callback);

    if (typeof chunk === 'string') {
      return call.call(stream, prefixLines(chunk, state), encoding, callback);
    }
    const text = prefixLines(Buffer.from(chunk).toString('utf-8'), state);
    return typeof encoding === 'function'
      ? call.call(stream, text, encoding)
      : call.call(stream, text, 'utf-8', callback);
  } as WriteFn & { [PATCHED]?: true };
  write[PATCHED] = true;
  stream.write = write;
}

/** Run `fn` with every line it writes to stdout/stderr prefixed by `prefix`. */
export function runWithLinePrefix<T>(prefix: string, fn: () => Promise<T>): Promise<T> {
  install(process.stdout);
  install(process.stderr);
  return storage.run({ prefix, atLineStart: true }, fn);
}

/**
 * True inside runWithLinePrefix. Other output is interleaved with this
 * caller's, so a `\r` progress line would be overwritten by the next unit's
 * line; callers print whole lines instead.
 */
export function hasLinePrefix(): boolean {
  return storage.getStore() !== undefined;
}
