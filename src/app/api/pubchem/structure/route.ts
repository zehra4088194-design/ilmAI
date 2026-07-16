import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 20;

type PubChemCidResponse = {
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
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(candidate)}/cids/JSON`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!res.ok) return null;
  const json = await res.json() as PubChemCidResponse;
  return json.IdentifierList?.CID?.[0] || null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name') || '';
  const view = searchParams.get('view') === '3d' ? '3d' : '2d';
  const aliases = (searchParams.get('aliases') || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);

  const candidates = getCandidates(name, aliases);
  if (!candidates.length) {
    return NextResponse.json({ status: 'error', error: 'Medicine name missing' }, { status: 400 });
  }

  let cid: number | null = null;
  let matchedName = '';
  for (const candidate of candidates) {
    cid = await resolveCid(candidate);
    if (cid) {
      matchedName = candidate;
      break;
    }
  }

  if (!cid) {
    return NextResponse.json({ status: 'error', error: 'PubChem compound not found' }, { status: 404 });
  }

  const imageUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?record_type=${view}`;
  const imageRes = await fetch(imageUrl, {
    headers: { Accept: 'image/png' },
    next: { revalidate: 60 * 60 * 24 * 30 },
  });

  if (!imageRes.ok && view === '3d') {
    const fallbackRes = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?record_type=2d`, {
      headers: { Accept: 'image/png' },
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (fallbackRes.ok) {
      return new NextResponse(fallbackRes.body, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=604800, s-maxage=2592000',
          'X-PubChem-CID': String(cid),
          'X-PubChem-Matched-Name': matchedName,
          'X-PubChem-Fallback': '2d',
        },
      });
    }
  }

  if (!imageRes.ok) {
    return NextResponse.json({ status: 'error', error: 'PubChem image not found' }, { status: imageRes.status });
  }

  return new NextResponse(imageRes.body, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=604800, s-maxage=2592000',
      'X-PubChem-CID': String(cid),
      'X-PubChem-Matched-Name': matchedName,
    },
  });
}
