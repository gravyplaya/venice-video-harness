# Venice Video Harness

This workspace is an agent-first, Venice-optimized harness for **consistency-first video creation at any length and format**.

It is meant to be operated through natural language in an IDE like Cursor or VS Code with an agent such as Claude Code. The user should not be asked to run terminal commands manually. The agent reads the rules, selects the right playbooks, and executes code as needed.

## What This Harness Does

1. Helps an agent plan and execute consistency-first Venice video workflows
2. Supports recurring characters, locked visual systems, and reference-driven generation
3. Provides reusable orchestration through `CLAUDE.md`, `.claude/commands/`, `.claude/agents/`, and `.claude/skills/`
4. Includes a comprehensive model registry covering 50+ Venice video, image, audio, and music models
5. Includes a working narrative reference implementation in `src/mini-drama/`
6. Preserves generated media by archiving instead of destructively replacing

## Supported Use Cases

This harness is not limited to any single video format. It supports:

- **Episodic series** (drama, comedy, documentary, educational)
- **Trailers and teasers**
- **Branded cinematic sequences**
- **Product launch videos**
- **Recurring-character social content**
- **Narrative explainers**
- **Style-locked creative campaigns**
- **Long-form content** (assemble multi-shot sequences of any length)
- **Any Venice workflow where visual continuity matters**

## How To Operate

The intended interface is:
- Natural-language requests to the agent
- Orchestration rules in `CLAUDE.md`
- Workflow playbooks in `.claude/commands/`
- Reusable Venice knowledge in `.claude/skills/`
- Underlying TypeScript and script execution in `src/` and `scripts/`

The CLI and scripts are the execution layer underneath the harness, not the primary user interface.

## Venice API Coverage

### Video Endpoints

| Endpoint | Purpose | Module |
|----------|---------|--------|
| `POST /video/queue` | Queue video generation | `src/venice/video.ts` |
| `POST /video/retrieve` | Poll/download result | `src/venice/video.ts` |
| `POST /video/quote` | Get cost estimate | `src/venice/video.ts` |
| `POST /video/complete` | Cleanup after download | `src/venice/video.ts` |

### Image Endpoints

| Endpoint | Purpose | Module |
|----------|---------|--------|
| `POST /image/generate` | Text-to-image | `src/venice/generate.ts` |
| `POST /image/multi-edit` | Layered multi-image editing | `src/venice/multi-edit.ts` |
| `POST /image/upscale` | AI upscaling | `src/venice/edit.ts` |
| `POST /image/background-remove` | Background removal | `src/venice/edit.ts` |
| `POST /images/edit` | **DEPRECATED** (May 2025) | `src/venice/edit.ts` |

### Audio Endpoints

| Endpoint | Purpose | Module |
|----------|---------|--------|
| `POST /audio/speech` | Text-to-speech (Kokoro, Qwen3) | `src/venice/audio.ts` |
| `POST /audio/queue` | Queue music/SFX generation | `src/venice/audio.ts` |
| `POST /audio/retrieve` | Poll/download audio result | `src/venice/audio.ts` |
| `POST /audio/complete` | Cleanup after download | `src/venice/audio.ts` |

### Chat Endpoint

| Endpoint | Purpose | Module |
|----------|---------|--------|
| `POST /chat/completions` | Vision-based QA, script generation | `src/venice/client.ts` |

## Model Registry

The full model registry lives in `src/venice/models.ts` with typed specs for every model. Key categories:

### Video Models (50+ models)

**Action / Movement / Dialogue:**
- `kling-v3-pro-image-to-video` (3-15s, audio, `end_image_url`)
- `kling-o3-pro-image-to-video` (3-15s, audio, `end_image_url`)
- `kling-2.6-pro-image-to-video` (5-10s, audio, `end_image_url`)
- `wan-2.6-image-to-video` (5-15s, 1080p, audio, `audio_url` input)
- `sora-2-pro-image-to-video` (4-12s, 1080p, audio)

