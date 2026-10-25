export function getClientIp(request: Request) {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
