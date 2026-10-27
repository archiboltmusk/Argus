const REDACTED = "[REDACTED]";
const STORED_CREDENTIAL_KEY = /token|authkey|api[_-]?key|secret|password|bearer|email/i;
const CREDENTIAL_FIELD = /\b(auth[_-]?key|api[_-]?key|access[_-]?token|refresh[_-]?token|session[_-]?token|client[_-]?secret|secret|token|password|passwd|pwd|pin)(["']?\s*[:=]\s*)(["']?)(\[REDACTED\]|[^"'\s,;&}\)\]]+)/gi;
const QUOTED_CREDENTIAL_FIELD = /\b(auth[_-]?key|api[_-]?key|access[_-]?token|refresh[_-]?token|session[_-]?token|client[_-]?secret|secret|token|password|passwd|pwd|pin)(["']?\s*[:=]\s*)(["'])((?:\\.|(?!\3).)*)\3/gi;

function storedSecrets(): string[] {
  const secrets = new Set<string>();
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    for (const [key, entry] of Object.entries(value)) {
      if (typeof entry === "string" && STORED_CREDENTIAL_KEY.test(key) && entry.length >= 8) {
        secrets.add(entry);
      } else if (entry && typeof entry === "object") {
        visit(entry);
      }
    }
  };
  try {
    const storage = globalThis.localStorage;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key) continue;
      const raw = storage.getItem(key);
      if (!raw) continue;
      try {
        const value: unknown = JSON.parse(raw);
        if (typeof value === "string" && STORED_CREDENTIAL_KEY.test(key) && value.length >= 8) {
          secrets.add(value);
        } else {
          visit(value);
        }
      } catch {
        if (STORED_CREDENTIAL_KEY.test(key) && raw.length >= 8) secrets.add(raw);
      }
    }
  } catch {
    // Diagnostic export must remain available when browser storage is blocked.
  }
  return [...secrets].sort((a, b) => b.length - a.length);
}

/** Keep diagnostic context while withholding credentials, including unknown URL tokens. */
export function redactDiagnosticsText(text: string): string {
  // Match the native logger's policy: paths may themselves be playback credentials.
  // Retain the origin for troubleshooting, without guessing which query keys are safe.
  let result = text.replace(/\b(?:https?|ftp|rtsp|rtmp|smb):\/\/[^\s"'<>]+/gi, (raw) => {
    try {
      const url = new URL(raw);
      return `${url.protocol}//${url.host}/${REDACTED}`;
    } catch {
      return REDACTED;
    }
  });
  result = result.replace(
    /\b(authorization|proxy-authorization|cookie|set-cookie|x-api-key|x-auth-token|api-key)\s*:\s*[^\r\n]*/gi,
    (_match, name: string) => `${name}: ${REDACTED}`,
  );
  result = result.replace(/\bBearer\s+[A-Za-z0-9._~+/=\-]+/gi, `Bearer ${REDACTED}`);
  result = result.replace(QUOTED_CREDENTIAL_FIELD, (_match, key: string, separator: string, quote: string) =>
    `${key}${separator}${quote}${REDACTED}${quote}`,
  );
  result = result.replace(CREDENTIAL_FIELD, (_match, key: string, separator: string, quote: string) =>
    `${key}${separator}${quote}${REDACTED}`,
  );
  for (const secret of storedSecrets()) result = result.split(secret).join(REDACTED);
  return result;
}
