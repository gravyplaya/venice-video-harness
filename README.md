# Venice Video Harness

Agent-first, Venice-optimized tooling for **consistency-first video creation** at any length.

This harness is built for creators who want an IDE agent (Claude Code, Cursor, etc.) to operate a reusable Venice production system for:

- **Character-consistent video projects** (any genre, any length)
- **Visual-style-locked series or campaigns**
- **Storyboard-to-video workflows**
- **Short-form and long-form narrative content** (mini-dramas, documentaries, explainers)
- **Branded cinematic sequences, trailers, and teasers**
- **Recurring-character social series**
- **Any multi-shot Venice workflow where continuity matters**

## What This Is

Most Venice integrations are thin wrappers around API calls. This harness is the higher-level layer:

- **Orchestration rules** in `CLAUDE.md`
- **Reusable playbooks** in `.claude/commands/`
- **Specialized agents** in `.claude/agents/`
- **Venice production skills** in `.claude/skills/`
- **TypeScript execution layer** in `src/`
- **Comprehensive model registry** covering 50+ Venice video, image, audio, and music models

## Supported Venice Models (March 2026)

### Video Models

| Family | Image-to-Video | Text-to-Video | Max Duration | Audio | Special Features |
|--------|---------------|---------------|-------------|-------|-----------------|
| **Kling V3** | Pro, Standard | Pro, Standard | 15s | Yes | `end_image_url` for frame targeting |
| **Kling O3** | Pro, Standard, Pro R2V, Standard R2V | Pro, Standard | 15s | Yes | R2V: `elements`, `reference_image_urls`, `scene_image_urls` |
| **Kling 2.6** | Pro | Pro | 10s | Yes | `end_image_url` |
| **Veo 3.1** | Fast, Full | Fast, Full | 8s | Yes | Up to 4K resolution |
| **Veo 3** | Fast, Full | Fast, Full | 8s | Yes | |
| **Sora 2** | Standard, Pro | Standard, Pro | 12s | Yes | Up to 1080p |
| **Wan 2.6** | Standard, Flash | Standard | 15s | Yes | 1080p, `audio_url` input |
| **LTX Video 2.0** | Fast, Full, v2.3, 19B | Fast, Full, v2.3, 19B | 20s | Yes | Up to 4K, longest durations |
| **Longcat** | Standard, Distilled | Standard, Distilled | **30s** | No | Longest single-shot duration |
| **Vidu Q3** | Yes | Yes | 16s | Yes | `reference_image_urls` |
| **PixVerse v5.6** | Standard, Transition | Standard | 8s | Yes | Transition: `end_image_url` |
| **Grok Imagine** | Yes | Yes | 15s | Yes | Wide aspect ratio support |
| **OVI** | Yes | — | 5s | Yes | |

### Image Models

`nano-banana-pro`, `nano-banana-2`, `flux-2-pro`, `flux-2-max`, `gpt-image-1-5`, `grok-imagine`, `hunyuan-image-v3`, `qwen-image-2`, `qwen-image-2-pro`, `recraft-v4`, `recraft-v4-pro`, `seedream-v4`, `seedream-v5-lite`, `chroma`, `hidream`, and more.

### Multi-Edit Models

`qwen-edit`, `qwen-image-2-edit`, `qwen-image-2-pro-edit`, `flux-2-max-edit`, `gpt-image-1-5-edit`, `grok-imagine-edit`, `nano-banana-2-edit`, `nano-banana-pro-edit`, `seedream-v4-edit`, `seedream-v5-lite-edit`

### Audio / Music Models

- **TTS**: `tts-kokoro` (50+ voices), `tts-qwen3-0-6b`, `tts-qwen3-1-7b` (style-prompted voices)
- **Music**: `elevenlabs-music`, `minimax-music-v2`, `ace-step-15`, `stable-audio-25`
- **SFX**: `elevenlabs-sound-effects-v2`, `mmaudio-v2-text-to-audio`
- **TTS (ElevenLabs)**: `elevenlabs-tts-v3`, `elevenlabs-tts-multilingual-v2`

## What Makes It Venice-Optimized

- Image prompts tuned for Venice image generation models
- Two-pass panel generation with Venice multi-edit refinement
- **Model-routing logic** for action, atmosphere, and character-consistency tiers
- Support for reference-aware video generation (`elements`, `reference_image_urls`, `scene_image_urls`)
- Environment-aware prompt adaptation (daytime vs night scenes)
- Venice-native audio generation paths for TTS, SFX, and music
- **Video quote endpoint** for cost estimation before generation
- Model-aware parameter building (auto-skips unsupported params per model)

## Project Structure