**Atmosphere / Establishing / Mood:**
- `veo3.1-fast-image-to-video` (default atmosphere model, 4-8s, up to 4K, audio)
- `veo3-fast-image-to-video` (8s, audio)
- `pixverse-v5.6-image-to-video` (5-8s, up to 1080p, audio)

**Character Consistency (Reference-to-Video):**
- `kling-o3-standard-reference-to-video` (default R2V, 3-15s, `elements`, `reference_image_urls`, `scene_image_urls`)
- `kling-o3-pro-reference-to-video` (3-15s, full reference support)

**Long Duration:**
- `longcat-image-to-video` / `longcat-distilled-image-to-video` (up to **30s**, no audio)
- `ltx-2-fast-image-to-video` / `ltx-2-v2-3-fast-image-to-video` (up to **20s**, up to 4K)
- `ltx-2-19b-full-image-to-video` (up to **18s**, audio)

**Budget / Fast:**
- `wan-2.6-flash-image-to-video` (5-15s, fast)
- `kling-v3-standard-image-to-video` (3-15s)
- `grok-imagine-image-to-video` (5-15s)

### Video Model Capabilities

| Capability | Models |
|-----------|--------|
| `elements` (structured @Element refs) | Kling O3 R2V (standard + pro) |
| `reference_image_urls` (flat ref array) | Kling O3 R2V, Vidu Q3 |
| `scene_image_urls` (environment refs) | Kling O3 R2V (standard + pro) |
| `end_image_url` (frame targeting) | All Kling image-to-video, PixVerse Transition |
| `audio_url` (background audio input) | Wan 2.6, Wan 2.5 Preview |
| 4K output | Veo 3.1, LTX 2.0 |
| 30s duration | Longcat |
| 20s duration | LTX 2.0 Fast, LTX 2.0 v2.3 Fast |

### Image Generation Models

`nano-banana-pro` (default for storyboard), `nano-banana-2`, `flux-2-pro`, `flux-2-max`, `gpt-image-1-5`, `grok-imagine`, `hunyuan-image-v3`, `qwen-image-2`, `qwen-image-2-pro`, `recraft-v4`, `recraft-v4-pro`, `seedream-v4`, `seedream-v5-lite`, `chroma`, `hidream`, and more.

### Multi-Edit Models (10 models)

`qwen-edit`, `qwen-image-2-edit`, `qwen-image-2-pro-edit`, `flux-2-max-edit`, `gpt-image-1-5-edit`, `grok-imagine-edit`, `nano-banana-2-edit`, `nano-banana-pro-edit`, `seedream-v4-edit`, `seedream-v5-lite-edit`

### TTS Models

- **Kokoro** (`tts-kokoro`): 50+ voices across English, Chinese, Japanese, Korean, Spanish, French, Hindi, Italian, Portuguese
- **Qwen3** (`tts-qwen3-0-6b`, `tts-qwen3-1-7b`): Style-prompted voices (Vivian, Serena, Dylan, Eric, Ryan, Aiden, etc.) with emotion/delivery control
- **ElevenLabs** (`elevenlabs-tts-v3`, `elevenlabs-tts-multilingual-v2`): Premium TTS

### Music / SFX Models

- **Music**: `elevenlabs-music`, `minimax-music-v2`, `ace-step-15`, `stable-audio-25`
- **SFX**: `elevenlabs-sound-effects-v2`, `mmaudio-v2-text-to-audio`

## Default Venice Routing

**Core principle: R2V by default, atmosphere model only for empty establishing shots.**

Almost all shots should use the R2V (reference-to-video) model — it supports `elements` and `reference_image_urls` for identity anchoring and delivers the best consistency across shots. The only exception is truly empty establishing/mood shots with no characters or story subjects, which can use the atmosphere model for maximum visual quality.

Preferred defaults (overridable per-project via `series.json` → `videoDefaults`):

| Role | Default Model | When Used |
|------|--------------|-----------|
| Default (all non-establishing) | `kling-o3-standard-reference-to-video` | All shots with characters or story action — `elements` + `reference_image_urls` for identity anchoring |
| Establishing / mood only | `veo3.1-fast-image-to-video` | Empty establishing/mood shots with no characters — up to 4K, great visual quality |
| Image Generation | `nano-banana-pro` | Best prompt adherence with `cfg_scale: 10` |
| Multi-Edit | `nano-banana-pro-edit` | Reliable character correction |
| TTS | `tts-kokoro` | 50+ voices, fast, consistent |
| Music | `elevenlabs-music` | High quality music generation |
| SFX | `elevenlabs-sound-effects-v2` | Best sound effect quality |

