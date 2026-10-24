"use client";

const ENCRYPTED_CONTENT_TYPE = "application/vnd.portfolio.encrypted+json";

type RequestPayload = {
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

type ResponseEnvelope = {
  iv: string;
  ciphertext: string;
};

let serverPublicKeyPromise: Promise<CryptoKey> | undefined;

function decodeBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeBase64(value: ArrayBuffer | Uint8Array) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function getServerPublicKey() {
  if (!serverPublicKeyPromise) {
    serverPublicKeyPromise = fetch("/api/crypto-key", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load the API encryption key.");
        }
        const result = (await response.json()) as { publicKey?: string };
        if (!result.publicKey) throw new Error("The API encryption key is unavailable.");
        const pem = result.publicKey.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
        return crypto.subtle.importKey(
          "spki",
          decodeBase64(pem),
          { name: "RSA-OAEP", hash: "SHA-256" },
          false,
          ["encrypt"],
        );
      })
      .catch((error: unknown) => {
        serverPublicKeyPromise = undefined;
        throw error;
      });
  }
  return serverPublicKeyPromise;
}

async function encryptPayload(key: CryptoKey, payload: RequestPayload) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const rawKey = await crypto.subtle.exportKey("raw", key);
  const publicKey = await getServerPublicKey();
  const wrappedKey = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, rawKey);

  return {
    key: encodeBase64(wrappedKey),
    iv: encodeBase64(iv),
    ciphertext: encodeBase64(ciphertext),
  };
}

export async function encryptedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const original = new Request(input, init);
  const method = original.method.toUpperCase();
  const transportUrl = new URL(original.url);
  const encryptedSearch = transportUrl.search;
  transportUrl.search = "";
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await original.arrayBuffer() : null;
  const aesKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const envelope = await encryptPayload(aesKey, {
    contentType: hasBody ? original.headers.get("content-type") : null,
    body: body ? encodeBase64(body) : null,
    search: encryptedSearch,
  });
  const requestHeaders = new Headers(original.headers);
  requestHeaders.set("content-type", ENCRYPTED_CONTENT_TYPE);
  requestHeaders.delete("content-length");
  const usesHeaderEnvelope = method === "GET" || method === "HEAD";
  if (usesHeaderEnvelope) {
    requestHeaders.set("x-portfolio-encrypted-request", JSON.stringify(envelope));
  }

  const response = await fetch(
    new Request(transportUrl, {
      method,
      headers: requestHeaders,
      body: usesHeaderEnvelope ? null : JSON.stringify(envelope),
      credentials: original.credentials,
      cache: "no-store",
      redirect: original.redirect,
      referrer: original.referrer,
      referrerPolicy: original.referrerPolicy,
      signal: original.signal,
    }),
  );

  if (response.headers.get("content-type") !== ENCRYPTED_CONTENT_TYPE) {
    return response;
  }

  const encrypted = (await response.json()) as ResponseEnvelope;
  const iv = decodeBase64(encrypted.iv);
  const ciphertext = decodeBase64(encrypted.ciphertext);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    ciphertext,
  );
  const payload = JSON.parse(new TextDecoder().decode(plaintext)) as ResponsePayload;
  const headers = new Headers(payload.headers);

  return new Response(decodeBase64(payload.body), {
    status: payload.status,
    statusText: payload.statusText,
    headers,
  });
}