```
CLAUDE.md                    Agent orchestration hub
.claude/commands/            Workflow playbooks
.claude/agents/              Specialized agent roles
.claude/skills/              Venice and workflow knowledge
src/
  venice/                    Venice API client layer
    client.ts                HTTP transport, retries, rate limiting
    models.ts                Complete model registry (50+ models)
    video.ts                 Video queue/retrieve/quote/complete
    generate.ts              Image generation
    multi-edit.ts            Multi-image layered editing
    edit.ts                  Upscale, background remove (inpaint deprecated)
    audio.ts                 TTS, music, SFX, queued audio
    voices.ts                Voice catalog (Kokoro + Qwen3)
    types.ts                 Full API type definitions
  series/                    Project state and character management
  mini-drama/                Reference narrative video implementation
  storyboard/                Legacy screenplay storyboard pipeline
  characters/                Character extraction and references
  parsers/                   Fountain + PDF screenplay parsing
  assembly/                  Remotion scaffold and manifest
scripts/                     Utility scripts
templates/                   HTML templates
output/                      Generated projects (gitignored)
```

## Getting Started

### Requirements

- Node.js 20+
- `ffmpeg` and `ffprobe` on your PATH
- A `VENICE_API_KEY` (get one at [venice.ai](https://venice.ai))

### Setup

```bash
cp .env.example .env
# Add your VENICE_API_KEY to .env
npm install
npm run build
```

### In Agent Chat

Open the project in Cursor or VS Code. The agent reads `CLAUDE.md` and the playbooks to operate the harness.

Good first messages:

- "Set up this Venice video harness for first use"
- "Create a new character-consistent video series"
- "Generate a 30-second branded video sequence"
- "Build a multi-episode narrative with locked characters"
- "Create a product launch trailer with consistent visual style"

### Programmatic Usage

```typescript
import { VeniceClient } from './src/venice/client.js';
import { generateVideo, quoteVideo } from './src/venice/video.js';
import { listVideoModels, getVideoModel } from './src/venice/models.js';

const client = new VeniceClient();

// Get a cost estimate
const quote = await quoteVideo(client, {
  model: 'kling-v3-pro-image-to-video',
  duration: '8s',
  audio: true,
});
console.log(`Estimated cost: $${quote.quote}`);

// Generate a video
const result = await generateVideo(client, {
  model: 'kling-v3-pro-image-to-video',
  prompt: 'A slow dolly shot pushes forward...',
  duration: '8s',
  imageUrl: 'data:image/png;base64,...',
  audio: true,
  outputPath: 'output/shot-001.mp4',
});

// Query model capabilities
const longModels = listVideoModels({ minDurationSec: 20 });
const refModels = listVideoModels({ supportsElements: true });
```

## Video Model Routing

The harness defaults are opinionated because consistency is the point:

**R2V by default. Atmosphere model only for empty establishing shots.**

Almost all shots should use the R2V (reference-to-video) model for consistency. It supports `elements` and `reference_image_urls` for identity anchoring. Non-R2V models have zero reference support. The atmosphere model is only for truly empty establishing/mood shots with no characters.

| Role | Default Model | When Used |
|------|--------------|-----------|
| **Default (all non-establishing)** | `kling-o3-standard-reference-to-video` | All shots with characters or story action — `elements` + `reference_image_urls` |
| **Establishing / mood only** | `veo3.1-fast-image-to-video` | Empty establishing/mood shots — up to 4K |

These defaults are overridable per-project via `series.json` → `videoDefaults`.

## Reference Implementation

The `src/mini-drama/` directory contains a full working implementation for narrative mini-drama production. Use it directly or adapt the patterns for your own format:

- Series/character/episode management
- Script workshopping via LLM
- Two-pass storyboard generation (generate + multi-edit refine)
- Vision-based QA
- Video generation with frame chaining
- Audio post-production with layered ambient beds
- Subtitle burn-in and final assembly

## API Coverage

| Venice Endpoint | Status | Module |
|----------------|--------|--------|
| `POST /image/generate` | Full | `generate.ts` |
| `POST /image/multi-edit` | Full | `multi-edit.ts` |
| `POST /image/upscale` | Full | `edit.ts` |
| `POST /image/background-remove` | Full | `edit.ts` |
| `POST /video/queue` | Full | `video.ts` |
| `POST /video/retrieve` | Full | `video.ts` |
| `POST /video/quote` | Full | `video.ts` |
| `POST /video/complete` | Full | `video.ts` |
| `POST /audio/speech` | Full | `audio.ts` |
| `POST /audio/queue` | Full | `audio.ts` |
| `POST /audio/retrieve` | Full | `audio.ts` |
| `POST /audio/complete` | Full | `audio.ts` |
| `POST /chat/completions` | Partial | `client.ts` (vision) |
| `POST /images/edit` | Deprecated | `edit.ts` |

## License

MIT
