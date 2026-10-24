import { startTopLoading } from "@/lib/top-loading";
import { encryptedFetch } from "@/lib/encrypted-fetch";

export async function uploadImage(file: File, folder: string) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);

  const finishLoading = startTopLoading();
  try {
    const res = await encryptedFetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data as { pathname: string; url: string };
  } finally {
    finishLoading();
  }
}