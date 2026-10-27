import assert from "node:assert/strict";
import test from "node:test";
import { redactDiagnosticsText } from "../src/lib/diagnostics/redact.ts";

test("diagnostics hide arbitrary URL credentials while preserving origins and failure context", () => {
  const result = redactDiagnosticsText(
    "HTTP 403 from https://user:short@media.example:8443/private/tiny?customCredential=key&token=abc\nretry in 2 seconds",
  );
  assert.equal(result, "HTTP 403 from https://media.example:8443/[REDACTED]\nretry in 2 seconds");
  assert.equal(redactDiagnosticsText(result), result);
});

test("diagnostics redact short bearer, header, and explicitly named secrets", () => {
  const input = 'Authorization: Bearer tiny\nCookie: session=short; other=value\nX-Api-Key: key\n{"password":"pw","pin":"1234","status":"error"}\napi_key=key token=short Bearer abc';
  const output = redactDiagnosticsText(input);
  for (const secret of ["tiny", "session=short", "other=value", "key\n", '"pw"', '"1234"', "=key", "=short", "Bearer abc"]) {
    assert.equal(output.includes(secret), false, secret);
  }
  assert.ok(output.includes('"status":"error"'));
  assert.equal(redactDiagnosticsText(output), output);
  assert.equal(redactDiagnosticsText('{"password":"private passphrase","pin":"12 34"}'), '{"password":"[REDACTED]","pin":"[REDACTED]"}');
});

test("stored credentials redact unlabelled long secrets without globally replacing short PINs", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const entries = new Map([
    ["argus.account", JSON.stringify({ auth: { token: "long-secret-value", pin: "1234" } })],
    ["argus.api_key", JSON.stringify("quoted-secret-value")],
  ]);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { length: entries.size, key: (i: number) => [...entries.keys()][i], getItem: (key: string) => entries.get(key) },
  });
  try {
    assert.equal(
      redactDiagnosticsText("request long-secret-value quoted-secret-value; position 1234 ms; pin=1234"),
      "request [REDACTED] [REDACTED]; position 1234 ms; pin=[REDACTED]",
    );
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("diagnostics preserve ordinary text when local storage is unavailable", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get: () => { throw new Error("blocked"); } });
  try {
    const input = "player started ok at position 42 seconds; HTTP 500; buffering 0.4s";
    assert.equal(redactDiagnosticsText(input), input);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("report boundaries redact captured and supplied diagnostics while preserving explicit contact", async () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalFetch = globalThis.fetch;
  const listeners = new Map<string, (event: unknown) => void>();
  const sent: FormData[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      innerWidth: 1280,
      innerHeight: 800,
      location: { pathname: "/player", hash: "#token=route-secret" },
      addEventListener: (name: string, handler: (event: unknown) => void) => listeners.set(name, handler),
    },
  });
  globalThis.fetch = async (_url, init) => {
    assert.ok(init?.body instanceof FormData);
    sent.push(init.body);
    return new Response(JSON.stringify({ id: "mock-report" }), { status: 200 });
  };
  try {
    const { getRecentErrors, installBugReportErrorCapture, submitBugReport, submitErrorReport } =
      await import("../src/lib/bug-report.ts");
    installBugReportErrorCapture();
    listeners.get("error")?.({
      message: "HTTP 403 https://media.example/watch?authKey=captured-secret",
      filename: "player.ts",
      lineno: 42,
    });
    listeners.get("unhandledrejection")?.({ reason: new Error("Bearer captured-bearer") });
    const captured = JSON.stringify(getRecentErrors());
    assert.ok(captured.includes("HTTP 403"));
    assert.equal(captured.includes("captured-secret"), false);
    assert.equal(captured.includes("captured-bearer"), false);

    const diag = {
      appVersion: "1.0.0", os: "macOS", osVersion: "test", ua: "test browser", viewport: "1280x800", locale: "en",
      flags: { playerEngine: "mpv", region: "US", hasTmdb: false, hasRpdb: false, hasTrakt: false, hasStremio: false, debridCount: 0, addonCount: 0, iptvCount: 0 },
      mpvProbe: { available: false, version: null, error: "HTTP 401 https://mpv.example/private?password=probe-secret" },
      recentErrors: [{ ts: 42, msg: "Bearer supplied-bearer", src: "https://source.example/?token=source-secret" }],
    };
    await submitBugReport({
      summary: "Playback failed", severity: "normal", steps: "Open a movie", expected: "Playback", actual: "HTTP 401",
      reporterName: "User", reporterGithub: "", reporterContact: "reporter@example.com", consentCredit: false, files: [],
    }, diag);
    assert.equal(sent[0].get("reporter_contact"), "reporter@example.com");
    const submitted = JSON.parse(String(sent[0].get("diagnostics")));
    const submittedText = JSON.stringify(submitted);
    for (const secret of ["probe-secret", "supplied-bearer", "source-secret"]) {
      assert.equal(submittedText.includes(secret), false, secret);
    }
    assert.equal(submitted.flags.playerEngine, "mpv");
    assert.ok(submitted.mpvProbe.error.includes("HTTP 401"));

    await submitErrorReport({
      code: "PLAYBACK_FAILED", title: "Playback failure", message: "HTTP 403 Bearer auto-secret",
      detail: "https://media.example/play?arbitraryCredential=auto-detail-secret",
    });
    const autoDiag = JSON.parse(String(sent[1].get("diagnostics")));
    const autoText = [sent[1].get("summary"), sent[1].get("actual"), JSON.stringify(autoDiag)].join("\n");
    for (const secret of ["auto-secret", "auto-detail-secret", "route-secret", "captured-secret", "captured-bearer"]) {
      assert.equal(autoText.includes(secret), false, secret);
    }
    assert.ok(autoText.includes("HTTP 403"));
    assert.equal(sent.length, 2, "all submissions use mocked fetch");
  } finally {
    globalThis.fetch = originalFetch;
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
