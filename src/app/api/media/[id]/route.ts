import { NextResponse } from "next/server";

import { getReadyRepositories } from "@/lib/demo/auto-seed";
import { getMediaStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

const RANGE_PATTERN = /^bytes=(\d*)-(\d*)$/;

/**
 * Serves a locally stored media file by its database id.
 *
 * The id is looked up in the database and the storage key comes from the
 * record, so a caller can never name a path — only a row they are allowed to
 * see. Range requests are honoured so video scrubbing works.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;

  const repos = await getReadyRepositories();
  const media = await repos.media.findById(id);
  if (!media) {
    return NextResponse.json({ error: "לא נמצא קובץ מדיה." }, { status: 404 });
  }

  const storage = getMediaStorage();
  const stat = await storage.stat(media.storageKey);
  if (!stat) {
    return NextResponse.json(
      { error: "רשומת המדיה קיימת אך הקובץ עצמו חסר מהאחסון המקומי." },
      { status: 410 },
    );
  }

  let bytes: Buffer;
  try {
    bytes = await storage.read(media.storageKey);
  } catch {
    return NextResponse.json({ error: "קריאת הקובץ נכשלה." }, { status: 500 });
  }

  const total = bytes.byteLength;
  const rangeHeader = request.headers.get("range");
  const match = rangeHeader ? RANGE_PATTERN.exec(rangeHeader) : null;

  if (match) {
    const start = match[1] === "" ? Math.max(total - Number(match[2]), 0) : Number(match[1]);
    const end = match[1] === "" || match[2] === "" ? total - 1 : Math.min(Number(match[2]), total - 1);

    if (Number.isNaN(start) || start >= total || start > end) {
      return new NextResponse(null, {
        status: 416,
        headers: { "content-range": `bytes */${total}` },
      });
    }

    const slice = bytes.subarray(start, end + 1);
    return new NextResponse(new Uint8Array(slice), {
      status: 206,
      headers: {
        "content-type": media.mimeType,
        "content-length": String(slice.byteLength),
        "content-range": `bytes ${start}-${end}/${total}`,
        "accept-ranges": "bytes",
        "cache-control": "private, no-store",
      },
    });
  }

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "content-type": media.mimeType,
      "content-length": String(total),
      "accept-ranges": "bytes",
      "cache-control": "private, no-store",
    },
  });
}
