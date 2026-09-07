import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 20;

// Proxies a public chemical-structure database so the browser never talks to it (or sees its
// name) directly — every request/response here stays on our own domain, and headers/labels are
// deliberately generic (no vendor name) so nothing about the actual data source is user-visible.
const STRUCTURE_DB_BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';

type CidLookupResponse = {
  IdentifierList?: { CID?: number[] };
};

function cleanCandidate(value: string) {
  return value
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(tablet|capsule|injection|syrup|suspension|cream|ointment|drops|mg|mcg|g|ml)\b/gi, ' ')
    .replace(/[+/,_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCandidates(name: string, aliases: string[]) {
  const values = [name, ...aliases]
    .flatMap((item) => [item, item.split('/')[0], item.split('+')[0], item.split('(')[0]])
    .filter((item): item is string => Boolean(item))
    .map(cleanCandidate)
    .filter((item) => item.length > 2);

  return Array.from(new Set(values.map((item) => item.toLowerCase())))
    .map((lower) => values.find((item) => item.toLowerCase() === lower) || lower)
    .slice(0, 10);
}

async function resolveCid(candidate: string) {
  const url = `${STRUCTURE_DB_BASE}/compound/name/${encodeURIComponent(candidate)}/cids/JSON`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as CidLookupResponse;
  return json.IdentifierList?.CID?.[0] || null;
}

async function findCid(name: string, aliases: string[]) {
  const candidates = getCandidates(name, aliases);
  if (!candidates.length) return { cid: null, matchedName: '' };
  for (const candidate of candidates) {
    const cid = await resolveCid(candidate);
    if (cid) return { cid, matchedName: candidate };
  }
  return { cid: null, matchedName: '' };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name') || '';
  const view = searchParams.get('view') === '3d' ? '3d' : '2d';
  const format = searchParams.get('format') === 'sdf' ? 'sdf' : 'png';
  const aliases = (searchParams.get('aliases') || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);

  const { cid, matchedName } = await findCid(name, aliases);
  if (!cid) {
    return NextResponse.json({ status: 'error', error: 'Compound not found' }, { status: 404 });
  }

  // 3D coordinate data (SDF) for the interactive viewer — used only by the '3D structure' tab.
  if (format === 'sdf') {
    const sdfRes = await fetch(`${STRUCTURE_DB_BASE}/compound/cid/${cid}/record/SDF?record_type=3d`, {
      headers: { Accept: 'text/plain' },
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!sdfRes.ok) {
      return NextResponse.json({ status: 'error', error: '3D structure data not available' }, { status: 404 });
    }
    return new NextResponse(sdfRes.body, {
      status: 200,
      headers: {
        'Content-Type': 'chemical/x-mdl-sdfile',
        'Cache-Control': 'public, max-age=604800, s-maxage=2592000',
        'X-Compound-Id': String(cid),
        'X-Compound-Matched-Name': matchedName,
      },
    });
  }

  const imageUrl = `${STRUCTURE_DB_BASE}/compound/cid/${cid}/PNG?record_type=${view}`;
  const imageRes = await fetch(imageUrl, {
    headers: { Accept: 'image/png' },
    next: { revalidate: 60 * 60 * 24 * 30 },
  });

  if (!imageRes.ok && view === '3d') {
    const fallbackRes = await fetch(`${STRUCTURE_DB_BASE}/compound/cid/${cid}/PNG?record_type=2d`, {
      headers: { Accept: 'image/png' },
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (fallbackRes.ok) {
      return new NextResponse(fallbackRes.body, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=604800, s-maxage=2592000',
          'X-Compound-Id': String(cid),
          'X-Compound-Matched-Name': matchedName,
          'X-Compound-Fallback': '2d',
        },
      });
    }
  }

  if (!imageRes.ok) {
    return NextResponse.json({ status: 'error', error: 'Structure image not found' }, { status: imageRes.status });
  }

  return new NextResponse(imageRes.body, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=604800, s-maxage=2592000',
      'X-Compound-Id': String(cid),
      'X-Compound-Matched-Name': matchedName,
    },
  });
}
