/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * JARVIS long-term vector memory (the "self-learning" core).
 *
 * Knowledge JARVIS gathers from the internet is distilled into text chunks,
 * embedded into vectors via Gemini, and stored on disk. On every question we
 * retrieve the most relevant chunks (RAG) and feed them back to the model, so
 * the assistant genuinely accumulates and reuses experience across restarts.
 *
 * This is a file-based store with in-JS cosine similarity — deliberately
 * dependency-free so it runs on modest hardware (no native vector DB, no GPU).
 */

import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";

export interface KnowledgeChunk {
  id: string;
  topic: string;
  text: string;
  sources: string[];
  embedding: number[];
  createdAt: string;
  hits: number; // how many times this knowledge has been retrieved
}

const MEMORY_PATH =
  process.env.JARVIS_MEMORY_PATH || path.join(process.cwd(), "jarvis-memory.json");
const EMBED_MODEL = process.env.JARVIS_EMBED_MODEL || "gemini-embedding-001";

// In-memory cache of the on-disk store.
let cache: KnowledgeChunk[] | null = null;

function load(): KnowledgeChunk[] {
  if (cache) return cache;
  try {
    if (fs.existsSync(MEMORY_PATH)) {
      const raw = fs.readFileSync(MEMORY_PATH, "utf-8");
      cache = JSON.parse(raw) as KnowledgeChunk[];
    } else {
      cache = [];
    }
  } catch (e) {
    console.error("⚠️ Не вдалося прочитати пам'ять JARVIS:", e);
    cache = [];
  }
  return cache;
}

function persist() {
  try {
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(cache || [], null, 2), "utf-8");
  } catch (e) {
    console.error("⚠️ Не вдалося зберегти пам'ять JARVIS:", e);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Embed a piece of text into a vector using Gemini's embedding model.
 *  Retries on transient rate-limit (429) errors with a short backoff. */
export async function embed(ai: GoogleGenAI, text: string): Promise<number[]> {
  let lastErr: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await ai.models.embedContent({
        model: EMBED_MODEL,
        contents: text.slice(0, 8000), // keep within model input limits
      });
      const values = res.embeddings?.[0]?.values;
      if (!values || values.length === 0) {
        throw new Error("Порожній вектор embedding від моделі.");
      }
      return values;
    } catch (e: any) {
      lastErr = e;
      if (e?.status === 429 && attempt < 2) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export interface RetrievedKnowledge {
  chunk: KnowledgeChunk;
  score: number;
}

/** Retrieve the top-K most relevant pieces of learned knowledge for a query. */
export async function searchKnowledge(
  ai: GoogleGenAI,
  query: string,
  k = 4
): Promise<RetrievedKnowledge[]> {
  const mem = load();
  if (mem.length === 0) return [];

  const queryVec = await embed(ai, query);
  const scored = mem
    .map((chunk) => ({ chunk, score: cosineSimilarity(queryVec, chunk.embedding) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, k);

  // Count retrieval hits for the surfaced knowledge.
  for (const r of scored) {
    if (r.score > 0.5) r.chunk.hits = (r.chunk.hits || 0) + 1;
  }
  persist();
  return scored;
}

/**
 * Store a new piece of learned knowledge. Skips near-duplicates (cosine > 0.95)
 * by refreshing the existing entry instead, keeping memory clean.
 */
export async function addKnowledge(
  ai: GoogleGenAI,
  topic: string,
  text: string,
  sources: string[] = []
): Promise<{ chunk: KnowledgeChunk; isNew: boolean }> {
  const embedding = await embed(ai, `${topic}\n${text}`);
  const mem = load();

  // De-duplicate against existing knowledge.
  let best: { chunk: KnowledgeChunk; score: number } | null = null;
  for (const chunk of mem) {
    const score = cosineSimilarity(embedding, chunk.embedding);
    if (!best || score > best.score) best = { chunk, score };
  }

  if (best && best.score > 0.95) {
    // Refresh the existing knowledge rather than storing a duplicate.
    best.chunk.text = text.length > best.chunk.text.length ? text : best.chunk.text;
    best.chunk.sources = Array.from(new Set([...best.chunk.sources, ...sources]));
    best.chunk.createdAt = new Date().toISOString();
    persist();
    return { chunk: best.chunk, isNew: false };
  }

  const chunk: KnowledgeChunk = {
    id: `kn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    topic,
    text,
    sources,
    embedding,
    createdAt: new Date().toISOString(),
    hits: 0,
  };
  mem.unshift(chunk);
  persist();
  return { chunk, isNew: true };
}

/** Summary of what JARVIS currently knows — for the UI memory panel. */
export function stats() {
  const mem = load();
  return {
    count: mem.length,
    recent: mem.slice(0, 10).map((c) => ({
      id: c.id,
      topic: c.topic,
      createdAt: c.createdAt,
      sources: c.sources,
      hits: c.hits || 0,
      preview: c.text.slice(0, 160),
    })),
  };
}

export function memoryPath() {
  return MEMORY_PATH;
}

/** Wipe all learned knowledge (used by the "clear memory" control). */
export function clearAll(): number {
  const had = load().length;
  cache = [];
  persist();
  return had;
}
