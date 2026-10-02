import { NextRequest, NextResponse } from "next/server";
import { listStudyNoteCatalogResources } from "@/lib/library/studyNotesStoreCatalog";

export const runtime = "nodejs";
export const maxDuration = 30;

function authorized(request: NextRequest) {
  const secret = process.env.NOTES_PRODUCT_SYNC_SECRET;
  return Boolean(secret && request.headers.get("authorization") === \`Bearer \${secret}\`);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rawOffset = Number(request.nextUrl.searchParams.get("offset") || "0");
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") || "400");
  const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.floor(rawOffset)) : 0;
  const limit = Number.isFinite(rawLimit) ? Math.min(500, Math.max(1, Math.floor(rawLimit))) : 400;

  try {
    const result = await listStudyNoteCatalogResources(offset, limit);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Study Notes catalog endpoint failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load Study Notes catalog." },
      { status: 500 },
    );
  }
}
