import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { ALLOWED_FOLDERS } from "@/lib/folders";

const MAX_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string | null) || "uploads";

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (!ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only JPG, PNG, WEBP allowed" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 4MB)" }, { status: 400 });
    }

    const ext = file.type.split("/")[1];
    const blob = await put(`${folder}/${crypto.randomUUID()}.${ext}`, file, {
      access: "private",
    });

    return NextResponse.json({
      pathname: blob.pathname, // save this in your DB
      url: `/api/image?pathname=${encodeURIComponent(blob.pathname)}`, // use to display
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}