import { NextRequest, NextResponse } from "next/server";
import { getStudyNoteCatalogResource, resolvePrintableStudyNote } from "@/lib/library/studyNotesStoreCatalog";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: NextRequest) {
  const secret = process.env.NOTES_PRODUCT_SYNC_SECRET;
  return Boolean(secret && request.headers.get("authorization") === \`Bearer \${secret}\`);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resourceId: string }> },
) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { resourceId } = await params;

  try {
    const resolvePrice = request.nextUrl.searchParams.get("resolvePrice") === "1";
    if (resolvePrice) {
      const result = await resolvePrintableStudyNote(resourceId);
      return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
    }

    const resource = await getStudyNoteCatalogResource(resourceId);
    if (!resource) return NextResponse.json({ error: "Study note not found." }, { status: 404 });
    return NextResponse.json(resource, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Study Notes resource endpoint failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load Study Note." },
      { status: 500 },
    );
  }
}
