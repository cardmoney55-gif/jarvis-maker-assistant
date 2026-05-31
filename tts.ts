/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * JARVIS neural Text-to-Speech (free, self-hosted). Pluggable provider:
 *   - "piper"  : local Piper TTS binary (CPU, free, natural Ukrainian/English).
 *   - "xtts"   : an HTTP voice-cloning server (e.g. XTTS-v2) — set JARVIS_XTTS_URL.
 *
 * If nothing is configured, neuralTtsAvailable() is false and the frontend
 * gracefully falls back to the browser's built-in speech synthesis.
 *
 * Setup (on the real server):
 *   1) Download Piper + a voice (e.g. uk_UA or en_GB) from
 *      https://github.com/rhasspy/piper/releases  and  .../piper-voices
 *   2) Set env:
 *      JARVIS_PIPER_PATH=C:\piper\piper.exe
 *      JARVIS_PIPER_MODEL=C:\piper\voices\uk_UA-???.onnx
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

// Read env at CALL time (not module-load time) so it works regardless of when
// dotenv.config() runs relative to module imports.
function cfg() {
  return {
    engine: (process.env.JARVIS_TTS || "piper").toLowerCase(),
    piperPath: process.env.JARVIS_PIPER_PATH || "",
    piperModel: process.env.JARVIS_PIPER_MODEL || "",
    speaker: process.env.JARVIS_PIPER_SPEAKER || "", // multi-speaker voices: pick a voice
    lengthScale: process.env.JARVIS_PIPER_LENGTH || "", // >1 = slower, calmer
    xttsUrl: process.env.JARVIS_XTTS_URL || "",
  };
}

export function ttsEngine(): "piper" | "xtts" | "none" {
  const c = cfg();
  if (c.engine === "xtts" && c.xttsUrl) return "xtts";
  if (c.engine === "piper" && c.piperPath && c.piperModel && fs.existsSync(c.piperPath) && fs.existsSync(c.piperModel)) {
    return "piper";
  }
  return "none";
}

export function neuralTtsAvailable(): boolean {
  return ttsEngine() !== "none";
}

/** Synthesize speech → WAV/audio bytes. Throws if no engine is configured. */
export async function synthesize(text: string): Promise<{ audio: Buffer; mime: string }> {
  const engine = ttsEngine();
  const c = cfg();
  const clean = text.slice(0, 3000);

  if (engine === "piper") {
    // Write to a temp WAV FILE (not stdout) — on Windows, piping binary WAV
    // through stdout in text mode corrupts the audio (crackle/noise).
    const tmpFile = path.join(os.tmpdir(), `jarvis-tts-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`);
    const args = ["--model", c.piperModel, "--output_file", tmpFile];
    if (c.speaker !== "") args.push("--speaker", String(c.speaker));
    if (c.lengthScale !== "") args.push("--length_scale", String(c.lengthScale));

    return new Promise((resolve, reject) => {
      const proc = spawn(c.piperPath, args, {
        stdio: ["pipe", "ignore", "pipe"],
        cwd: path.dirname(c.piperPath),
      });
      let stderr = "";
      proc.stderr.on("data", (d) => (stderr += d.toString()));
      proc.on("error", reject);
      proc.on("close", (code) => {
        try {
          if (code === 0 && fs.existsSync(tmpFile)) {
            const audio = fs.readFileSync(tmpFile);
            fs.unlink(tmpFile, () => {});
            resolve({ audio, mime: "audio/wav" });
          } else {
            reject(new Error("piper_failed: " + stderr.slice(0, 200)));
          }
        } catch (e) {
          reject(e);
        }
      });
      proc.stdin.write(clean);
      proc.stdin.end();
    });
  }

  if (engine === "xtts") {
    // Generic HTTP voice-cloning server: POST {text} -> audio bytes.
    const r = await fetch(c.xttsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean }),
    });
    if (!r.ok) throw new Error("xtts_failed");
    const buf = Buffer.from(await r.arrayBuffer());
    return { audio: buf, mime: r.headers.get("content-type") || "audio/wav" };
  }

  throw new Error("tts_not_configured");
}
