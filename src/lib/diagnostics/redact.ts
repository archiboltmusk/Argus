export function redactSecrets(data: unknown): unknown {
  if (typeof data !== "object" || data === null) return data;
  if (Array.isArray(data)) return data.map(redactSecrets);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (/(token|key|secret|password|auth|credential|cookie)/i.test(key) && typeof value === "string") {
      out[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      out[key] = redactSecrets(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function exportRedactedDiagnostics(settings?: unknown): string {
  const sanitized = redactSecrets(settings ?? {});
  return JSON.stringify(sanitized, null, 2);
}
