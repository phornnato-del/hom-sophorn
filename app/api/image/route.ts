import { withApiEncryption } from "@/lib/encrypted-api-handler";
import { ALLOWED_FOLDERS } from "@/lib/folders";
import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

async function getHandler(req: Request) {
  const pathname = new URL(req.url).searchParams.get("pathname");
  const folder = pathname?.split("/")[0];

  if (
    !pathname ||
    !folder ||
    !ALLOWED_FOLDERS.includes(folder) ||
    pathname.includes("..")
  ) {
    return NextResponse.json({ error: "Invalid pathname" }, { status: 400 });
  }

  try {
    const result = await get(pathname, { access: "private" });

    if (!result || result.statusCode !== 200) {
      return new NextResponse("Not found", { status: 404 });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error(err);
    return new NextResponse("Error", { status: 500 });
  }
}

export const GET = withApiEncryption(getHandler);
