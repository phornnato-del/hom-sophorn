import { connection, NextResponse } from "next/server";
import { getApiEncryptionPublicKey } from "@/lib/api-encryption";

export async function GET() {
  await connection();
  try {
    return NextResponse.json(
      { publicKey: getApiEncryptionPublicKey() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    console.error("[api encryption] Public key unavailable:", error);
    return NextResponse.json(
      { message: "API encryption is not configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
