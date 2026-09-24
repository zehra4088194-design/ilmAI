import 'server-only';

import { createArtifactKey, readAiArtifact, writeAiArtifact } from '@/lib/ai/artifact-cache';
import { buildRepresentativeTextContext } from '@/lib/resources/context-window';

const EMBEDDING_URL = process.env.EMBEDDING_URL || 'http://127.0.0.1:8081/v1';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'qwen3-embedding-0.6b-q8';
const CHUNK_SIZE = 1_200;
const CHUNK_OVERLAP = 180;

type EmbeddedChunk = { text: string; vector: number[] };

function chunkText(source: string) {
  const text = source.replace(/\r\n/g, '\n').trim();
  const chunks: string[] = [];
  for (let start = 0; start < text.length; start += CHUNK_SIZE - CHUNK_OVERLAP) {
    let end = Math.min(text.length, start + CHUNK_SIZE);
    if (end < text.length) {
      const boundary = Math.max(text.lastIndexOf('\n\n', end), text.lastIndexOf('. ', end));
      if (boundary > start + 500) end = boundary + 1;
    }
    const chunk = text.slice(start, end).trim();
    if (chunk.length >= 80) chunks.push(chunk);
    if (end >= text.length) break;
    start = Math.max(start, end - CHUNK_SIZE);
  }
  return chunks.slice(0, 100);
}

async function embed(input: string[]) {
  const response = await fetch(`${EMBEDDING_URL}/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) throw new Error(`Embedding service failed (${response.status}).`);
  const body = (await response.json()) as { data?: Array<{ index: number; embedding: number[] }> };
  const vectors = [...(body.data || [])].sort((a, b) => a.index - b.index).map((item) => item.embedding);
  if (vectors.length !== input.length) throw new Error('Embedding service returned an incomplete result.');
  return vectors;
}

function cosine(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    dot += (a[index] || 0) * (b[index] || 0);
    normA += (a[index] || 0) ** 2;
    normB += (b[index] || 0) ** 2;
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}

async function getEmbeddedChunks(resourceKey: string, source: string) {
  const cacheKey = createArtifactKey('embeddings', { resourceKey, source, model: EMBEDDING_MODEL });
  const cached = await readAiArtifact<EmbeddedChunk[]>(cacheKey, { hot: false });
  if (cached?.length) return cached;
  const chunks = chunkText(source);
  const embedded: EmbeddedChunk[] = [];
  for (let offset = 0; offset < chunks.length; offset += 8) {
    const batch = chunks.slice(offset, offset + 8);
    const vectors = await embed(batch);
    batch.forEach((text, index) => embedded.push({ text, vector: vectors[index] || [] }));
  }
  await writeAiArtifact(cacheKey, embedded, { hot: false });
  return embedded;
}

/** Uses local Qwen embeddings when available and safely falls back to the distributed TXT view. */
export async function buildHybridResourceContext(input: {
  resourceKey: string;
  source: string;
  query: string;
  maxCharacters?: number;
}) {
  const maxCharacters = input.maxCharacters || 12_000;
  try {
    const [queryVector] = await embed([input.query]);
    if (!queryVector) throw new Error('No query embedding returned.');
    const chunks = await getEmbeddedChunks(input.resourceKey, input.source);
    const selected = chunks
      .map((chunk) => ({ ...chunk, score: cosine(queryVector, chunk.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(3, Math.floor(maxCharacters / CHUNK_SIZE)))
      .sort((a, b) => input.source.indexOf(a.text) - input.source.indexOf(b.text))
      .map((chunk, index) => `[Semantic TXT section ${index + 1}]\n${chunk.text}`)
      .join('\n\n');
    return selected.slice(0, maxCharacters) || buildRepresentativeTextContext(input.source, maxCharacters);
  } catch (error) {
    console.warn('Local semantic retrieval unavailable; using representative TXT context:', error);
    return buildRepresentativeTextContext(input.source, maxCharacters);
  }
}