## Video Queue Request Parameters

The full request schema for `POST /api/v1/video/queue`:

```json
{
  "model": "kling-v3-pro-image-to-video",
  "prompt": "A slow dolly shot pushes forward...",
  "duration": "8s",
  "image_url": "data:image/png;base64,...",
  "end_image_url": "data:image/png;base64,...",
  "negative_prompt": "low quality, blurry",
  "aspect_ratio": "9:16",
  "resolution": "1080p",
  "audio": true,
  "audio_url": "data:audio/mpeg;base64,...",
  "video_url": "data:video/mp4;base64,...",
  "reference_image_urls": ["data:image/png;base64,..."],
  "elements": [
    {
      "frontal_image_url": "data:image/png;base64,...",
      "reference_image_urls": ["data:image/png;base64,..."],
      "video_url": "data:video/mp4;base64,..."
    }
  ],
  "scene_image_urls": ["data:image/png;base64,..."]
}
```

**Parameter availability is model-dependent.** The harness automatically skips unsupported params per model. Use `getVideoModel()` from `src/venice/models.ts` to check capabilities.

## Architecture

```
src/
  venice/           Venice API client layer (model-agnostic)
    client.ts       HTTP transport with retries and rate limiting
    models.ts       Complete model registry with capabilities
    video.ts        Video queue/retrieve/quote/complete
    generate.ts     Image generation
    multi-edit.ts   Multi-image layered editing
    edit.ts         Upscale, background remove
    audio.ts        TTS, music, SFX, queued audio
    voices.ts       Voice catalog (Kokoro + Qwen3)
    types.ts        Full API type definitions
  series/           Project state and character management
    types.ts        Character, ShotScript, SeriesState types
    manager.ts      Create/load/save series
  mini-drama/       Reference narrative video implementation
    cli.ts          Commander CLI (25+ commands)
    prompt-builder  Image + video prompt construction
    video-generator Video rendering with frame chaining
    generation-planner  Single vs multi-shot planning (up to 6 shots per unit)
    panel-fixer     Multi-edit character correction
    subtitle-generator  SRT from script
    assembler       Video assembly + audio mix
  storyboard/       Legacy screenplay pipeline
  characters/       Character extraction
  parsers/          Fountain + PDF parsing
  assembly/         Remotion scaffold
```

## Included Reference Implementation

The `src/mini-drama/` directory contains a full narrative video pipeline. It demonstrates:

- Series creation with locked aesthetics and seed
- Character design with 4-angle reference images
- Voice audition and locking via Venice TTS
- Episode script workshopping via LLM
- Two-pass storyboard generation (generate + multi-edit refine)
- Vision-based QA for character/setting consistency
- Video generation with model routing and frame chaining
- Audio post-production with layered ambient beds
- Subtitle burn-in and final assembly

Use it directly for narrative content, or adapt the patterns for any format.

## Budgeting

This harness is quality-first, not bargain-first. When planning runs, account for:
- Image generation + multi-edit refinement passes
- Video generation (varies by model and duration)
- Venice TTS, SFX, ambience, and music
- Re-renders needed to fix continuity issues

Use `POST /video/quote` (via `quoteVideo()`) to estimate costs before committing to generation.

## Agent Rules

