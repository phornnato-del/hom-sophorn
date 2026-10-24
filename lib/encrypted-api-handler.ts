import { connection } from "next/server";
import { withApiEncryption as wrapWithApiEncryption } from "@/lib/api-encryption";

export function withApiEncryption<
  TContext = { params: Promise<Record<string, string>> },
>(
  handler: (request: Request, context: TContext) => Promise<Response>,
) {
  const encryptedHandler = wrapWithApiEncryption(handler);
  return async (request: Request, context: TContext) => {
    await connection();
    return encryptedHandler(request, context);
  };
}
