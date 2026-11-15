// Node 24's experimental Web Locks can retain a lock after a rejected callback,
// hanging retry tests. Use the app's non-browser queue in Node; browser lock
// behavior remains testable with explicit mocks. Keep navigator for React DOM.
if (typeof navigator !== "undefined" && navigator.userAgent?.startsWith("Node.js/")) {
  Object.defineProperty(navigator, "locks", {
    value: undefined,
    configurable: true,
    writable: true,
  });
}

// Unit tests must supply explicit transport fixtures. An accidental provider
// request must never send real account data or turn an offline run into a live sync.
const fixtureFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (url.protocol === "data:" || url.protocol === "blob:") return fixtureFetch(input, init);
  throw new Error("Unmocked network request in unit test: provide a fetch fixture");
};
