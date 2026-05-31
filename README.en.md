🇬🇧 English · 🇺🇦 [Українська](README.md)

# J.A.R.V.I.S. — Autonomous Maker Assistant

![License](https://img.shields.io/github/license/cardmoney55-gif/jarvis-maker-assistant?color=blue)
![Stars](https://img.shields.io/github/stars/cardmoney55-gif/jarvis-maker-assistant?style=social)
![Issues](https://img.shields.io/github/issues/cardmoney55-gif/jarvis-maker-assistant)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
![Electron](https://img.shields.io/badge/Electron-2C2E3B?logo=electron&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Gemini](https://img.shields.io/badge/AI-Gemini-8E75B2)

A personal AI assistant in the style of Iron Man's J.A.R.V.I.S., built for
electronics assembly and soldering. It **talks** (Ukrainian), **sees** through a
camera, holds a **live voice conversation**, **searches the web on its own**,
**accumulates knowledge**, renders **3D holograms of components**, and runs
**skills**. It's a real **desktop app** (Electron), not a browser tab.

> The UI speaks Ukrainian by default; the architecture is language-agnostic and easy to localize.

---

## Features

| Capability | What it does |
|---|---|
| 🧠 Brain | Google **Gemini** (cloud) as the reasoning engine. Model is swappable via env. |
| 🔍 Own web search | JARVIS googles by itself (DuckDuckGo) and reads pages — **no Google quota, free** (`websearch.ts`). |
| 💾 Learning memory | Vector memory (RAG, `memory.ts`): recalls knowledge before answering and stores new facts. Survives restarts. |
| 📷 Vision | Recognizes components and pins from camera/photo; detected parts are **auto-added to the soldering schematic**. |
| 🔮 **3D holograms** | Rotatable holographic component models **with labeled pins** (Three.js). Say "show a diode" and the model appears — drag to rotate. |
| 🧩 Skills | Extensible capability system (Gemini function-calling, `skills.ts`): Ohm's law, LED resistor, resistor color code, 3D visualization, remembering facts. Add a new skill in one entry. |
| 🎙 Live mode | Always-on listening (no button) + end-of-speech detection (VAD) + **barge-in** (start talking and JARVIS stops to listen). Movie-style. |
| 🗣 Neural voice | **Piper** (local, free) or **XTTS** voice-clone; falls back to the system voice (`tts.ts`). |
| 🖥 Desktop | Native window (Electron), builds to an `.exe`. |

---

## Run (development)

**Requires:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file with a free Gemini key (https://aistudio.google.com/apikey):
   ```
   GEMINI_API_KEY="your_key"
   ```
3. Launch as a **desktop app**:
   ```bash
   npm run electron:dev
   ```
   (or as a dev web server: `npm run dev` → http://localhost:3000)

## Build the `.exe`

```bash
npm run dist:win
```
Output in `release/`:
- `JARVIS-Maker-Assistant-*-x64.exe` — installer
- `JARVIS-Maker-Assistant-*-portable.exe` — portable

Place a `.env` with `GEMINI_API_KEY` next to the installed `.exe` for AI features.

---

## Configuration (env)

| Variable | Purpose | Default |
|---|---|---|
| `GEMINI_API_KEY` | Gemini key (required) | — |
| `JARVIS_GEN_MODEL` | "Brain" model | `gemini-2.5-flash` |
| `JARVIS_EMBED_MODEL` | Memory embedding model | `gemini-embedding-001` |
| `JARVIS_MEMORY_PATH` | Memory file (can point to a Google Drive folder) | `./jarvis-memory.json` |
| `JARVIS_PIPER_PATH` / `JARVIS_PIPER_MODEL` | Piper neural voice (binary + .onnx voice) | — (otherwise system voice) |
| `JARVIS_TTS` / `JARVIS_XTTS_URL` | Voice-clone via an XTTS server | `piper` |
| `PORT` | Backend port | `3000` |

### Neural voice (Piper) — free

By default JARVIS uses the system voice. For a natural neural voice:
1. Download Piper and a voice (uk_UA or en_GB) from [piper releases](https://github.com/rhasspy/piper/releases) and [piper-voices](https://huggingface.co/rhasspy/piper-voices).
2. Set `JARVIS_PIPER_PATH` and `JARVIS_PIPER_MODEL` in `.env`.
3. Restart — JARVIS switches to the neural voice automatically.

For voice cloning, run an XTTS server and set `JARVIS_TTS=xtts` + `JARVIS_XTTS_URL`.

---

## Architecture

```
electron/main.cjs   launches the backend + opens the window
server.ts           Express API: chat, vision, part lookup, learning, TTS
memory.ts           vector memory (RAG) — self-learning
websearch.ts        own free web search (DuckDuckGo + reader)
skills.ts           skills system (function-calling)
tts.ts              neural voice (Piper / XTTS) with fallback
src/                React UI
  components/        core, camera, schematic, 3D hologram
  hooks/             live mode (VAD + barge-in)
```

> **About the "brain":** capable local models need a GPU, so the reasoning runs on cloud Gemini (easily swappable). Everything around it — the agent, memory, web search, vision, voice, holograms, skills — is built from scratch.

---

## 🗺 Roadmap

- [x] Brain (Gemini), own free web search, self-learning memory
- [x] Vision (camera) + auto-add parts to the schematic
- [x] 3D component holograms with labeled pins
- [x] Skills system (function-calling)
- [x] Live voice mode (VAD + barge-in) + Piper neural voice
- [ ] Wake word "Jarvis"
- [ ] Local Whisper — offline STT, no quota
- [ ] Step-by-step 3D soldering guides
- [ ] Board/GPIO control as skills
- [ ] English UI (i18n)

Got an idea? Open an [issue](https://github.com/cardmoney55-gif/jarvis-maker-assistant/issues) 💡

---

## 🤝 Contributing

The project is open — anyone can improve it. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, code structure, and how to add a new skill. Look for [`good first issue`](https://github.com/cardmoney55-gif/jarvis-maker-assistant/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) tasks.

## 📄 License

[Apache License 2.0](LICENSE) — free to use, modify, and distribute.
