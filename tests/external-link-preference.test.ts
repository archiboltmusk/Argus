import assert from "node:assert/strict";
import test from "node:test";
import {
  readExternalLinkDestinationPreference,
  resolveExternalLinkActionLayout,
  writeExternalLinkDestinationPreference,
  type ExternalLinkPreferenceStorage,
} from "../src/lib/social/external-link-preference.ts";

function memoryStorage(initial: string | null = null): ExternalLinkPreferenceStorage {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
  };
}

test("defaults invalid or unavailable storage to browser", () => {
  assert.equal(readExternalLinkDestinationPreference(null), "browser");
  assert.equal(readExternalLinkDestinationPreference(memoryStorage("unknown")), "browser");
  assert.equal(
    readExternalLinkDestinationPreference({
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {},
    }),
    "browser",
  );
});

test("round-trips browser and Argus without throwing on write failure", () => {
  for (const preference of ["browser", "argus"] as const) {
    const storage = memoryStorage();
    writeExternalLinkDestinationPreference(preference, storage);
    assert.equal(readExternalLinkDestinationPreference(storage), preference);
  }
  assert.doesNotThrow(() =>
    writeExternalLinkDestinationPreference("argus", {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    }),
  );
});

test("resolves one direct action and one eligible alternate", () => {
  assert.deepEqual(resolveExternalLinkActionLayout("browser", true), {
    main: "browser",
    alternate: "argus",
  });
  assert.deepEqual(resolveExternalLinkActionLayout("argus", true), {
    main: "argus",
    alternate: "browser",
  });
  assert.deepEqual(resolveExternalLinkActionLayout("argus", false), {
    main: "browser",
    alternate: null,
  });
});

test("HTTP fallback does not overwrite a stored Argus preference", () => {
  const storage = memoryStorage("argus");
  const preference = readExternalLinkDestinationPreference(storage);
  assert.deepEqual(resolveExternalLinkActionLayout(preference, false), {
    main: "browser",
    alternate: null,
  });
  assert.equal(readExternalLinkDestinationPreference(storage), "argus");
});

test("alternate selections become the next main action in both directions", () => {
  const storage = memoryStorage();
  assert.deepEqual(
    resolveExternalLinkActionLayout(readExternalLinkDestinationPreference(storage), true),
    {
      main: "browser",
      alternate: "argus",
    },
  );
  writeExternalLinkDestinationPreference("argus", storage);
  assert.deepEqual(
    resolveExternalLinkActionLayout(readExternalLinkDestinationPreference(storage), true),
    {
      main: "argus",
      alternate: "browser",
    },
  );
  writeExternalLinkDestinationPreference("browser", storage);
  assert.deepEqual(
    resolveExternalLinkActionLayout(readExternalLinkDestinationPreference(storage), true),
    {
      main: "browser",
      alternate: "argus",
    },
  );
});
