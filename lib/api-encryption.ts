import {
  constants,
  createPrivateKey,
  createPublicKey,
  createCipheriv,
  createDecipheriv,
  privateDecrypt,
  randomBytes,
} from "node:crypto";

const ENCRYPTED_CONTENT_TYPE = "application/vnd.portfolio.encrypted+json";
const PRIVATE_KEY_ENV = "API_ENCRYPTION_PRIVATE_KEY";

type RequestEnvelope = {
  key: string;
  iv: string;
  ciphertext: string;
};

type Payload = {
  contentType: string | null;
  body: string | null;
  search: string;
};

type ResponsePayload = {
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string;
};

function decodePrivateKey() {
  const value = process.env[PRIVATE_KEY_ENV];
  if (!value) throw new Error(`${PRIVATE_KEY_ENV} is not configured`);
  const normalized = value.includes("-----BEGIN")
    ? value.replace(/\\n/g, "\n")
    : Buffer.from(value, "base64").toString("utf8");
  let privateKey: ReturnType<typeof createPrivateKey>;
  try {
    privateKey = createPrivateKey(normalized);
  } catch (error: unknown) {
    throw new Error(`${PRIVATE_KEY_ENV} is not a valid PEM or base64-encoded PEM key`, {
      cause: error,
    });
  }
  if (
    privateKey.asymmetricKeyType !== "rsa" ||
    (privateKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048
  ) {
    throw new Error(`${PRIVATE_KEY_ENV} must contain an RSA key of at least 2048 bits`);
  }
  return privateKey;
}

export function getApiEncryptionPublicKey() {
  return createPublicKey(decodePrivateKey()).export({
    type: "spki",
    format: "pem",
  }).toString();
}

function decryptEnvelope(envelope: RequestEnvelope) {
  if (
    typeof envelope.key !== "string" ||
    typeof envelope.iv !== "string" ||
    typeof envelope.ciphertext !== "string"
  ) {
    throw new Error("Invalid encrypted request envelope");
  }

  const key = privateDecrypt(
    { key: decodePrivateKey(), padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
    Buffer.from(envelope.key, "base64"),
  );
  if (key.length !== 32) throw new Error("Invalid encrypted request key");

  const iv = Buffer.from(envelope.iv, "base64");
  if (iv.length !== 12) throw new Error("Invalid encrypted request nonce");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.from(envelope.ciphertext, "base64");
  if (ciphertext.length < 16) throw new Error("Invalid encrypted request body");
  decipher.setAuthTag(ciphertext.subarray(ciphertext.length - 16));
  const plaintext = Buffer.concat([
    decipher.update(ciphertext.subarray(0, ciphertext.length - 16)),
    decipher.final(),
  ]);

  return { key, payload: JSON.parse(plaintext.toString("utf8")) as Payload };
}

function encryptPayload(key: Buffer, payload: ResponsePayload) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return JSON.stringify({
    iv: iv.toString("base64"),
    ciphertext: encrypted.toString("base64"),
  });
}

function base64ToBytes(value: string | null) {
  return value ? Buffer.from(value, "base64") : null;
}

export async function decryptApiRequest(request: Request) {
  if (request.headers.get("content-type") !== ENCRYPTED_CONTENT_TYPE) {
    throw new Error("Encrypted API request required");
  }

  const method = request.method.toUpperCase();
  const envelopeValue =
    method === "GET" || method === "HEAD"
      ? request.headers.get("x-portfolio-encrypted-request")
      : await request.text();
  if (!envelopeValue) throw new Error("Encrypted API request envelope is missing");
  const envelope = JSON.parse(envelopeValue) as RequestEnvelope;
  const { key, payload } = decryptEnvelope(envelope);
  if (
    (payload.body !== null && typeof payload.body !== "string") ||
    (payload.contentType !== null && typeof payload.contentType !== "string") ||
    typeof payload.search !== "string" ||
    (payload.search && !payload.search.startsWith("?"))
  ) {
    throw new Error("Invalid encrypted request payload");
  }

  const headers = new Headers(request.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.delete("transfer-encoding");
  headers.delete("content-type");
  headers.delete("x-portfolio-encrypted-request");
  if (payload.contentType) headers.set("content-type", payload.contentType);

  const body = method === "GET" || method === "HEAD" ? null : base64ToBytes(payload.body);
  const requestUrl = new URL(request.url);
  requestUrl.search = payload.search;
  const decryptedRequest = new Request(requestUrl, {
    method,
    headers,
    body: body ? new Uint8Array(body) : null,
    signal: request.signal,
  });
  return { request: decryptedRequest, key };
}

export async function encryptApiResponse(response: Response, key: Buffer) {
  const body = Buffer.from(await response.arrayBuffer());
  const headers: [string, string][] = [];
  for (const name of ["content-type", "cache-control", "content-disposition"]) {
    const value = response.headers.get(name);
    if (value) headers.push([name, value]);
  }

  const encryptedResponse = new Response(
    encryptPayload(key, {
      status: response.status,
      statusText: response.statusText,
      headers,
      body: body.toString("base64"),
    }),
    {
      status: response.status >= 200 && response.status < 300 ? 200 : response.status,
      headers: {
        "content-type": ENCRYPTED_CONTENT_TYPE,
        "cache-control": "no-store",
      },
    },
  );
  const setCookies = response.headers.getSetCookie();
  for (const cookie of setCookies) encryptedResponse.headers.append("set-cookie", cookie);
  return encryptedResponse;
}

export async function encryptApiError(request: Request, status: number, message: string) {
  const { key } = await decryptApiRequest(request);
  const response = Response.json({ code: status, message, data: null }, { status });
  return encryptApiResponse(response, key);
}

export function withApiEncryption<
  TContext = { params: Promise<Record<string, string>> },
>(
  handler: (request: Request, context: TContext) => Promise<Response>,
) {
  return async (request: Request, context: TContext) => {
    let key: Buffer;
    let decryptedRequest: Request;
    try {
      const decrypted = await decryptApiRequest(request);
      key = decrypted.key;
      decryptedRequest = decrypted.request;
    } catch (error: unknown) {
      console.error("[api encryption] Request decryption failed:", error);
      if (
        error instanceof Error &&
        error.message.includes(PRIVATE_KEY_ENV)
      ) {
        return Response.json(
          { code: 503, message: "API encryption is not configured", data: null },
          { status: 503 },
        );
      }
      return Response.json(
        { code: 400, message: "Invalid encrypted API request", data: null },
        { status: 400 },
      );
    }

    try {
      return await encryptApiResponse(
        await handler(decryptedRequest, context),
        key,
      );
    } catch (error: unknown) {
      console.error("[api encryption] Handler failed:", error);
      return encryptApiResponse(
        Response.json(
          { code: 500, message: "Encrypted API request failed", data: null },
          { status: 500 },
        ),
        key,
      );
    }
  };
}

export { ENCRYPTED_CONTENT_TYPE };
