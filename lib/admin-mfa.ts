import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

function getEncryptionKey() {
  const secret = process.env.ADMIN_TOKEN_SECRET;
  if (!secret) throw new Error("Admin token signing secret is not configured");
  return scryptSync(secret, "portfolio-admin-mfa-v1", 32);
}

function toBase32(bytes: Buffer) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

function fromBase32(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let buffer = 0;
  const bytes: number[] = [];

  for (const character of value.toUpperCase().replace(/=+$/, "")) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Invalid authenticator secret");
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function generateMfaSecret() {
  return toBase32(randomBytes(20));
}

export function encryptMfaSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptMfaSecret(encryptedSecret: string) {
  const [iv, tag, ciphertext] = encryptedSecret.split(".");
  if (!iv || !tag || !ciphertext) throw new Error("Invalid encrypted authenticator secret");

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function createMfaOtpAuthUrl(secret: string, accountName: string) {
  const issuer = "Portfolio Admin";
  const label = `${issuer}:${accountName}`;
  const query = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${query.toString()}`;
}

function generateTotp(secret: string, counter: number) {
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", fromBase32(secret)).update(counterBytes).digest();
  const offset = digest[digest.length - 1] & 15;
  const binary =
    ((digest[offset] & 127) << 24) |
    ((digest[offset + 1] & 255) << 16) |
    ((digest[offset + 2] & 255) << 8) |
    (digest[offset + 3] & 255);
  return String(binary % 1_000_000).padStart(6, "0");
}

export function verifyMfaCode(secret: string, code: string, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return false;

  const currentCounter = Math.floor(now / 30_000);
  let isValid = false;
  for (const counter of [currentCounter - 1, currentCounter, currentCounter + 1]) {
    const expected = Buffer.from(generateTotp(secret, counter));
    const supplied = Buffer.from(code);
    const matches =
      expected.length === supplied.length && timingSafeEqual(expected, supplied);
    isValid = matches || isValid;
  }

  return isValid;
}