1. Never ask the user to run terminal commands manually.
2. Treat the user's natural-language request as the primary interface.
3. Read the relevant command/playbook before executing a workflow.
4. Prefer reusable harness patterns over one-off hacks.
5. Preserve generated shot assets by archiving prior versions instead of deleting them.
6. Keep secrets out of source control.
7. Use the model registry (`src/venice/models.ts`) to validate model capabilities before making API calls.
8. Check model support for `elements`, `reference_image_urls`, `scene_image_urls`, `end_image_url`, and `audio_url` before including them in requests.
9. **Never group shots with different characters into multi-shot units.** Multi-shot grouping requires pairwise character overlap between consecutive shots — shots cutting between different speakers (e.g., host → guest) must be separate singles so each gets R2V identity anchoring.
10. **Always validate durations against model specs.** The atmosphere model (`veo3.1-fast-image-to-video`) only accepts 4s/6s/8s — never use 3s or 5s. The video queue function auto-snaps invalid durations to the nearest valid value.
11. **Front-load style in all prompts.** Aesthetic/style descriptions must appear at the START of prompts, not buried at the end. This prevents style drift across angles and shots.
12. **Use cfg_scale 10 for character references and storyboard panels.** Lower values (e.g., 7) allow the model too much freedom, causing style inconsistency between angles.

## Learned Anti-Patterns (Production Issues Log)

Issues discovered during production and their fixes. The agent should internalize these to avoid repeating them.

### 1. Multi-Shot Grouping Bug: Wrong Character Overlap Check
**Symptom:** Shots cutting between different characters (e.g., Chad-only → Vivienne-only) were grouped into Kling multi-shot units, which use `kling-o3-pro-image-to-video` — a model with NO `elements` or `reference_image_urls` support. Characters lost all identity anchoring.
**Root cause:** `hasOverlappingCharacters()` checked each shot's characters against the union pool instead of requiring pairwise overlap between consecutive shots.
**Fix:** Rewrote to require every consecutive pair of shots to share at least one character. Shots with disjoint characters now always render as singles with R2V.
**File:** `src/mini-drama/generation-planner.ts`

### 2. Character Reference Style Inconsistency Across Angles
**Symptom:** Front-facing reference was cartoon/stylized but profile and full-body drifted to photorealistic.
**Root cause:** (a) Aesthetic description was at the END of the prompt — the model committed to a rendering style before seeing the style instructions. (b) `cfg_scale: 7` gave the model too much latitude. (c) No anti-realism terms in negative prompt.
**Fix:** (a) Front-loaded `STYLE:` prefix and added `STYLE REMINDER:` suffix in `buildCharacterReferencePrompt`. (b) Bumped `cfg_scale` to 10. (c) Added `photorealistic, photograph, photo` to negative prompt.
**Files:** `src/mini-drama/prompt-builder.ts`, `src/mini-drama/cli.ts`
**Fallback:** When base generation still drifts, use a two-pass approach: generate base image, then style-match via multi-edit against a good reference shot.

### 3. Atmosphere Model Duration Validation
**Symptom:** `veo3.1-fast-image-to-video` returned 400 error for `duration: "3s"` — it only accepts 4s/6s/8s.
**Root cause:** Script had 3s establishing/insert shots. No validation against model's allowed durations.
**Fix:** Added auto-snap in `queueVideo()` that checks the model's duration spec and snaps to nearest valid value with a warning.
**File:** `src/venice/video.ts`

### 4. Talk Show Format: All Character Shots Must Be R2V Singles
**Symptom:** Character appearance was inconsistent between cuts in talk show format.
**Root cause:** The generation planner was optimizing for temporal continuity (multi-shot grouping) when the format actually needs identity consistency (R2V singles with reference anchoring).
**Fix:** For formats with frequent speaker cuts (talk shows, interviews, panels), set `mustStaySingle: true` on all shots or ensure no cross-character grouping occurs. Every character shot uses `kling-o3-standard-reference-to-video` with `elements` for frontal reference and `reference_image_urls` for angle coverage.

## Output

Generated project output belongs in:

```text
output/
```

No active generated projects are included in this harness copy.

## Environment

- `VENICE_API_KEY` in `.env` (required)
- `ffmpeg` and `ffprobe` on PATH (for video/audio processing)
- Node.js 20+ with TypeScript (ES modules, Node16 resolution)

## Important

- This is an agent-operated harness first, not a CLI-first app
- It is Venice-specific and consistency-focused by design
- The included mini-drama workflow is a reference implementation, not the only intended use case
- The model registry is synced from the live Venice API -- update it when Venice adds new models
